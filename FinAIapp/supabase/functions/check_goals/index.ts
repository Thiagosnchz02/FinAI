// supabase/functions/check-goals/index.ts

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2?dts";


// Importa desde la carpeta compartida (la ruta es relativa a este archivo index.ts)
import { corsHeaders } from '../shared/cors.ts'

console.log(`Function check-goals starting...`)

interface Goal {
  id: string;
  user_id: string;
  name: string;
  current_amount: number;
  target_amount: number;
}

interface Profile {
  id: string;
  notify_goal_reached?: boolean;
}

 interface NotificationPayload {
  user_id: string;
  type: string;
  message: string;
  is_read: boolean;
  related_entity_type: string;
  related_entity_id: string; // ID de la meta alcanzada
}

Deno.serve(async (_req) => {
  try {
    // Cliente Admin
    const serviceRoleKey = Deno.env.get('CUSTOM_SERVICE_ROLE_KEY')
    if (!serviceRoleKey) throw new Error('Falta la CUSTOM_SERVICE_ROLE_KEY.')
        const supabaseAdmin = createAdminClient(
            serviceRoleKey,
            Deno.env.get('SUPABASE_URL') ?? ''
          );
    console.log("Admin client created.")

    // 1. Obtener todas las metas donde lo actual >= objetivo
    const { data: potentialGoals, error: goalsError } = await supabaseAdmin
      .from('goals')
      .select('id, user_id, name, current_amount, target_amount')
      .gte('current_amount', 'target_amount') // Busca donde actual es >= objetivo

    if (goalsError) throw new Error(`Error fetching goals: ${goalsError.message}`);
    if (!potentialGoals || potentialGoals.length === 0) {
      console.log("No potentially completed goals found.");
      return new Response(JSON.stringify({ message: 'No goals found.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }
    console.log(`Found ${potentialGoals.length} potentially completed goals.`);

    // 2. Obtener preferencias de los usuarios afectados
    const userIds = [...new Set((potentialGoals as Goal[]).map((g: Goal) => g.user_id))];
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, notify_goal_reached')
      .in('id', userIds);
    if (profilesError) throw new Error(`Error fetching profiles: ${profilesError.message}`);
    const userPreferences = new Map((profiles as Profile[]).map((p: Profile) => [p.id, p.notify_goal_reached ?? true]));

    console.log("User preferences obtained.");

    // 3. Filtrar metas y verificar si ya se notificó para evitar duplicados
    const notificationsToInsert: NotificationPayload[] = [];
    const goalsToCheck = potentialGoals as Goal[]; // Cast para tipado

     // Obtener IDs de las metas potencialmente completadas para buscar notificaciones existentes
     const potentialGoalIds = goalsToCheck.map(g => g.id);

     // Buscar notificaciones existentes para estas metas
     const { data: existingNotifications, error: checkNotifyError } = await supabaseAdmin
         .from('notifications')
         .select('related_entity_id') // Solo necesitamos el ID de la meta notificada
         .eq('type', 'meta_alcanzada')
         .in('related_entity_id', potentialGoalIds); // Busca notificaciones de las metas encontradas

     if (checkNotifyError) throw new Error(`Error checking existing notifications: ${checkNotifyError.message}`);

     const notifiedGoalIds = new Set(
        (existingNotifications as { related_entity_id: string }[]).map((n: { related_entity_id: string }) => n.related_entity_id)
      );
     console.log(`Already notified goal IDs: ${[...notifiedGoalIds].join(', ')}`);


    for (const goal of goalsToCheck) {
      const userPref = userPreferences.get(goal.user_id);

      // Comprobar si el usuario quiere la notificación Y si NO hemos notificado ya esta meta
      if (userPref === true && !notifiedGoalIds.has(goal.id)) {
        const message = `¡Felicidades! Has alcanzado tu meta de ahorro para '${goal.name}'.`;
        notificationsToInsert.push({
          user_id: goal.user_id,
          type: 'meta_alcanzada',
          message: message,
          is_read: false,
          related_entity_type: 'goals', // Vinculado a tabla goals
          related_entity_id: goal.id,   // Con el ID de la meta
        });
         console.log(`Notification prepared for goal ${goal.id} (User: ${goal.user_id})`);
      } else {
         if(userPref !== true) console.log(`Skipping notification for goal ${goal.id} (User: ${goal.user_id} - pref off)`);
         if(notifiedGoalIds.has(goal.id)) console.log(`Skipping notification for goal ${goal.id} (User: ${goal.user_id} - already notified)`);
      }
    }

    // 4. Insertar las notificaciones nuevas
    if (notificationsToInsert.length > 0) {
      console.log(`Inserting ${notificationsToInsert.length} goal reached notifications...`);
      const { error: insertError } = await supabaseAdmin
        .from('notifications')
        .insert(notificationsToInsert);
      if (insertError) throw insertError;
       console.log("Goal reached notifications inserted successfully.");
    } else {
       console.log("No new goal reached notifications needed.");
    }

    return new Response(JSON.stringify({ message: `Checked ${potentialGoals.length} goals, inserted ${notificationsToInsert.length} notifications.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });

  } catch (error) {
    console.error('Error in check-goals function:', error);
    const message = error instanceof Error ? error.message : 'Error interno.';
    return new Response(JSON.stringify({ error: message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
})

// Helper para crear cliente admin (pon las opciones correctas)
function createAdminClient(serviceRoleKey: string, supabaseUrl: string): SupabaseClient {
     return createClient(supabaseUrl, serviceRoleKey, {
         auth: { autoRefreshToken: false, persistSession: false }
     });
 }