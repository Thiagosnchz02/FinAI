console.log('DEBUG: supabase-init.js - Cargado');
// supabase-init.js
const SUPABASE_URL = 'https://exwdzrnguktrpmwgvioo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4d2R6cm5ndWt0cnBtd2d2aW9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwMDgzNzcsImV4cCI6MjA1ODU4NDM3N30.y0spDaSiheZYsnwLxTnE5V_m4jxnC3h8KNW-U4vgR2M';
let supabase = null;
try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase inicializado correctamente (desde init).');
} catch (error) {
    console.error('Error inicializando Supabase:', error);
    alert('Error crítico: No se pudo conectar con Supabase.');
}
// (Opcional: El test de fetch básico que sugerí antes)
// if (supabase) {
//     fetch(SUPABASE_URL)
//     .then(response => console.log('DEBUG: Basic fetch to SUPABASE_URL status:', response.status))
//        .catch(error => console.error('DEBUG: Basic fetch to SUPABASE_URL failed:', error));
//}