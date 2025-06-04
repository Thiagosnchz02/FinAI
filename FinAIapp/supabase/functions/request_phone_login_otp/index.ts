// supabase/functions/request_phone_login_otp/index.ts
// Basado en TU versión que usa fetch directo, con create_user: false y correcciones de LINT

import { serve } from "https://deno.land/std@0.178.0/http/mod.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2?dts";
import { corsHeaders } from '../shared/cors.ts';

console.log(`🚀 request_phone_login_otp v_FETCH_DIRECTO_LINTED starting…`);

function normalizeToE164(s: string | undefined | null, defaultCC = '34'): string {
    const cleaned = (s || '').replace(/\s+/g, '').trim();
    if (!cleaned) return ''; 
    if (cleaned.startsWith('+')) return cleaned;
    if (cleaned.startsWith('00')) return `+${cleaned.substring(2)}`;
    if (defaultCC === '34' && cleaned.length === 9 && /^[679]/.test(cleaned) && !cleaned.startsWith(defaultCC)) {
        return `+${defaultCC}${cleaned}`;
    }
    if (cleaned.length > 9 && cleaned.startsWith(defaultCC) && !cleaned.startsWith('+')) {
         return `+${cleaned}`;
    }
    if (!cleaned.startsWith('+')) {
       return `+${cleaned}`; 
    }
    return cleaned; 
}

// Interfaz para ayudar a tipar el objeto JSON de error de Supabase/GoTrue
interface GoTrueErrorShape {
    msg?: string;
    message?: string;
    error_description?: string;
    error?: string;
    code?: number; // A veces el código HTTP está aquí también
    // Añade otras propiedades comunes si las identificas
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    let supabaseAdminClient: SupabaseClient;

    try {
        const body = await req.json().catch(() => ({}));
        const rawPhoneNumber = body?.phoneNumber;

        if (!rawPhoneNumber || typeof rawPhoneNumber !== 'string' || rawPhoneNumber.trim() === '') {
            return new Response(JSON.stringify({ error: 'Número de teléfono inválido o no proporcionado.' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
            });
        }

        const normalizedPhoneNumber = normalizeToE164(rawPhoneNumber);
        if (!normalizedPhoneNumber || !/^\+[1-9]\d{1,14}$/.test(normalizedPhoneNumber)) {
             return new Response(JSON.stringify({ error: 'El formato del número de teléfono no es válido tras la normalización.' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
            });
        }
        
        console.log(`[v_FETCH_DIRECTO_LINTED] Raw phone: "${rawPhoneNumber}", Normalized phone: "${normalizedPhoneNumber}"`);

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const serviceRoleKey = Deno.env.get('CUSTOM_SERVICE_ROLE_KEY')!;

        if (!supabaseUrl || !serviceRoleKey) {
            console.error('[v_FETCH_DIRECTO_LINTED] SUPABASE_URL or CUSTOM_SERVICE_ROLE_KEY env vars not set.');
            return new Response(JSON.stringify({ error: 'Configuración del servidor incompleta.' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
            });
        }
        
        supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
        });
        
        console.log(`[v_FETCH_DIRECTO_LINTED] Verificando existencia (RPC): "${normalizedPhoneNumber}"`);
        const { data: phoneExists, error: rpcError } = await supabaseAdminClient.rpc('check_phone_exists', {
            p_phone: normalizedPhoneNumber
        });

        console.log(`[v_FETCH_DIRECTO_LINTED] Resultado RPC check_phone_exists: ${String(phoneExists)}. Error RPC: ${JSON.stringify(rpcError)}`);

        if (rpcError) {
            return new Response(JSON.stringify({ error: `Error al verificar el teléfono: ${rpcError.message}` }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500, 
            });
        }

        if (phoneExists !== true) { 
            return new Response(JSON.stringify({ error: 'Este número de teléfono no está registrado. Por favor, regístrate primero.' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404, 
            });
        }

        console.log(`[v_FETCH_DIRECTO_LINTED] Teléfono existe. Solicitando OTP con fetch directo a /auth/v1/otp para: "${normalizedPhoneNumber}"`);
        
        const otpResponse = await fetch(`${supabaseUrl}/auth/v1/otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': serviceRoleKey, 
                'Authorization': `Bearer ${serviceRoleKey}`, 
            },
            body: JSON.stringify({ 
                phone: normalizedPhoneNumber,
                create_user: false 
            }),
        });

        const responseBodyText = await otpResponse.text();
        console.log(`[v_FETCH_DIRECTO_LINTED] Respuesta de /auth/v1/otp - Status: ${otpResponse.status}, Body: ${responseBodyText}`);

        if (!otpResponse.ok) {
            let errorJson: GoTrueErrorShape = {}; // Usar la interfaz para tipar
            try {
                errorJson = JSON.parse(responseBodyText) as GoTrueErrorShape;
            } catch (parseErr) {
                console.warn("[v_FETCH_DIRECTO_LINTED] No se pudo parsear el cuerpo del error de /auth/v1/otp como JSON:", parseErr);
            }

            // Acceder a las propiedades de forma segura
            let errMsg = 'Error desconocido enviando OTP.';
            if (errorJson.msg) errMsg = errorJson.msg;
            else if (errorJson.message) errMsg = errorJson.message;
            else if (errorJson.error_description) errMsg = errorJson.error_description;
            else if (errorJson.error) errMsg = errorJson.error;
            else if (responseBodyText) errMsg = responseBodyText.substring(0, 200); // Fallback al texto crudo
            
            return new Response(JSON.stringify({ error: errMsg, originalResponse: errorJson }), {
                status: otpResponse.status,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }
        
        return new Response(JSON.stringify({ message: 'OTP enviado correctamente. Por favor, revisa tu teléfono.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (e: unknown) { 
        console.error('[v_FETCH_DIRECTO_LINTED] Captura de error general:', e);
        
        // Esta variable SÍ se reasigna, por lo que 'let' es correcto.
        let errorMessage = 'Error interno del servidor en la función Edge.';
        let errorStatus = 500;

        // Comprobaciones de tipo para extraer el mensaje y status de forma segura
        if (e && typeof e === 'object') {
            const errObj = e as { message?: string; status?: number; name?: string }; // Asumir una forma común de error
            if (typeof errObj.message === 'string') {
                errorMessage = errObj.message;
            }
            if (typeof errObj.status === 'number') {
                errorStatus = errObj.status;
            }
        } else if (e instanceof Error) { // Fallback si es una instancia de Error estándar
             errorMessage = e.message;
        } else if (typeof e === 'string') { // Si se lanzó un string
            errorMessage = e;
        }
        
        return new Response(JSON.stringify({ error: errorMessage }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: errorStatus,
        });
    }
});
