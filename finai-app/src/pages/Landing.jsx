/*
Archivo: src/pages/Landing.jsx
Propósito: Componente para la página de inicio/aterrizaje de la aplicación.
          Inicialmente muestra un mensaje simple. Más adelante, podría
          contener información de marketing, botones de login/registro,
          o la lógica de redirección basada en autenticación.
*/
import React, { useEffect } from 'react';
// Importaremos useNavigate de react-router-dom cuando implementemos la redirección
import { useNavigate } from 'react-router-dom';
// Importaremos el contexto de autenticación cuando lo creemos
import { useAuth } from '../contexts/AuthContext';

// Estilos: Los estilos que estaban en el <style> del HTML original
// deberían moverse a un archivo SCSS, por ejemplo, src/styles/_base.scss
// o un nuevo src/styles/_landing.scss e importarlo en global.scss.
// Ejemplo de cómo podrían quedar en SCSS:
/*
// En _base.scss o _landing.scss:
body { // O un selector más específico como .landing-page-container
  font-family: 'Nunito', sans-serif; // Asegúrate de importar esta fuente si la usas
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f0f4f8; // Considera usar variables SCSS para colores
  color: #555;             // Considera usar variables SCSS
}
*/

function Landing() {
  // Obtiene el estado de autenticación usando el hook
  // user: contendrá el objeto usuario de Supabase si está logueado, o null si no.
  // loading: será true mientras AuthContext comprueba la sesión inicial, luego false.
  const { user, loading } = useAuth();
  const navigate = useNavigate(); // Hook para navegar programáticamente

  useEffect(() => {
    console.log("Landing Effect: loading =", loading, "user =", !!user); // Log para depuración

    // Solo actuar DESPUÉS de que la comprobación inicial de sesión haya terminado
    if (!loading) {
      if (user) {
        // Si hay un usuario logueado, redirige al Dashboard
        console.log("Landing: Usuario encontrado, redirigiendo a /dashboard...");
        navigate('/dashboard', { replace: true }); // replace: true evita que esta página quede en el historial
      } else {
        // Si no hay usuario, redirige a la página de Login
        console.log("Landing: Usuario no encontrado, redirigiendo a /login...");
        navigate('/login', { replace: true });
      }
    }
    // La dependencia [loading, user, navigate] asegura que el efecto se
    // re-ejecute si cambia el estado de carga o el usuario.
  }, [loading, user, navigate]);

  // Mientras 'loading' es true, muestra el mensaje de "Redirigiendo..."
  // O podrías mostrar un componente Spinner/Loader más elaborado aquí.
  return (
    <div className="landing-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontFamily: 'Nunito, sans-serif', backgroundColor: '#f0f4f8' }}>
      <p style={{ color: '#555', fontSize: '1.2em' }}>Redirigiendo...</p>
      {/* Ejemplo de Spinner (requiere CSS): <div className="spinner"></div> */}
    </div>
  );
}

export default Landing; // Exporta el componente para poder usarlo en el Router

