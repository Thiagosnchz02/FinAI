/*
Archivo: src/services/supabaseClient.js
Propósito: Inicializa y exporta el cliente Supabase para usarlo en la aplicación.
*/
import { createClient } from '@supabase/supabase-js';

// Obtén tu URL y clave pública anónima desde la configuración de tu proyecto Supabase
// Es recomendable guardarlas en variables de entorno (.env) en un proyecto real
// por seguridad, usando import.meta.env.VITE_SUPABASE_URL, etc.
const supabaseUrl = 'https://exwdzrnguktrpmwgvioo.supabase.co'; // Reemplaza con tu URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4d2R6cm5ndWt0cnBtd2d2aW9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwMDgzNzcsImV4cCI6MjA1ODU4NDM3N30.y0spDaSiheZYsnwLxTnE5V_m4jxnC3h8KNW-U4vgR2M'; // Reemplaza con tu Clave Anónima

// Crea y exporta el cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseKey);

// Puedes añadir aquí otras configuraciones o funciones relacionadas con Supabase si es necesario.
console.log("Supabase client initialized."); // Mensaje para confirmar inicialización