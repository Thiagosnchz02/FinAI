// supabase/functions/process-fixed-expenses/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2?dts";


// Importa desde la carpeta compartida (la ruta es relativa a este archivo index.ts)
import { corsHeaders } from '../shared/cors.ts'// Asegúrate que la ruta a cors.ts es correcta

console.log("Edge Function 'process-fixed-expenses' starting...");

// --- Función para Calcular Siguiente Fecha (Adaptada de tu JS) ---
function calculateNextDueDate(currentDueDateStr: string, frequency: string, dayOfMonth?: number | null): Date | null {
    const currentDueDate = new Date(currentDueDateStr + 'T00:00:00Z'); // Interpretar como UTC o ajustar según tu DB/lógica
    if (isNaN(currentDueDate.getTime())) {
        console.error("calculateNextDueDate: Invalid currentDueDate provided", currentDueDateStr);
        return null;
    }

    let nextDate = new Date(currentDueDate.getTime()); // Clonar

    // Asegurarse que trabajamos en UTC para evitar problemas de zona horaria en cálculos de fecha/mes/año
    nextDate.setUTCHours(0, 0, 0, 0);

    console.log(`Calculating next date for: current=<span class="math-inline">\{currentDueDateStr\}, freq\=</span>{frequency}, day=${dayOfMonth}`);


    switch (frequency) {
        case 'mensual':
            if (dayOfMonth && dayOfMonth >= 1 && dayOfMonth <= 31) {
                const currentMonth = nextDate.getUTCMonth();
                let targetMonth = currentMonth + 1;
                let targetYear = nextDate.getUTCFullYear();

                if (targetMonth > 11) {
                    targetMonth = 0; // Enero
                    targetYear++;
                }

                // Calcular último día del mes objetivo EN UTC
                const lastDayOfMonthTarget = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
                const targetDay = Math.min(dayOfMonth, lastDayOfMonthTarget);

                nextDate = new Date(Date.UTC(targetYear, targetMonth, targetDay));

            } else {
                console.warn("Calculating next monthly date without day_of_month for:", currentDueDateStr);
                // Añadir un mes UTC
                const currentMonth = nextDate.getUTCMonth();
                nextDate.setUTCMonth(currentMonth + 1);
                // OJO: setUTCMonth puede cambiar el día si el mes siguiente es más corto
                // Podría ser mejor usar la lógica de dayOfMonth si es posible
            }
            break;
        case 'anual':
            nextDate.setUTCFullYear(nextDate.getUTCFullYear() + 1);
            break;
        case 'semanal':
            nextDate.setUTCDate(nextDate.getUTCDate() + 7);
            break;
        case 'quincenal':
             nextDate.setUTCDate(nextDate.getUTCDate() + 14); // Asumiendo 14 días
             break;
        case 'bimestral':
             nextDate.setUTCMonth(nextDate.getUTCMonth() + 2);
             break;
        case 'trimestral':
            nextDate.setUTCMonth(nextDate.getUTCMonth() + 3);
            break;
        case 'semestral':
            nextDate.setUTCMonth(nextDate.getUTCMonth() + 6);
            break;
        default:
            console.warn(`Unrecognized frequency: ${frequency}`);
            return null;
    }

    // Asegurar que la fecha calculada sea futura respecto a la original + 1 día mínimo
    // para evitar bucles si la función corre más de una vez el mismo día.
    const minimumNextDate = new Date(currentDueDate.getTime());
    minimumNextDate.setUTCDate(minimumNextDate.getUTCDate() + 1); // Al menos el día siguiente

    if (nextDate < minimumNextDate) {
         console.warn(`Calculated date ${nextDate.toISOString()} is not after ${minimumNextDate.toISOString()}. Re-calculating...`);
         // Si la fecha calculada sigue siendo igual o anterior a la original + 1 día,
         // intentar calcular de nuevo desde la fecha recién calculada.
         return calculateNextDueDate(nextDate.toISOString().split('T')[0], frequency, dayOfMonth);
    }


    console.log(`   New calculated date: ${nextDate.toISOString().split('T')[0]}`);
    return nextDate;
}

