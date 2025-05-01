/*
Archivo: src/pages/ResetPassword.jsx
Propósito: Componente para la página donde el usuario introduce su nueva
           contraseña después de hacer clic en el enlace de restablecimiento.
*/
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient'; // Asegúrate que la ruta sea correcta

function ResetPassword() {
    // --- Estado del Componente ---
    const [newPassword, setNewPassword] = useState('');
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState(''); // 'success' o 'error'
    const [isLoading, setIsLoading] = useState(false);
    const [isPasswordUpdated, setIsPasswordUpdated] = useState(false); // Para evitar doble submit y controlar UI

    const navigate = useNavigate();

    // --- Efectos ---
    useEffect(() => {
        // No es necesario manejar el token aquí directamente.
        // Se asume que un listener global onAuthStateChange ya ha procesado
        // el token de recuperación de la URL (#access_token=...) y ha establecido
        // una sesión temporal cuando el usuario llega a esta página.
        console.log("Componente ResetPassword montado. Listo para actualizar contraseña.");

        // Opcional: Comprobar si hay un error explícito en la URL (menos común con Supabase V2)
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const errorDescription = params.get('error_description');
        if (errorDescription) {
            setMessage(`Error: ${errorDescription}`);
            setMessageType('error');
            setIsPasswordUpdated(true); // Bloquear formulario si hay error inicial
        }

    }, []); // Solo al montar

    // --- Manejadores de Eventos ---
    const handlePasswordChange = (event) => {
        setNewPassword(event.target.value);
        if (message) setMessage(''); // Limpiar mensaje al escribir
    };

    const handleSubmit = useCallback(async (event) => {
        event.preventDefault();
        if (isLoading || isPasswordUpdated) return; // Evitar doble submit o si ya se actualizó/hubo error inicial

        setMessage('');
        setMessageType('');
        setIsLoading(true);

        // Validación básica de longitud
        if (newPassword.length < 8) { // Ajusta la longitud mínima según tus requisitos
            setMessage('La contraseña debe tener al menos 8 caracteres.');
            setMessageType('error');
            setIsLoading(false);
            return;
        }

        try {
            console.log('Intentando actualizar contraseña con supabase.auth.updateUser...');
            // Llamar a updateUser. Supabase utiliza la sesión activa
            // establecida por el listener onAuthStateChange al procesar el token.
            const { data, error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) {
                // Manejar errores comunes de Supabase
                if (error.message.includes("Password should be at least 6 characters")) {
                     setMessage('La contraseña es demasiado corta (mínimo 6 caracteres según Supabase).');
                } else if (error.message.includes("same as the old password")) {
                    setMessage('La nueva contraseña no puede ser igual a la anterior.');
                } else if (error.message.includes("Auth session missing")) {
                     setMessage('Sesión inválida o expirada. Solicita restablecer la contraseña de nuevo.');
                } else {
                    throw error; // Re-lanzar otros errores
                }
                setMessageType('error');
            } else {
                // Éxito
                console.log('Contraseña actualizada con éxito:', data);
                setMessage('¡Contraseña actualizada con éxito! Redirigiendo al login...');
                setMessageType('success');
                setNewPassword(''); // Limpiar input
                setIsPasswordUpdated(true); // Marcar como actualizada para bloquear formulario

                // Redirigir al login después de un tiempo
                setTimeout(() => {
                    navigate('/login'); // Usa tu ruta de login
                }, 3000); // 3 segundos de retraso
            }

        } catch (error) {
            console.error('Error al actualizar contraseña:', error);
            // Mostrar mensaje genérico o el mensaje de error específico si no se manejó antes
            if (!message) { // Solo si no se estableció un mensaje de error más específico arriba
                 setMessage(error.message || 'Error al actualizar la contraseña. Inténtalo de nuevo.');
                 setMessageType('error');
            }
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, isPasswordUpdated, newPassword, navigate, message]); // Añadir message a dependencias para evitar re-lanzar error

    // --- Renderizado ---
    return (
        <div className="background-container"> {/* Asegúrate que esta clase exista y centre el contenido */}
            <div className="reset-container"> {/* O usa la clase de 'Login.css' si es similar */}
                <h1>Restablecer Contraseña</h1>
                <p>Introduce una nueva contraseña para tu cuenta.</p>

                <form id="reset-password-form" onSubmit={handleSubmit}>
                    <div className="input-wrapper">
                        <span className="input-icon lock-icon" role="img" aria-label="lock">🔑</span> {/* Cambiado a llave */}
                        <input
                            type="password"
                            id="new-password"
                            placeholder="Nueva contraseña (mín. 8 caracteres)"
                            value={newPassword}
                            onChange={handlePasswordChange}
                            required
                            minLength="8" // Añadir validación HTML básica
                            disabled={isLoading || isPasswordUpdated} // Deshabilitar si carga o ya se actualizó
                        />
                    </div>

                    <button
                        type="submit"
                        id="reset-button"
                        disabled={isLoading || isPasswordUpdated || newPassword.length < 8} // Deshabilitar si carga, actualizado o contraseña corta
                    >
                        {isLoading ? 'Restableciendo...' : 'Restablecer Contraseña'}
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

                {/* Mostrar enlace a login solo si la contraseña ya se actualizó o hubo error inicial */}
                {(isPasswordUpdated || messageType === 'error') && (
                     <Link to="/login" className="return-link" style={{marginTop: '15px'}}>Volver al Login</Link>
                )}
            </div>
        </div>
    );
}

export default ResetPassword;
