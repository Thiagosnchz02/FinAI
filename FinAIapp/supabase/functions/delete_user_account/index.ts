// supabase/functions/delete-user-account/index.ts

import { createClient, SupabaseClient } from "supabase";

// Importa desde la carpeta compartida (la ruta es relativa a este archivo index.ts)
import { corsHeaders } from '../shared/cors.ts'

console.log(`Function delete-user-account started...`)

Deno.serve(async (req) => {
  // Manejo de CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let supabaseClient: SupabaseClient | null = null;

  try {
    // 1. Crear cliente estándar para obtener usuario
    supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // 2. Obtener usuario autenticado
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) throw new Error('Usuario no autenticado.')
    const userIdToDelete = user.id
    console.log(`Attempting to delete user ID: ${userIdToDelete}`)

    // 3. Crear cliente ADMIN con Service Role Key (Configurada como Secret)
    const serviceRoleKey = Deno.env.get('CUSTOM_SERVICE_ROLE_KEY')
    if (!serviceRoleKey) throw new Error('Falta la Service Role Key en la configuración de la función.')
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey
    )

    // 4. Eliminar usuario (ON DELETE CASCADE hará el resto)
    const { data: deletionData, error: deletionError } = await supabaseAdmin.auth.admin.deleteUser(userIdToDelete)
    if (deletionError) throw deletionError

    console.log(`User ${userIdToDelete} deleted successfully.`, deletionData)

    // 5. Devolver éxito
    return new Response(JSON.stringify({ message: `Usuario ${userIdToDelete} eliminado.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    })

  } catch (error) {
    console.error('Error en delete-user-account:', error);

    let status = 500;
    let message = 'Error interno.';

    if (error instanceof Error) {
      message = error.message;

      if (typeof error === "object" && error !== null && "status" in error) {
        status = (error as { status: number }).status;
      }
      
    }

    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    });
  }
})