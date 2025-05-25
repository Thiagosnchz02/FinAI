import { createClient, SupabaseClient, PostgrestSingleResponse } from "https://esm.sh/@supabase/supabase-js@2?dts";


// Importa desde la carpeta compartida (la ruta es relativa a este archivo index.ts)
import { corsHeaders } from '../shared/cors.ts'

console.log(`Function trip-status-updater starting at ${new Date().toISOString()}`);

interface Trip {
  id: string;
  user_id: string; // Necesario si quieres loguear o para futuras RLS más granulares en la función
  start_date: string | null;
  end_date: string | null;
  status: string | null;
}

// Función auxiliar para obtener mensajes de error
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) { return error.message; }
  if (typeof error === 'string') { return error; }
  console.error("trip-status-updater: Caught non-standard error:", error);
  return 'An unexpected error occurred while updating trip statuses.';
}

type SupabaseUpdateResult = PostgrestSingleResponse<null>; // O { error: any | null; data: null; count: number | null; status: number; statusText: string; }

// Función para actualizar viajes a 'en curso'
async function updateTripsToOngoing(supabaseAdmin: SupabaseClient, todayDateString: string) {
  console.log(`trip-status-updater: Checking for trips to set to 'en curso' (start_date <= ${todayDateString})`);
  
  const { data: tripsToStart, error: fetchStartError } = await supabaseAdmin
    .from('trips')
    .select<Trip[]>('id, user_id, name, destination, start_date, end_date, status')
    .eq('status', 'planificado') // Solo los que están planificados
    .lte('start_date', todayDateString) // cuya fecha de inicio es hoy o ya pasó
    .or(`end_date.gte.${todayDateString},end_date.is.null`); // y cuya fecha de fin es hoy o futura, o no tiene fecha de fin

  if (fetchStartError) {
    console.error('trip-status-updater: Error fetching trips to start:', fetchStartError);
    throw new Error(`Error fetching trips to start: ${fetchStartError.message}`);
  }

  if (!tripsToStart || tripsToStart.length === 0) {
    console.log('trip-status-updater: No trips to set to "en curso" today.');
    return 0; // No hay viajes para actualizar
  }

  console.log(`trip-status-updater: Found ${tripsToStart.length} trips to potentially set to 'en curso'.`);

  const updates = tripsToStart.map((trip: Trip) => 
    supabaseAdmin
      .from('trips')
      .update({ status: 'en curso', updated_at: new Date().toISOString() })
      .eq('id', trip.id)
  );

  const results = await Promise.allSettled(updates);
  let successCount = 0;
  results.forEach((result: PromiseSettledResult<SupabaseUpdateResult>, index: number) => {
    if (result.status === 'fulfilled' && result.value && !result.value.error) { // Verificar result.value
      successCount++;
      console.log(`trip-status-updater: Trip ID ${tripsToStart[index].id} successfully updated to 'en curso'.`);
    } else {
      const errorInfo = result.status === 'rejected' 
        ? result.reason 
        : (result.value ? result.value.error : new Error("Unknown error in fulfilled promise"));
      console.error(`trip-status-updater: Failed to update trip ID ${tripsToStart[index].id} to 'en curso'. Error:`, getErrorMessage(errorInfo));
    }
  });
  return successCount;
}