// --- Handler Principal de la Edge Function ---
Deno.serve(async (req) => {
    // Manejo de CORS Preflight (necesario para llamadas desde navegador, aunque esta es SCHEDULADA)
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        console.log("Initializing Supabase client with SERVICE_ROLE_KEY...");
        // ¡IMPORTANTE! Usa la Service Role Key aquí para poder operar en todas las filas.
        // Asegúrate de que estas variables de entorno estén configuradas en tu proyecto Supabase.
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('CUSTOM_SERVICE_ROLE_KEY') ?? '', // ¡Clave de Servicio!
             { auth: { persistSession: false } } // No necesitamos sesión persistente en el servidor
        );
        console.log("Supabase client initialized.");

        const today = new Date().toISOString().split('T')[0]; // Fecha de hoy en YYYY-MM-DD (UTC por defecto)
        console.log(`Processing fixed expenses due on or before: ${today}`);

        // 1. Buscar gastos fijos activos cuya fecha de vencimiento sea hoy o anterior
        const { data: dueExpenses, error: fetchError } = await supabaseAdmin
            .from('scheduled_fixed_expenses')
            .select('*') // Traer todas las columnas necesarias
            .eq('is_active', true)
            .lte('next_due_date', today); // Menor o igual a hoy

        if (fetchError) throw fetchError;

        console.log(`Found ${dueExpenses?.length || 0} due expenses to process.`);

        if (!dueExpenses || dueExpenses.length === 0) {
            return new Response(JSON.stringify({ message: 'No due expenses found today.' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        const results = [];

        // 2. Procesar cada gasto vencido
        for (const expense of dueExpenses) {
            console.log(`Processing expense ID: ${expense.id}, Description: ${expense.description}`);

            // Validar datos necesarios
            if (!expense.account_id) {
                console.warn(`Skipping expense ID ${expense.id} - Missing account_id.`);
                results.push({ id: expense.id, status: 'skipped', reason: 'Missing account_id' });
                continue; // Saltar al siguiente
            }
             if (!expense.category_id) {
                 console.warn(`Skipping expense ID ${expense.id} - Missing category_id.`);
                 results.push({ id: expense.id, status: 'skipped', reason: 'Missing category_id' });
                 continue; // Saltar al siguiente
             }


            // 3. Crear la transacción de gasto
             const transactionData = {
                 user_id: expense.user_id,
                 account_id: expense.account_id,
                 category_id: expense.category_id,
                 type: 'gasto',
                 // ¡OJO! Asegúrate de que en tu tabla 'transactions' guardas los gastos como NEGATIVOS
                 amount: -Math.abs(Number(expense.amount) || 0),
                 transaction_date: expense.next_due_date, // Usar la fecha de vencimiento como fecha de transacción
                 description: `Pago Fijo: ${expense.description}`,
                 notes: `Gasto programado ID: ${expense.id}` // Nota automática opcional
             };

             console.log("   Inserting transaction:", transactionData);
             const { error: insertError } = await supabaseAdmin
                 .from('transactions')
                 .insert(transactionData);

             if (insertError) {
                 console.error(`   Failed to insert transaction for expense ID ${expense.id}:`, insertError);
                 results.push({ id: expense.id, status: 'error', reason: `Insert failed: ${insertError.message}` });
                 continue; // No actualizar fecha si la transacción falló
             }
             console.log(`   Transaction inserted successfully for expense ID ${expense.id}.`);

             // 4. Calcular la siguiente fecha de vencimiento
             const newNextDueDate = calculateNextDueDate(expense.next_due_date, expense.frequency, expense.day_of_month);

             if (!newNextDueDate) {
                  console.warn(`   Could not calculate next due date for expense ID ${expense.id}. Deactivating?`);
                  // Considerar desactivar el gasto si no se puede calcular la fecha?
                  // O simplemente loguear y dejarlo para revisión manual.
                  results.push({ id: expense.id, status: 'warning', reason: 'Could not calculate next due date' });
                  continue; // No intentar actualizar si no hay fecha nueva
             }

             const newDateString = newNextDueDate.toISOString().split('T')[0];

             // 5. Actualizar la fecha del gasto fijo en la tabla original
             console.log(`   Updating next_due_date for expense ID ${expense.id} to ${newDateString}`);
             const { error: updateError } = await supabaseAdmin
                 .from('scheduled_fixed_expenses')
                 .update({ next_due_date: newDateString, updated_at: new Date() })
                 .eq('id', expense.id); // Solo actualizar este registro

             if (updateError) {
                 console.error(`   Failed to update next_due_date for expense ID ${expense.id}:`, updateError);
                 // ¡IMPORTANTE! La transacción se creó pero la fecha no se actualizó.
                 // Puede causar doble procesamiento mañana si no se arregla.
                 results.push({ id: expense.id, status: 'error', reason: `Transaction created BUT date update failed: ${updateError.message}` });
             } else {
                 console.log(`   Successfully updated next_due_date for expense ID ${expense.id}.`);
                  results.push({ id: expense.id, status: 'processed' });
             }
        } // Fin del bucle for

        // Devolver un resumen de lo que se hizo
        return new Response(JSON.stringify({ message: `Processed ${dueExpenses.length} expenses.`, results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error('Error in Edge Function execution:', error);

        // --- INICIO: Manejo seguro del error 'unknown' ---
        let errorMessage = 'An unknown error occurred.';
        if (error instanceof Error) {
            errorMessage = error.message; // Ahora es seguro acceder a .message
        } else if (typeof error === 'string') {
            errorMessage = error;
        } else {
             // Puedes intentar convertir a string si no es un Error ni un string
             try { errorMessage = JSON.stringify(error); } catch { /* Ignorar error de stringify */ }
        }
        // --- FIN: Manejo seguro del error 'unknown' ---

        return new Response(JSON.stringify({ error: errorMessage }), { // Usar el mensaje procesado
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});