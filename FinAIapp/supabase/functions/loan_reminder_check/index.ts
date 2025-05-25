// supabase/functions/delete-user-account/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2?dts";
// Importa desde la carpeta compartida (la ruta es relativa a este archivo index.ts)
import { corsHeaders } from '../shared/cors.ts'

console.log(`Function loan_reminder_check starting at ${new Date().toISOString()}`);

// --- FIX 1a: Interfaz definida FUERA del handler ---
interface Loan {
  id: string;
  user_id: string;
  debtor: string | null;
  description: string | null;
}

// --- FIX 2a: Función auxiliar para obtener mensajes de error de forma segura ---
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  console.error("Caught non-standard error:", error); // Loguea errores no estándar
  return 'An unexpected error occurred';
}


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('CUSTOM_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );
    console.log('Supabase admin client initialized.');

    const today = new Date();
    const tomorrow = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1));
    const tomorrowDateString = tomorrow.toISOString().split('T')[0];

    console.log(`Checking for loans due on: ${tomorrowDateString}`);

    // Aseguramos el tipo esperado con <Loan[]>
    const { data: loansToRemind, error: fetchError } = await supabaseAdmin
      .from('loans')
      .select<Loan[]>('id, user_id, debtor, description')
      .eq('reminder_enabled', true)
      .neq('status', 'cobrado')
      .eq('due_date', tomorrowDateString);

    if (fetchError) {
      console.error('Error fetching loans:', fetchError);
      throw new Error(`Error fetching loans: ${fetchError.message}`);
    }

    const count = loansToRemind?.length || 0;
    console.log(`Found ${count} loans to remind.`);

    if (!loansToRemind || count === 0) {
      return new Response(JSON.stringify({ message: 'No reminders to send today.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // --- FIX 1b: Añadir tipo explícito ": Loan" al parámetro 'loan' ---
    const notificationsToInsert = loansToRemind.map((loan: Loan) => {
      const loanDescription = loan.description ? ` (${loan.description})` : '';
      const debtorName = loan.debtor || 'N/A';
      return {
        user_id: loan.user_id,
        message: `Recordatorio: El préstamo a ${debtorName}${loanDescription} vence mañana (${tomorrowDateString}).`,
        type: 'loan_reminder', // Tipo que definiste en tu tabla
        is_read: false,
        related_entity_type: 'loan', // Tipo de entidad relacionada
        related_entity_id: loan.id,  // ID de la entidad relacionada
      };
    });

    console.log(`Attempting to insert ${notificationsToInsert.length} notifications.`);

    const { error: insertError } = await supabaseAdmin
      .from('notifications')
      .insert(notificationsToInsert);

    if (insertError) {
      console.error('Error inserting notifications:', insertError);
      // Usar la función auxiliar para obtener el mensaje
      throw new Error(`Error inserting notifications: ${getErrorMessage(insertError)}`);
    }

    console.log(`${notificationsToInsert.length} notifications inserted successfully.`);

    return new Response(JSON.stringify({ success: true, message: `Successfully processed ${count} reminders.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    // --- FIX 2b: Usar la función auxiliar para obtener el mensaje de forma segura ---
    const errorMessage = getErrorMessage(error);
    console.error('Error in loan-reminder-check function:', errorMessage);
    // Considera loguear el 'error' original si necesitas más detalles en producción
    // console.error('Original error object:', error); 

    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});