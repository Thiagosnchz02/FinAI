// supabase/functions/notify-upcoming-fixed-expenses/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2?dts";


// Importa desde la carpeta compartida (la ruta es relativa a este archivo index.ts)
import { corsHeaders } from '../shared/cors.ts'// Asegúrate que la ruta a cors.ts es correcta

console.log(`Function notify-upcoming-fixed-expenses starting...`)

// Configuración: ¿Con cuántos días de antelación notificar?
const NOTIFICATION_LEAD_DAYS = 3
interface Expense {
  id: string;
  user_id: string;
  description: string;
  next_due_date: string;
}

interface Profile {
  id: string;
  notify_fixed_expense?: boolean;
}

interface NotificationPayload {
  user_id: string;
  type: string;
  message: string;
  is_read: boolean;
  related_entity_type: string;
  related_entity_id: string;
}
// Función principal que se ejecuta (en este caso, por el scheduler)
Deno.serve(async (_req) => { // El request (_) no se usa en funciones programadas normalmente
  try {
    // NECESITAMOS permisos de admin para leer datos de todos los usuarios
    // Asegúrate de tener CUSTOM_SERVICE_ROLE_KEY configurado como secret
    const serviceRoleKey = Deno.env.get('CUSTOM_SERVICE_ROLE_KEY')
    if (!serviceRoleKey) throw new Error('Falta la CUSTOM_SERVICE_ROLE_KEY.')

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey,
      // Opciones para cliente Admin (opcional pero recomendado)
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    console.log("Admin client created.")

    // Calcular fechas límite
    const today = new Date();
    const thresholdDate = new Date(today);
    thresholdDate.setDate(today.getDate() + NOTIFICATION_LEAD_DAYS);
    today.setHours(0, 0, 0, 0); // Ignorar hora para comparar solo fechas
    thresholdDate.setHours(23, 59, 59, 999); // Incluir todo el día límite

    const todayISO = today.toISOString().split('T')[0];
    const thresholdISO = thresholdDate.toISOString().split('T')[0];

    console.log(`Checking for fixed expenses due between ${todayISO} and ${thresholdISO}`);

    // 1. Obtener todos los gastos fijos activos que vencen pronto
    const { data: expenses, error: expensesError } = await supabaseAdmin
      .from<Expense>('scheduled_fixed_expenses')
      .select('id, user_id, description, next_due_date')
      .eq('is_active', true)
      .gte('next_due_date', todayISO)
      .lte('next_due_date', thresholdISO)

    if (expensesError) throw expensesError;
    if (!expenses || expenses.length === 0) {
      console.log("No upcoming fixed expenses found for notification.");
      return new Response(JSON.stringify({ message: 'No upcoming expenses.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      });
    }

    console.log(`Found ${expenses.length} potential expenses to notify.`);

    // 2. Obtener preferencias de notificación de los usuarios afectados
    const userIds = [...new Set(expenses.map((e: Expense) => e.user_id))]; // Lista única de IDs de usuario
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from<Profile>('profiles')
      .select('id, notify_fixed_expense') // Solo necesitamos esta preferencia
      .in('id', userIds) // Busca solo los perfiles de usuarios con gastos próximos

    if (profilesError) throw profilesError;

    // Crear un mapa para buscar fácilmente la preferencia de un usuario
    const userPreferences = new Map(
      (profiles as Profile[]).map((p: Profile) => [p.id, p.notify_fixed_expense ?? true])
    ); // Default true
    console.log("User preferences obtained:", userPreferences);

    // 3. Crear notificaciones si la preferencia está activa
    const notificationsToInsert: NotificationPayload[] = [];
 // Tipado explícito o implícito
    for (const expense of expenses) {
      const userPref = userPreferences.get(expense.user_id);
      if (userPref === true) { // Si el usuario quiere esta notificación
         const formattedDueDate = new Date(expense.next_due_date + 'T00:00:00Z').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }); // Asegurar formato local
        const message = `Recordatorio: Pagar '${expense.description}' el ${formattedDueDate}.`;

        // Opcional: Comprobar si ya existe una notificación similar reciente para no duplicar
        // (requeriría otra consulta a 'notifications')

        notificationsToInsert.push({
          user_id: expense.user_id,
          type: 'recordatorio_gasto_fijo',
          message: message,
          is_read: false,
          related_entity_type: 'scheduled_fixed_expenses',
          related_entity_id: expense.id,
          // created_at se pone por defecto
        });
      } else {
         console.log(`Skipping notification for user ${expense.user_id} (preference off) for expense ${expense.id}`);
      }
    }

    // 4. Insertar las notificaciones en bloque
    if (notificationsToInsert.length > 0) {
      console.log(`Inserting ${notificationsToInsert.length} notifications...`);
      const { error: insertError } = await supabaseAdmin
        .from('notifications')
        .insert(notificationsToInsert);

      if (insertError) throw insertError;
       console.log("Notifications inserted successfully.");
    } else {
       console.log("No notifications needed to be inserted.");
    }

    return new Response(JSON.stringify({ message: `Processed ${expenses.length} expenses, inserted ${notificationsToInsert.length} notifications.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });

  } catch (error) {
    console.error('Error in notify-upcoming-fixed-expenses function:', error);
  
    const message = error instanceof Error ? error.message : 'Error interno.';
    
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})