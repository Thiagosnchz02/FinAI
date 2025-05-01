/*
Archivo: src/pages/ResetPasswordEmail.jsx
Propósito: Componente para la página donde el usuario solicita el enlace
           para restablecer su contraseña.
*/
import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom'; // Para el enlace de volver al login
import { supabase } from '../services/supabaseClient'; // Asegúrate que la ruta sea correcta

function ResetPasswordEmail() {
    // --- Estado del Componente ---
    const [email, setEmail] = useState(''); // Estado para el input de email
    const [message, setMessage] = useState(''); // Para mensajes de éxito/error
    const [messageType, setMessageType] = useState(''); // 'success' o 'error'
    const [isLoading, setIsLoading] = useState(false); // Estado de carga
    const [isSubmitted, setIsSubmitted] = useState(false); // Para deshabilitar botón tras éxito

    // --- Manejadores de Eventos ---
    const handleEmailChange = (event) => {
        setEmail(event.target.value);
        if (message) setMessage(''); // Limpiar mensaje al escribir
        if (isSubmitted) setIsSubmitted(false); // Permitir nuevo envío si cambia el email
    };

    const handleSubmit = useCallback(async (event) => {
        event.preventDefault();
        if (isLoading || isSubmitted) return; // Evitar doble submit

        setMessage('');
        setMessageType('');
        setIsLoading(true);

        if (!email.trim()) {
            setMessage('Por favor, introduce tu correo electrónico.');
            setMessageType('error');
            setIsLoading(false);
            return;
        }

        try {
            // --- Lógica Supabase ---
            // Construir la URL a la que Supabase redirigirá al usuario
            // DESPUÉS de hacer clic en el enlace del correo. Debe ser la ruta
            // donde se renderiza tu componente ResetPassword.jsx.
            const redirectURL = `${window.location.origin}/reset-password`; // Ajusta '/reset-password' si tu ruta es diferente

            console.log(`Solicitando restablecimiento para: ${email} con redirección a: ${redirectURL}`);

            const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                redirectTo: redirectURL,
            });

            if (error) {
                // Manejar errores comunes
                if (error.message.includes("Unable to validate email address")) {
                     setMessage('El formato del correo electrónico no es válido.');
                } else if (error.message.includes("For security purposes, you can only request this once every")) {
                     setMessage('Ya has solicitado un restablecimiento recientemente. Espera un minuto antes de intentarlo de nuevo.');
                }
                 // Nota: Supabase (por seguridad) generalmente no confirma si un email existe o no al solicitar reset.
                 // Devuelve éxito aunque el email no esté registrado.
                else {
                    throw error; // Re-lanzar otros errores
                }
                 setMessageType('error');

            } else {
                // Éxito (Supabase envió el correo, o lo haría si el email existiera)
                console.log('Solicitud de restablecimiento enviada (o simulada por Supabase):', data);
                setMessage('Si tu correo está registrado, recibirás un enlace de restablecimiento. Revisa tu bandeja de entrada (y la carpeta de spam).');
                setMessageType('success');
                setEmail(''); // Opcional: limpiar input tras éxito
                setIsSubmitted(true); // Marcar como enviado para deshabilitar botón
            }

        } catch (error) {
            console.error('Error al solicitar restablecimiento:', error);
             // Mostrar mensaje genérico si no se manejó antes
            if (!message) {
                setMessage(error.message || 'Error al enviar el enlace. Verifica el correo e inténtalo de nuevo.');
                setMessageType('error');
            }
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, isSubmitted, email]); // Dependencias del useCallback

    // --- Renderizado ---
    return (
        // Usa un contenedor adecuado, ej. el mismo que Login o ResetPassword
        <div className="background-container">
            <div className="forgot-container"> {/* Asegúrate que esta clase exista y estilice */}
                <h1>¿Olvidaste tu contraseña?</h1>
                <p className="instructions">
                    Introduce tu dirección de correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
                </p>

                <form id="forgot-password-form" onSubmit={handleSubmit}>
                    <div className="input-group"> {/* Reusa estilos si es posible */}
                        <label htmlFor="email">Correo Electrónico</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            placeholder="tu@email.com"
                            value={email}
                            onChange={handleEmailChange}
                            required
                            disabled={isLoading || isSubmitted} // Deshabilitar si carga o ya se envió
                        />
                    </div>

                    <button
                        type="submit"
                        id="send-link-button"
                        disabled={isLoading || isSubmitted || !email.trim()} // Deshabilitar si carga, enviado o email vacío
                    >
                        {isLoading ? 'Enviando...' : 'Enviar Enlace'}
                    </button>
                </form>

                {message && (
                    <p
                        id="message"
                        className={`message ${messageType === 'error' ? 'error-message' : 'success-message'}`}
                    >
                        {message}
                    </p>
                )}

                <div className="back-to-login">
                    <Link to="/login">Volver a Iniciar Sesión</Link>
                </div>
            </div>
        </div>
    );
}

export default ResetPasswordEmail;
