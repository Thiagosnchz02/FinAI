/*
Archivo: src/pages/Login.jsx
Propósito: Componente para la página de inicio de sesión y registro,
          incluyendo la lógica de manejo de formularios y llamadas a Supabase.
*/
import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import '../styles/Login.scss';
import toast from 'react-hot-toast'; // Importar toast

// Importa la imagen de la mascota/logo desde la carpeta de assets
import finAiMascot from '../assets/imagotipo.png';

// Constante para longitud mínima (si la necesitas)
const MIN_PASSWORD_LENGTH = 8;

function Login() {
  // --- Estados ---
   // Estado para el formulario de Sign In
   const [signInData, setSignInData] = useState({ email: '', password: '' });
   // Estado para el formulario de Sign Up
   const [signUpData, setSignUpData] = useState({ name: '', email: '', password: '' });
   // Estados de carga
   const [signInLoading, setSignInLoading] = useState(false);
   const [signUpLoading, setSignUpLoading] = useState(false);
   const [googleLoading, setGoogleLoading] = useState(false);
  // Eliminados message y messageType

  const navigate = useNavigate(); // Hook para la redirección

  // --- Handlers Cambio Inputs ---
  const handleSignInChange = useCallback((event) => {
    const { name, value } = event.target;
    setSignInData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSignUpChange = useCallback((event) => {
      const { name, value } = event.target;
      setSignUpData(prev => ({ ...prev, [name]: value }));
  }, []);

  // Manejador para el envío del formulario de Sign In
  const handleSignInSubmit = useCallback(async (event) => {
    event.preventDefault();
    if (!signInData.email || !signInData.password) {
        toast.error('Introduce email y contraseña.'); return;
    }
    setSignInLoading(true);
    const toastId = toast.loading('Iniciando sesión...');
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: signInData.email,
            password: signInData.password,
        });
        if (error) throw error;
        console.log('Usuario inició sesión:', data.user);
        toast.success('¡Bienvenido/a!', { id: toastId });
        navigate('/dashboard');
    } catch (error) {
        console.error('Error en SignIn:', error);
        let userMessage = 'Error: Email o contraseña incorrectos.'; // Mensaje genérico
        if (error.message.includes("Email not confirmed")) {
            userMessage = 'Error: Debes confirmar tu email.';
        }
        toast.error(userMessage, { id: toastId });
    } finally {
        setSignInLoading(false);
    }
  }, [signInData, navigate, supabase]);

  // Manejador para el envío del formulario de Sign Up
  const handleSignUpSubmit = useCallback(async (event) => {
    event.preventDefault();
    if (!signUpData.name || !signUpData.email || !signUpData.password) {
        toast.error('Completa todos los campos de registro.'); return;
    }
    if (signUpData.password.length < MIN_PASSWORD_LENGTH) {
        toast.error(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`); return;
    }
    setSignUpLoading(true);
    const toastId = toast.loading('Registrando...');
    try {
        const { data, error } = await supabase.auth.signUp({
            email: signUpData.email,
            password: signUpData.password,
            options: { data: { full_name: signUpData.name } }
        });
        if (error) throw error;

        if (data.user && !data.session) {
             toast.success('¡Registro casi listo! Revisa tu email para confirmar.', { id: toastId, duration: 6000 });
        } else { // Confirmación desactivada o auto-confirmado
             toast.success('¡Registro exitoso! Ya puedes iniciar sesión.', { id: toastId });
        }
        setSignUpData({ name: '', email: '', password: '' }); // Limpiar form

    } catch (error) {
        console.error('Error en SignUp:', error);
        // Podríamos refinar mensajes de error específicos de signUp si es necesario
        toast.error(`Error al registrar: ${error.message}`, { id: toastId });
    } finally {
        setSignUpLoading(false);
    }
  }, [signUpData, navigate, supabase]); 

  // Manejador para el clic en el botón de Google Sign In
  const handleGoogleSignIn = useCallback(async () => {
    setGoogleLoading(true);
    const toastId = toast.loading('Conectando con Google...'); // Toast inicial
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin + '/dashboard' }
        });
        if (error) throw error;
        // Si no hay error, la redirección a Google sucede. El toast se quedará "colgado"
        // pero desaparecerá cuando el usuario vuelva de Google.
        console.log('Redireccionando a Google...', data);
    } catch (error) {
        console.error('Error iniciando sesión con Google:', error);
        toast.error(`Error con Google: ${error.message}`, { id: toastId });
        setGoogleLoading(false); // Quitar loading solo si hay error *antes* de redirigir
    }
    // No hay finally aquí porque la redirección es lo esperado
  }, [supabase]);

  // --- Renderizado del Componente ---
  return (
    <div className="container">
        <h1 className="main-title">FinAi</h1>
        {/* Mensajes ahora con Toast */}

        <div className="panels-container">
            {/* --- Panel Sign In --- */}
            <div className="panel sign-in-panel">
                <h2>Sign In</h2>
                <form id="signInForm" onSubmit={handleSignInSubmit}>
                    <div className="input-group">
                        <label htmlFor="signInEmail">Email</label>
                        <input
                            type="email" id="signInEmail" name="email" // name="email" coincide con la clave en signInData
                            value={signInData.email} onChange={handleSignInChange} // Usa handler específico
                            required disabled={signInLoading || googleLoading}
                            autoComplete="email"
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="signInPassword">Password</label>
                        <input
                            type="password" id="signInPassword" name="password" // name="password" coincide con la clave
                            value={signInData.password} onChange={handleSignInChange} // Usa handler específico
                            required disabled={signInLoading || googleLoading}
                            autoComplete="current-password"
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={signInLoading || googleLoading}>
                        {signInLoading ? 'Iniciando...' : 'Sign In'}
                    </button>
                    <button type="button" className="btn btn-google" onClick={handleGoogleSignIn} disabled={signInLoading || signUpLoading || googleLoading}>
                        <i className="fab fa-google"></i> {googleLoading ? 'Conectando...' : 'Sign in with Google'}
                    </button>
                    <Link to="/reset-password-email" className="forgot-password">Forgot password?</Link>
                </form>
            </div>

            {/* --- Panel Sign Up --- */}
            <div className="panel sign-up-panel">
                <h2>Sign Up</h2>
                <form id="signUpForm" onSubmit={handleSignUpSubmit}>
                    <div className="input-group">
                        <label htmlFor="signUpName">Name</label>
                        <input
                            type="text" id="signUpName" name="name" // name="name" coincide con clave en signUpData
                            value={signUpData.name} onChange={handleSignUpChange} // Usa handler específico
                            required disabled={signUpLoading}
                            autoComplete="name"
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="signUpEmail">Email</label>
                        <input
                            type="email" id="signUpEmail" name="email" // name="email"
                            value={signUpData.email} onChange={handleSignUpChange} // Usa handler específico
                            required disabled={signUpLoading}
                            autoComplete="email"
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="signUpPassword">Password</label>
                        <input
                            type="password" id="signUpPassword" name="password" // name="password"
                            value={signUpData.password} onChange={handleSignUpChange} // Usa handler específico
                            required disabled={signUpLoading}
                            minLength={MIN_PASSWORD_LENGTH} // Validación HTML
                            autoComplete="new-password"
                        />
                    </div>
                    <div className="robot-container">
                        <img src={finAiMascot} alt="FinAi Mascot" className="robot-image" />
                        <button type="submit" className="btn btn-secondary" disabled={signUpLoading}>
                            {signUpLoading ? 'Registrando...' : 'Sign Up'}
                        </button>
                    </div>
                </form>
            </div>
        </div> {/* Fin panels-container */}
    </div> // Fin container
);
}

export default Login;


