// supabase/functions/check-budgets/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2?dts";


// Importa desde la carpeta compartida (la ruta es relativa a este archivo index.ts)
import { corsHeaders } from '../shared/cors.ts'

console.log(`Function check-budgets starting...`)

interface Budget {
  id: string; // ID del presupuesto
  user_id: string;
  category_id: string;
  amount: number; // Monto presupuestado
  // Podríamos necesitar category name para el mensaje
  categories: { name: string } | null; // Incluir nombre de categoría
}

interface TransactionSum {
  user_id: string;
  category_id: string;
  total_spent: number;
}
interface Transaction {
    user_id: string;
    category_id: string;
    amount: number;
  }

interface Profile {
  id: string;
  notify_budget_alert?: boolean;
}

 interface NotificationPayload {
  user_id: string;
  type: string;
  message: string;
  is_read: boolean;
  related_entity_type: string;
  related_entity_id: string; // ID del presupuesto excedido
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(value);
  }
  


Deno.serve(async (_req) => {
  try {
    // Crear cliente Admin
    const serviceRoleKey = Deno.env.get('CUSTOM_SERVICE_ROLE_KEY')
    if (!serviceRoleKey) throw new Error('Falta la CUSTOM_SERVICE_ROLE_KEY.')
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    console.log("Admin client created.")

    // Determinar periodo actual (mes actual)
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed
    const firstDayOfMonth = new Date(year, month, 1).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(year, month + 1, 0).toISOString().split('T')[0]; // Día 0 del mes siguiente

    console.log(`Checking budgets for period: ${firstDayOfMonth} to ${lastDayOfMonth}`);

    // 1. Obtener TODOS los presupuestos 'mensual' activos para este mes
    //    Incluimos el nombre de la categoría para el mensaje
    const { data: budgets, error: budgetsError }: { data: Budget[] | null, error: Error | null } = await supabaseAdmin
      .from('budgets')
      .select(`
          id,
          user_id,
          category_id,
          amount,
          categories ( name )
        `)
      .eq('period', 'mensual') // Asumimos que solo notificamos sobre mensuales
      .eq('start_date', firstDayOfMonth); // Asume que start_date es el día 1 del mes

    if (budgetsError) throw new Error(`Error fetching budgets: ${budgetsError.message}`);
    if (!budgets || budgets.length === 0) {
      console.log("No active monthly budgets found for this period.");
      return new Response(JSON.stringify({ message: 'No budgets found.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }
    console.log(`Found ${budgets.length} budgets to check.`);

    // 2. Obtener la SUMA de gastos por usuario y categoría para este mes
    //    Usamos una llamada RPC a una función de base de datos si la tuviéramos (más eficiente)
    //    o hacemos la agregación aquí (menos eficiente si hay muchas transacciones).
    //    Haremos la agregación aquí por simplicidad inicial.

    const { data: transactions, error: transactionsError } = await supabaseAdmin
        .from('transactions')
        .select('user_id, category_id, amount')
        .eq('type', 'gasto')
        .gte('transaction_date', firstDayOfMonth)
        .lte('transaction_date', lastDayOfMonth)
        .is('category_id', 'not.null'); // Solo gastos categorizados

    if (transactionsError) throw new Error(`Error fetching transactions: ${transactionsError.message}`);

    // Agrupar gastos
    const spendingByUserCategory = new Map<string, Map<string, number>>(); // Map<userId, Map<categoryId, totalSpent>>
    (transactions as Transaction[]).forEach((tx) => {
        const spent = Math.abs(tx.amount || 0);
        if (!spendingByUserCategory.has(tx.user_id)) {
          spendingByUserCategory.set(tx.user_id, new Map());
        }
        const userMap = spendingByUserCategory.get(tx.user_id)!;
        userMap.set(tx.category_id, (userMap.get(tx.category_id) || 0) + spent);
      });
    console.log("Spending calculated.");


    // 3. Obtener preferencias de los usuarios con pesupuestos
    const userIds = [...new Set((budgets as Budget[]).map((b: Budget) => b.user_id))];
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, notify_budget_alert')
      .in('id', userIds);

    if (profilesError) throw new Error(`Error fetching profiles: ${profilesError.message}`);
    const userPreferences = new Map((profiles as Profile[]).map((p: Profile) => [p.id, p.notify_budget_alert ?? true]));
    console.log("User preferences obtained.");

    // 4. Comparar y preparar notificaciones
    const notificationsToInsert: NotificationPayload[] = [];
    const notifiedBudgets = new Set<string>(); // Para evitar notificar lo mismo dos veces en una ejecución

    for (const budget of budgets as Budget[]) {
      const userPref = userPreferences.get(budget.user_id);
      if (userPref !== true) { // Si el usuario NO quiere esta notificación
        // console.log(`Skipping budget ${budget.id} for user ${budget.user_id} (pref off)`);
        continue;
      }

      const totalSpent = spendingByUserCategory.get(budget.user_id)?.get(budget.category_id) || 0;
      const budgetAmount = budget.amount || 0;

      if (totalSpent > budgetAmount) {
         // Presupuesto excedido, ¿ya hemos notificado sobre ESTE presupuesto en esta ejecución?
         if (!notifiedBudgets.has(budget.id)) {
            const categoryName = budget.categories?.name || 'una categoría';
            const message = `¡Ojo! Has superado (${formatCurrency(totalSpent)}) el presupuesto de <span class="math-inline">${categoryName}</span> (${formatCurrency(budgetAmount)}) este mes.`;
            

             // TODO Opcional Avanzado: Comprobar en tabla 'notifications' si ya se envió una alerta
             // para ESTE MISMO presupuesto (related_entity_id) en ESTE MISMO PERIODO (ej. último día)
             // para evitar spam si la función corre muy seguido o hay errores.

             notificationsToInsert.push({
               user_id: budget.user_id,
               type: 'presupuesto_excedido',
               message: message,
               is_read: false,
               related_entity_type: 'budgets', // Vinculado a la tabla budgets
               related_entity_id: budget.id,   // Con el ID del presupuesto específico
             });
             notifiedBudgets.add(budget.id); // Marcar como notificado en esta tanda
             console.log(`Notification prepared for budget ${budget.id} (User: ${budget.user_id})`);

         }
      }
    }

    // 5. Insertar notificaciones
    if (notificationsToInsert.length > 0) {
      console.log(`Inserting ${notificationsToInsert.length} budget alert notifications...`);
      const { error: insertError } = await supabaseAdmin
        .from('notifications')
        .insert(notificationsToInsert);

      if (insertError) throw insertError;
       console.log("Budget alert notifications inserted successfully.");
    } else {
       console.log("No budget alerts needed.");
    }

    return new Response(JSON.stringify({ message: `Checked ${budgets.length} budgets, inserted ${notificationsToInsert.length} alerts.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });

  } catch (error) {
    console.error('Error in check-budgets function:', error);
    const message = error instanceof Error ? error.message : 'Error interno.';
    return new Response(JSON.stringify({ error: message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
})