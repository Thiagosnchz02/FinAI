// supabase/functions/_shared/cors.ts
// Define las cabeceras CORS que usarán tus funciones

export const corsHeaders = {
    // Para desarrollo local puedes usar '*' o 'http://127.0.0.1:xxxx' (tu puerto de Live Server)
    // Para producción, cámbialo a tu dominio: 'https://finai.es'
    'Access-Control-Allow-Origin': '*',
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', // Headers necesarios para Supabase
  }