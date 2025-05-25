import { createClient } from "https://esm.sh/@supabase/supabase-js@2?dts";
// Importa desde la carpeta compartida (la ruta es relativa a este archivo index.ts)
import { corsHeaders } from '../shared/cors.ts';

console.log(`Function debt-reminder-check starting at ${new Date().toISOString()}`);

// Interfaz para los datos de la deuda que necesitamos
interface Debt {
  id: string;
  user_id: string;
  creditor: string | null;
  description: string | null;
  due_date: string; // Aseguramos que es un string para comparación
}

// Función auxiliar para manejar errores (puedes moverla a _shared si la usas en varias funciones)
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) { return error.message; }
  if (typeof error === 'string') { return error; }
  console.error("Caught non-standard error:", error);
  return 'An unexpected error occurred';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Cliente Admin con Service Role Key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );
    console.log('Supabase admin client initialized.');

    // Calcular fecha de mañana (YYYY-MM-DD en UTC)
    const today = new Date();
    const tomorrow = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1));
    const tomorrowDateString = tomorrow.toISOString().split('T')[0]; 

    console.log(`Checking for debts due on: ${tomorrowDateString}`);

    // Buscar deudas que cumplen criterios
    const { data: debtsToRemind, error: fetchError } = await supabaseAdmin
      .from('debts') // <-- Cambiado a tabla 'debts'
      .select<Debt[]>('id, user_id, creditor, description, due_date') // Seleccionar datos necesarios
      .eq('reminder_enabled', true)   // Recordatorios activados (columna que añadiste)
      .neq('status', 'pagada')       // Que no estén ya pagadas
      .eq('due_date', tomorrowDateString); // Que venzan mañana

    if (fetchError) {
      console.error('Error fetching debts:', fetchError);
      throw new Error(`Error fetching debts: ${fetchError.message}`);
    }

    const count = debtsToRemind?.length || 0;
    console.log(`Found ${count} debts to remind.`);

    if (!debtsToRemind || count === 0) {
      return new Response(JSON.stringify({ message: 'No debt reminders to send today.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Preparar las notificaciones a insertar
    const notificationsToInsert = debtsToRemind.map((debt: Debt) => {
      const debtDescription = debt.description ? ` (${debt.description})` : '';
      const creditorName = debt.creditor || 'N/A';
      return {
        user_id: debt.user_id,
        message: `Recordatorio: El pago de la deuda a ${creditorName}${debtDescription} vence mañana (${debt.due_date}).`, // Usa debt.due_date
        type: 'debt_reminder', // Nuevo tipo específico para recordatorios de deuda
        is_read: false,
        related_entity_type: 'debt', // Indica que se relaciona con una deuda
        related_entity_id: debt.id,  // El ID de la deuda
      };
    });

    console.log(`Attempting to insert ${notificationsToInsert.length} debt notifications.`);

    // Insertar las notificaciones
    const { error: insertError } = await supabaseAdmin
      .from('notifications')
      .insert(notificationsToInsert);

    if (insertError) {
      console.error('Error inserting debt notifications:', insertError);
      throw new Error(`Error inserting debt notifications: ${getErrorMessage(insertError)}`);
    }

    console.log(`${notificationsToInsert.length} debt notifications inserted successfully.`);

    // Responder con éxito
    return new Response(JSON.stringify({ success: true, message: `Successfully processed ${count} debt reminders.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = getErrorMessage(error);
    console.error('Error in debt-reminder-check function:', errorMessage);
    console.error('Original error object:', error); 
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});