/*
Archivo: src/pages/Login.jsx
Propósito: Componente para la página de inicio de sesión y registro,
          incluyendo la lógica de manejo de formularios y llamadas a Supabase.
*/
import React, { useState } from 'react'; // Importa React y useState
import { Link, useNavigate } from 'react-router-dom'; // Importa Link y useNavigate
import { supabase } from '../services/supabaseClient'; // Importa nuestro cliente Supabase

// Importa la imagen de la mascota/logo desde la carpeta de assets
import finAiMascot from '../assets/Logo_FinAI_Oficial.png';

function Login() {
  // --- Estados del Componente ---
  // Estados para los inputs del formulario de Sign In
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  // Estados para los inputs del formulario de Sign Up
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');

  // Estados para control de carga y mensajes
  const [signInLoading, setSignInLoading] = useState(false);
  const [signUpLoading, setSignUpLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState(''); // Mensaje general (éxito/error)
  const [messageType, setMessageType] = useState(''); // 'success' o 'error'

  const navigate = useNavigate(); // Hook para la redirección

  // --- Manejadores de Eventos ---

  // Manejador genérico para cambios en inputs (identifica por 'name')
  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setMessage(''); // Limpiar mensaje al escribir

    switch (name) {
      case 'signInEmail': setSignInEmail(value); break;
      case 'signInPassword': setSignInPassword(value); break;
      case 'signUpName': setSignUpName(value); break;
      case 'signUpEmail': setSignUpEmail(value); break;
      case 'signUpPassword': setSignUpPassword(value); break;
      default: break;
    }
  };

  // Manejador para el envío del formulario de Sign In
  const handleSignInSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setMessageType('');

    if (!signInEmail || !signInPassword) {
      setMessage('Por favor, introduce tu email y contraseña.');
      setMessageType('error');
      return;
    }

    setSignInLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: signInEmail,
        password: signInPassword,
      });

      if (error) {
        throw error; // Lanza el error para que lo capture el catch
      }

      console.log('Usuario inició sesión:', data.user);
      // No mostramos alert, la redirección ocurrirá (o el AuthContext actualizará el estado)
      // Si el AuthListener está bien configurado, la redirección podría ser automática
      // o podemos forzarla aquí:
      navigate('/dashboard'); // Redirige al dashboard

    } catch (error) {
      console.error('Error en SignIn:', error);
      if (error.message.includes("Email not confirmed")) {
        setMessage('Error: Debes confirmar tu email antes de iniciar sesión.');
      } else {
         // Mensaje genérico por seguridad
        setMessage('Error al iniciar sesión: Email o contraseña incorrectos.');
      }
      setMessageType('error');
    } finally {
      setSignInLoading(false); // Quita el estado de carga al finalizar
    }
  };

  // Manejador para el envío del formulario de Sign Up
  const handleSignUpSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setMessageType('');

    // Validación básica
    if (!signUpName || !signUpEmail || !signUpPassword) {
      setMessage('Por favor, completa todos los campos de registro.');
      setMessageType('error');
      return;
    }
    if (signUpPassword.length < 8) {
      setMessage('La contraseña debe tener al menos 8 caracteres.');
      setMessageType('error');
      return;
    }

    setSignUpLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: signUpEmail,
        password: signUpPassword,
        options: {
          data: {
            full_name: signUpName // Guarda el nombre en metadata
          }
          // Opcional: Añadir redirectTo si quieres forzar una página específica
          // después de la confirmación del email. Si no, Supabase usa la URL del sitio.
          // redirectTo: window.location.origin + '/ruta-post-confirmacion'
        }
      });

      if (error) {
        throw error;
      }

      // Comprobar si el usuario necesita confirmar email (si la sesión es null)
      if (data.user && !data.session) {
         setMessage('¡Registro casi listo! Revisa tu email (' + signUpEmail + ') para confirmar tu cuenta.');
         setMessageType('success');
      } else if (data.user && data.session) {
         // Si la confirmación está desactivada o ya se hizo (poco común aquí)
         setMessage('¡Registro exitoso! Ya puedes iniciar sesión.');
         setMessageType('success');
      } else {
         // Caso inesperado pero posible
         setMessage('Registro procesado. Revisa tu email para confirmar.');
         setMessageType('success');
      }
      // Limpiar formulario en caso de éxito (o casi éxito)
      setSignUpName('');
      setSignUpEmail('');
      setSignUpPassword('');

    } catch (error) {
      console.error('Error en SignUp:', error);
      setMessage('Error al registrarse: ' + error.message);
      setMessageType('error');
    } finally {
      setSignUpLoading(false);
    }
  };

  // Manejador para el clic en el botón de Google Sign In
  const handleGoogleSignIn = async () => {
    setMessage('');
    setMessageType('');
    setGoogleLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // IMPORTANTE: Asegúrate de que esta URL (o la URL base de tu sitio)
          // esté en la lista de URIs de redirección autorizados en Google Cloud
          // y en la configuración del proveedor Google en Supabase.
          redirectTo: window.location.origin + '/dashboard' // Redirige al dashboard después del login
        }
      });

      if (error) {
        throw error;
      }

      // La redirección a Google ocurre automáticamente. Si hay éxito,
      // el usuario volverá a 'redirectTo' y el AuthListener debería
      // detectar la sesión. No necesitamos hacer nada más aquí usualmente.
      console.log('Redireccionando a Google...', data);
      // El estado de carga se quitará cuando la página redirija o si hay error.

    } catch (error) {
      console.error('Error iniciando sesión con Google:', error);
      setMessage('Error al intentar iniciar sesión con Google: ' + error.message);
      setMessageType('error');
      setGoogleLoading(false); // Quitar carga solo si hay error aquí
    }
    // No ponemos finally aquí porque la redirección corta la ejecución
  };


  // --- Renderizado del Componente ---
  return (
    <div className="container"> {/* Contenedor principal */}
      <h1 className="main-title">FinAi</h1>

      {/* Mensaje general de feedback */}
      {message && (
        <p className={`message ${messageType === 'error' ? 'error-message' : 'success-message'}`}>
          {message}
        </p>
      )}

      <div className="panels-container">

        {/* --- Panel de Inicio de Sesión (Sign In) --- */}
        <div className="panel sign-in-panel">
          <h2>Sign In</h2>
          <form id="signInForm" onSubmit={handleSignInSubmit}>
            <div className="input-group">
              <label htmlFor="signInEmail">Email</label>
              <input
                type="email"
                id="signInEmail"
                name="signInEmail" // Usado en handleInputChange
                value={signInEmail} // Vinculado al estado
                onChange={handleInputChange} // Actualiza estado
                required
                disabled={signInLoading || googleLoading} // Deshabilitar si está cargando
              />
            </div>
            <div className="input-group">
              <label htmlFor="signInPassword">Password</label>
              <input
                type="password"
                id="signInPassword"
                name="signInPassword"
                value={signInPassword}
                onChange={handleInputChange}
                required
                disabled={signInLoading || googleLoading}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={signInLoading || googleLoading} // Deshabilitar si está cargando
            >
              {signInLoading ? 'Iniciando...' : 'Sign In'}
            </button>
            <button
              type="button"
              className="btn btn-google"
              onClick={handleGoogleSignIn}
              disabled={signInLoading || signUpLoading || googleLoading} // Deshabilitar si cualquier carga está activa
            >
              <i className="fab fa-google"></i> {googleLoading ? 'Conectando...' : 'Sign in with Google'}
            </button>
            {/* Link ya funciona gracias a AppRouter */}
            <Link to="/reset-password-email" className="forgot-password">Forgot password?</Link>
          </form>
        </div>

        {/* --- Panel de Registro (Sign Up) --- */}
        <div className="panel sign-up-panel">
          <h2>Sign Up</h2>
          <form id="signUpForm" onSubmit={handleSignUpSubmit}>
            <div className="input-group">
              <label htmlFor="signUpName">Name</label>
              <input
                type="text"
                id="signUpName"
                name="signUpName"
                value={signUpName}
                onChange={handleInputChange}
                required
                disabled={signUpLoading}
              />
            </div>
            <div className="input-group">
              <label htmlFor="signUpEmail">Email</label>
              <input
                type="email"
                id="signUpEmail"
                name="signUpEmail"
                value={signUpEmail}
                onChange={handleInputChange}
                required
                disabled={signUpLoading}
              />
            </div>
            <div className="input-group">
              <label htmlFor="signUpPassword">Password</label>
              <input
                type="password"
                id="signUpPassword"
                name="signUpPassword"
                value={signUpPassword}
                onChange={handleInputChange}
                required
                disabled={signUpLoading}
              />
            </div>
            <div className="robot-container">
              <img src={finAiMascot} alt="FinAi Mascot" className="robot-image" />
              <button
                type="submit"
                className="btn btn-secondary"
                disabled={signUpLoading}
              >
                {signUpLoading ? 'Registrando...' : 'Sign Up'}
              </button>
            </div>
          </form>
        </div>

      </div> {/* Fin de panels-container */}
    </div> // Fin de container
  );
}

export default Login;


