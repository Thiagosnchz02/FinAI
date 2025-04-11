// supabase/functions/verify-password/index.ts

import { createClient, SupabaseClient } from "supabase";

// Importa desde la carpeta compartida
import { corsHeaders } from '../shared/cors.ts'

console.log(`Function verify-password started...`)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let supabaseClient: SupabaseClient | null = null;

  try {
    // 1. Crear cliente estándar
     supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // 2. Obtener usuario
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) throw new Error('Usuario no autenticado.')

    // 3. Obtener contraseña del body
    let providedPassword = null;
    try { const body = await req.json(); providedPassword = body.password; } catch (e) { throw new Error('Falta body o no es JSON.'); }
    if (!providedPassword) throw new Error('Contraseña no proporcionada.');

    // 4. Verificar contraseña
    const { error: signInError } = await supabaseClient.auth.signInWithPassword({
      email: user.email!,
      password: providedPassword,
    })

    const verified = !signInError; // Si no hubo error, es válida
    console.log(`Verify-Pass: Result for user ${user.id}: ${verified}`);

    // 5. Devolver resultado
    return new Response(JSON.stringify({ verified: verified }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    })

  } catch (error) {
    console.error('Error en verify-password:', error);

    let status = 500;
    let message = 'Error interno.';

    if (error instanceof Error) {
      message = error.message;

      if (error.message.includes('no autenticado')) {
        status = 401;
      } else if (error.message.includes('Falta') || error.message.includes('proporcionada')) {
        status = 400;
      }
    }

    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    });
  }
})