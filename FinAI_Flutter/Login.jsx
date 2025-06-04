/*
Archivo: src/pages/Login.jsx
Propósito: Componente para la página de inicio de sesión y registro,
          incluyendo la lógica de manejo de formularios y llamadas a Supabase.
*/
import React, { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext.jsx';
import '../styles/Login.scss';
import toast from 'react-hot-toast'; // Importar toast
import PhoneInput, { isValidPhoneNumber, formatPhoneNumber } from 'react-phone-number-input'; // Importar PhoneInput y isValidPhoneNumber
import 'react-phone-number-input/style.css';

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
   // --- NUEVOS ESTADOS PARA LOGIN POR TELÉFONO ---
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false); // Para mostrar el campo OTP
    const [phoneLoading, setPhoneLoading] = useState(false); // Loading para el flujo de teléfono
    const [showPhoneLogin, setShowPhoneLogin] = useState(false);
    const [activeLoginMethod, setActiveLoginMethod] = useState('email'); 


  const navigate = useNavigate(); // Hook para la redirección
  const { user, loading: authLoading, signIn, signUp, signInWithGoogle } = useAuth();

  useEffect(() => {
        // Si la carga global de AuthContext ha terminado Y hay un usuario,
        // y estamos en la página de login, redirigir al dashboard.
        if (!authLoading && user) {
            console.log("[Login.jsx] useEffect: Usuario autenticado y carga finalizada. Redirigiendo a /dashboard.");
            navigate('/dashboard', { replace: true });
        }
    }, [user, authLoading, navigate]);

  // --- Handlers Cambio Inputs ---
  const handleSignInChange = useCallback((event) => {
    const { name, value } = event.target;
    setSignInData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSignUpChange = useCallback((event) => {
      const { name, value } = event.target;
      setSignUpData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSignUpPhoneChange = useCallback((value) => {
    console.log("[Login.jsx - SignUp] PhoneInput value:", value);
        setSignUpData(prev => ({ ...prev, phoneNumber: value || '' }));
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
        if (!signUpData.name.trim() || !signUpData.email.trim() || !signUpData.password) {
            toast.error('Nombre, Email y Contraseña son obligatorios.'); 
            return;
        }
        if (signUpData.password.length < MIN_PASSWORD_LENGTH) {
            toast.error(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`); 
            return;
        }
        // El teléfono es obligatorio en el formulario de Sign Up
        if (!signUpData.phoneNumber || !isValidPhoneNumber(signUpData.phoneNumber)) {
            toast.error('El número de teléfono introducido no es válido o está vacío.'); 
            return;
        }

        const normalizedPhoneForStorage = formatPhoneNumber(signUpData.phoneNumber, 'E.164');
        // --------------------------------------------------------------------------

        if (!normalizedPhoneForStorage) {
            toast.error('No se pudo normalizar el número de teléfono. Inténtalo de nuevo.');
            return;
        }

        setSignUpLoading(true);
        const toastId = toast.loading('Registrando usuario...');

        try {
            console.log('[Login.jsx] Paso A: Intentando signUp solo con email, password y nombre...');
            const { data: signUpResponse, error: signUpError } = await signUp(
                signUpData.email.trim(), 
                signUpData.password, 
                { data: { full_name: signUpData.name.trim() } }
            );
            
            if (signUpError) throw signUpError; // Si esto falla, es probable que sea el trigger handle_new_user
                                             // por un NOT NULL en email o full_name en profiles.

            if (signUpResponse?.user) {
                console.log('[Login.jsx] Paso A: SignUp exitoso para:', signUpResponse.user.email, "ID:", signUpResponse.user.id);
                
                // Guardar el teléfono (ya validado y en E.164) y el ID del usuario para la verificación posterior
                try {
                    localStorage.setItem('pendingUserIdForPhoneVerification', signUpResponse.user.id);
                    localStorage.setItem('pendingPhoneToVerify', normalizedPhoneForStorage); // Guardar el E.164
                    console.log('[Login.jsx] Teléfono pendiente guardado en localStorage:', normalizedPhoneForStorage);
                } catch (e) {
                    console.error("Error guardando teléfono pendiente en localStorage:", e);
                    toast.warn("Cuenta creada, pero hubo un problema al preparar la verificación del teléfono. Podrás intentarlo desde tu perfil.");
                }
                
                if (signUpResponse.session === null) { 
                    toast.success('¡Registro casi listo! Revisa tu email para confirmar.', { id: toastId, duration: 6000 });
                } else { 
                    toast.success('¡Registro exitoso! Por favor, inicia sesión.', { id: toastId });
                }
                setSignUpData({ name: '', email: '', password: '', phoneNumber: '' });
            } else {
                throw new Error("No se pudo obtener la información del usuario después del registro.");
            }
        } catch (error) { // Captura errores del signUp inicial o del updateUser
            console.error('Error general en handleSignUpSubmit:', error);
            toast.error(`Error al registrar: ${error.message}`, { id: toastId });
        } finally {
            setSignUpLoading(false);
        }
    }, [signUpData, signUp, navigate]);

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

  const handlePhoneNumberChange = useCallback((value) => {
        setPhoneNumber(value || '');
    }, []);

    const handleOtpChange = useCallback((event) => {
        setOtp(event.target.value);
    }, []);

    const handleSendOtp = useCallback(async (event) => {
        event.preventDefault();
        if (!phoneNumber || !isValidPhoneNumber(phoneNumber)) {
            toast.error('Por favor, introduce un número de teléfono válido.');
            return;
        }
        setPhoneLoading(true);
        const toastId = toast.loading('Verificando número y enviando código...');
        try {
            const { data: responseData, error: invokeError } = await supabase.functions.invoke('request_phone_login_otp', {
                body: { phoneNumber: phoneNumber },
            });

            if (invokeError) { // Error en la invocación misma (red, función no encontrada 500, etc.)
                console.error('Error invocando Edge Function request_phone_login_otp:', invokeError);
                let userFriendlyMessage = 'Error del servidor al solicitar OTP. Inténtalo más tarde.';

                // Intentar obtener el mensaje específico si la Edge Function devolvió un JSON con 'error'
                // invokeError.context puede contener la respuesta original si es un FunctionsHttpError
                if (invokeError.context && typeof invokeError.context.json === 'function') {
                    try {
                        // Clonar la respuesta para poder leerla varias veces si fuera necesario
                        const errorJson = await invokeError.context.clone().json();
                        if (errorJson && errorJson.error) {
                            userFriendlyMessage = errorJson.error;
                        } else if (invokeError.message.includes("Function not found")){
                            userFriendlyMessage = "Servicio de inicio de sesión por teléfono no disponible actualmente.";
                        }
                    } catch (e) {
                        console.warn("No se pudo parsear el cuerpo del error de la Edge Function como JSON:", e);
                        // Mantener el mensaje genérico o el mensaje de invokeError
                        if (invokeError.message) {
                            userFriendlyMessage = invokeError.message;
                        }
                    }
                } else if (invokeError.message) { // Usar el mensaje de error de la invocación si no hay contexto JSON
                     userFriendlyMessage = invokeError.message;
                }
                
                throw new Error(userFriendlyMessage); // Lanzar el error con el mensaje amigable
            }

            // Si invokeError no existe, la función se llamó (status 2xx),
            // pero la lógica interna de la función podría haber devuelto un error en 'data'
            if (responseData?.error) { 
                console.error('Error lógico desde la Edge Function:', responseData.error);
                throw new Error(responseData.error);
            }
            
            // Éxito
            toast.success(responseData?.message || 'Código OTP enviado. Revisa tus mensajes.', { id: toastId });
            setOtpSent(true);
            console.log('Respuesta de la Edge Function request_phone_login_otp:', responseData);

        } catch (errorCaught) {
            console.error('Error final en handleSendOtp:', errorCaught);
            let displayMessage = 'Error al solicitar OTP. Inténtalo de nuevo.'; // Mensaje por defecto
            if (errorCaught && errorCaught.message) {
                // Específicos primero
                if (errorCaught.message.includes('Este número de teléfono no está registrado')) { // Mensaje de tu Edge Function 404
                    displayMessage = 'Este número de teléfono no está registrado. Por favor, regístrate primero.';
                } else if (errorCaught.message.toLowerCase().includes('signups not allowed for otp') || 
                        errorCaught.message.toLowerCase().includes('user not found')) { // Mensajes comunes de Supabase/GoTrue
                    displayMessage = 'Este número de teléfono no está registrado o no se pudo procesar. Verifica el número o regístrate.';
                } else if (errorCaught.message.toLowerCase().includes('rate limit exceeded')) {
                    displayMessage = 'Demasiados intentos. Por favor, espera un momento.';
                }
                // ... otros mensajes específicos que identifiques de otpErr.message
                else {
                    displayMessage = errorCaught.message; // Usar el mensaje del error si no es uno de los conocidos
                }
            }
            toast.error(displayMessage, { id: toastId });
            setOtpSent(false);
        } finally {
            setPhoneLoading(false);
        }
    }, [phoneNumber, supabase, setOtpSent, setPhoneLoading]);

    const handleVerifyOtp = useCallback(async (event) => {
        event.preventDefault();
        if (!phoneNumber || !otp) {
            toast.error('Por favor, introduce el código OTP.');
            return;
        }
        setPhoneLoading(true);
        const toastId = toast.loading('Verificando código...');
        try {
            const { data, error } = await supabase.auth.verifyOtp({
                phone: phoneNumber,
                token: otp,
                type: 'sms', // o 'phone_change' si fuera para cambiar número
            });

            if (error) throw error;

            // El listener onAuthStateChange en AuthContext se encargará de
            // actualizar el usuario y la sesión, y de la redirección.
            console.log('Usuario verificado con OTP:', data.user);
            toast.success('¡Inicio de sesión exitoso!', { id: toastId });
            // navigate('/dashboard'); // AuthContext debería manejar la redirección
        } catch (error) {
            console.error('Error verificando OTP:', error);
            toast.error(`Error al verificar OTP: ${error.message || 'Código incorrecto.'}`, { id: toastId });
        } finally {
            setPhoneLoading(false);
        }
    }, [phoneNumber, otp, supabase, navigate]);

  // --- Renderizado del Componente ---
  return (
    <div className="container">
        <h1 className="main-title">FinAi</h1>
        {/* Mensajes ahora con Toast */}

        <div className="panels-container">
            {/* --- Panel Sign In --- */}
            <div className={`panel sign-in-panel ${showPhoneLogin ? 'hidden-panel' : ''}`}>
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
                    <button type="button" className="btn btn-link switch-to-phone" onClick={() => { setShowPhoneLogin(true); setOtpSent(false); setPhoneNumber(''); setOtp('');}}>
                            <i className="fas fa-mobile-alt"></i> Iniciar sesión con Teléfono
                    </button>
                </form>
            </div>

            <div className={`panel phone-login-panel ${showPhoneLogin ? '' : 'hidden-panel'}`}>
                    <h2>Iniciar Sesión con Teléfono</h2>
                    {!otpSent ? (
                        <form id="phoneSendOtpForm" onSubmit={handleSendOtp}>
                            <div className="input-group">
                                <label htmlFor="phoneNumber">Número de Teléfono</label>
                                <PhoneInput
                                    id="phoneNumber"
                                    placeholder="Introduce tu número de teléfono"
                                    value={phoneNumber}
                                    onChange={handlePhoneNumberChange}
                                    defaultCountry="ES" // O el país por defecto que prefieras
                                    international
                                    countryCallingCodeEditable={false} // Para simplificar
                                    disabled={phoneLoading}
                                    className="phone-input-container-login" // Clase para estilos específicos
                                />
                                <small>Recibirás un código SMS para verificar.</small>
                            </div>
                            <button type="submit" className="btn btn-primary full-width-btn" disabled={phoneLoading || !isValidPhoneNumber(phoneNumber || '')}>
                                {phoneLoading ? 'Enviando...' : 'Enviar Código'}
                            </button>
                        </form>
                    ) : (
                        <form id="phoneVerifyOtpForm" onSubmit={handleVerifyOtp}>
                            <p className="otp-sent-info">Se ha enviado un código a <strong>{phoneNumber}</strong>. Por favor, introdúcelo abajo.</p>
                            <div className="input-group">
                                <label htmlFor="otpCode">Código OTP</label>
                                <input
                                    type="text" // Puede ser "number" pero text es más flexible para 6 dígitos
                                    id="otpCode"
                                    name="otp"
                                    value={otp}
                                    onChange={handleOtpChange}
                                    required
                                    minLength={6}
                                    maxLength={6}
                                    autoComplete="one-time-code"
                                    placeholder="------"
                                    disabled={phoneLoading}
                                />
                            </div>
                            <button type="submit" className="btn btn-primary full-width-btn" disabled={phoneLoading || otp.length < 6}>
                                {phoneLoading ? 'Verificando...' : 'Verificar e Iniciar Sesión'}
                            </button>
                            <button type="button" className="btn btn-link" onClick={() => { setOtpSent(false); setOtp(''); }} disabled={phoneLoading}>
                                Reenviar código o cambiar número
                            </button>
                        </form>
                    )}
                    <button type="button" className="btn btn-link switch-to-email" onClick={() => setShowPhoneLogin(false)}>
                       <i className="fas fa-envelope"></i> Iniciar sesión con Email
                    </button>
                </div>

            {/* --- Panel Sign Up --- */}
            <div className={`panel sign-up-panel ${showPhoneLogin ? 'hidden-panel' : ''}`}>
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
                                <label htmlFor="signUpPhoneNumber">Número de Teléfono</label>
                                <PhoneInput
                                    id="signUpPhoneNumber"
                                    placeholder="Introduce tu número de teléfono"
                                    value={signUpData.phoneNumber}
                                    onChange={handleSignUpPhoneChange}
                                    defaultCountry="ES"
                                    international={true}
                                    countryCallingCodeEditable={false}
                                    required disabled={signUpLoading}
                                    className="phone-input-container-login"
                                />
                                <small>Podrás iniciar sesión con él más tarde y se usará para el agente de IA personal.</small>
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