// Función para actualizar viajes a 'finalizado'
async function updateTripsToFinalized(supabaseAdmin: SupabaseClient, todayDateString: string) {
  console.log(`trip-status-updater: Checking for trips to set to 'finalizado' (end_date < ${todayDateString})`);

  const { data: tripsToEnd, error: fetchEndError } = await supabaseAdmin
    .from('trips')
    .select<Trip[]>('id, user_id, name, destination, start_date, end_date, status')
    .neq('status', 'finalizado') // Solo los que no estén ya finalizados
    .lt('end_date', todayDateString); // cuya fecha de fin ya pasó

  if (fetchEndError) {
    console.error('trip-status-updater: Error fetching trips to end:', fetchEndError);
    throw new Error(`Error fetching trips to end: ${fetchEndError.message}`);
  }

  if (!tripsToEnd || tripsToEnd.length === 0) {
    console.log('trip-status-updater: No trips to set to "finalizado" today.');
    return 0; // No hay viajes para actualizar
  }

  console.log(`trip-status-updater: Found ${tripsToEnd.length} trips to potentially set to 'finalizado'.`);

  let successCount = 0;

  // Iterar y procesar cada viaje individualmente para crear notificación después de actualizar
  for (const trip of tripsToEnd) {
    try {
      // 1. Actualizar el estado del viaje
      const { error: updateError } = await supabaseAdmin
        .from('trips')
        .update({ status: 'finalizado', updated_at: new Date().toISOString() })
        .eq('id', trip.id);

      if (updateError) {
        console.error(`trip-status-updater: Failed to update trip ID ${trip.id} (${trip.name}) to 'finalizado'. Error:`, getErrorMessage(updateError));
        continue; // Saltar al siguiente viaje si este falla
      }
      
      console.log(`trip-status-updater: Trip ID ${trip.id} (${trip.name}) successfully updated to 'finalizado'.`);

      // 2. Crear la notificación para este viaje finalizado
      const tripDisplayName = trip.name || (trip.destination ? `viaje a ${trip.destination}` : 'tu viaje');
      const notificationMessage = `¡Tu viaje ${tripDisplayName} ha finalizado! Revisa el resumen de gastos.`;
      
      const { error: notificationError } = await supabaseAdmin
        .from('notifications') // Tu tabla de notificaciones
        .insert({
          user_id: trip.user_id,
          message: notificationMessage,
          type: 'trip_completed', // Tipo específico para esta notificación
          is_read: false,
          related_entity_type: 'trip', // Tu columna para el tipo de entidad
          related_entity_id: trip.id,  // Tu columna para el ID de la entidad
          //related_url: `/trips/${trip.id}` // Opcional: si quieres que la notificación lleve al detalle del viaje
        });

      if (notificationError) {
        console.error(`trip-status-updater: Failed to create notification for finalized trip ID ${trip.id}. Error:`, getErrorMessage(notificationError));
        // No contamos como éxito de actualización de estado si la notificación falla, o sí?
        // Por ahora, la actualización del viaje se considera éxito, pero la notificación falló.
      } else {
        console.log(`trip-status-updater: Notification created for finalized trip ID ${trip.id}.`);
      }
      successCount++; // Contar como éxito de actualización de estado del viaje

    } catch (loopError) {
      // Capturar errores dentro del bucle para no detener todo el proceso
      console.error(`trip-status-updater: Error processing trip ID ${trip.id} in loop:`, getErrorMessage(loopError));
    }
  }
  return successCount;
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
    console.log('trip-status-updater: Supabase admin client initialized.');

    const today = new Date();
    // Obtener la fecha de hoy en formato YYYY-MM-DD en UTC para comparaciones consistentes con las fechas de la BD
    // que idealmente también están en UTC o son solo fechas sin zona horaria.
    const todayDateString = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
                            .toISOString().split('T')[0];

    let ongoingUpdatedCount = 0;
    let finalizedUpdatedCount = 0;

    // Primero, actualizar a 'en curso' los que deben empezar
    ongoingUpdatedCount = await updateTripsToOngoing(supabaseAdmin, todayDateString);
    
    // Luego, actualizar a 'finalizado' los que deben terminar
    // (esto asegura que un viaje que empieza y termina el mismo día se marque como finalizado correctamente)
    finalizedUpdatedCount = await updateTripsToFinalized(supabaseAdmin, todayDateString);

    const message = `Trip status update complete. Ongoing: ${ongoingUpdatedCount}, Finalized: ${finalizedUpdatedCount}.`;
    console.log(`trip-status-updater: ${message}`);
    return new Response(JSON.stringify({ success: true, message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = getErrorMessage(error);
    console.error('trip-status-updater: Fatal error in function execution:', errorMessage);
    console.error('trip-status-updater: Original error object:', error); 
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});