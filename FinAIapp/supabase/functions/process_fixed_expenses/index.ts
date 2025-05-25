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

    if (nextDate.getTime() <= currentDueDate.getTime()) { // Asegurar que sea estrictamente después
         console.warn(`Calculated date ${nextDate.toISOString()} is not after ${currentDueDate.toISOString()}. Re-calculating from current date + interval...`);
         // Si la fecha calculada es igual o anterior, forzar el avance desde la fecha original
         // Esto es un fallback, la lógica del switch debería avanzar la fecha.
         // Re-evaluar la lógica del switch si esto ocurre frecuentemente.
         // Por ahora, si esto pasa, es mejor añadir el intervalo a la fecha original directamente.
         // Esta recursión podría ser peligrosa si la lógica base no avanza.
         // Una mejor aproximación sería recalcular basado en la frecuencia desde currentDueDate + 1 día.
         // Para simplificar, si la fecha no avanzó, se re-ejecutará con la misma fecha y la lógica de "minimumNextDate"
         // en la siguiente llamada recursiva debería forzar el avance.
         // O, más simple, si nextDate <= currentDueDate, simplemente añadir el intervalo de nuevo.
         // Vamos a re-llamar con la fecha que se calculó, la condición de minimumNextDate en la siguiente llamada debería manejarlo.
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

             const processedDueDate = expense.next_due_date;
            // 3. Crear la transacción de gasto
             const transactionData = {
                 user_id: expense.user_id,
                 account_id: expense.account_id,
                 category_id: expense.category_id,
                 type: 'gasto',
                 // ¡OJO! Asegúrate de que en tu tabla 'transactions' guardas los gastos como NEGATIVOS
                 amount: -Math.abs(Number(expense.amount) || 0),
                 transaction_date: processedDueDate, // Usar la fecha de vencimiento como fecha de transacción
                 description: `Pago Fijo: ${expense.description}`,
                 notes: `Gasto programado ID: ${expense.id}. Procesado el ${new Date().toISOString().split('T')[0]}.`, // Añadir fecha de procesamiento
                 related_scheduled_expense_id: expense.id 
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
             const newNextDueDateObject = calculateNextDueDate(processedDueDate, expense.frequency, expense.day_of_month);

             if (!newNextDueDateObject) {
                  console.warn(`   Could not calculate next due date for expense ID ${expense.id}. Deactivating?`);
                  if (expense.frequency === 'unico') {
                    console.log(`    Expense ID ${expense.id} is a one-time expense. Attempting to deactivate.`);
                    const { error: deactivateError } = await supabaseAdmin
                        .from('scheduled_fixed_expenses')
                        .update({ 
                            is_active: false, 
                            updated_at: new Date(),
                            last_payment_processed_on: processedDueDate // También marcar como procesado
                        })
                        .eq('id', expense.id);
                    if (deactivateError) {
                        results.push({ id: expense.id, status: 'error', reason: `One-time expense processed, but failed to deactivate: ${deactivateError.message}` });
                    } else {
                        results.push({ id: expense.id, status: 'processed_and_deactivated' });
                    }
                } else {
                    results.push({ id: expense.id, status: 'warning', reason: 'Transaction created, but could not calculate next due date. Manual review needed.' });
                }
                continue;
            }

             const newNextDueDateString = newNextDueDateObject.toISOString().split('T')[0];

             const updatePayload = { 
                next_due_date: newNextDueDateString, 
                last_payment_processed_on: processedDueDate, // Guardar la fecha del pago que se acaba de hacer
                updated_at: new Date() 
            };

             // 5. Actualizar la fecha del gasto fijo en la tabla original
             console.log(`    Updating expense ID ${expense.id} with payload:`, updatePayload)
             const { error: updateError } = await supabaseAdmin
                .from('scheduled_fixed_expenses')
                .update(updatePayload) // Usar el payload actualizado
                .eq('id', expense.id);

            if (updateError) {
                console.error(`    Failed to update scheduled_fixed_expense for ID ${expense.id}:`, updateError);
                results.push({ id: expense.id, status: 'error', reason: `Transaction created BUT date/status update failed: ${updateError.message}` });
            } else {
                console.log(`    Successfully updated scheduled_fixed_expense for ID ${expense.id}.`);
                results.push({ id: expense.id, status: 'processed_and_rescheduled' });
            }
        } // Fin del bucle for

        // Devolver un resumen de lo que se hizo
        return new Response(JSON.stringify({ message: `Processed ${dueExpenses.length} expenses.`, results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
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