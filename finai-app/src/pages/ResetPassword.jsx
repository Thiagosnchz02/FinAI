/*
Archivo: src/pages/ResetPassword.jsx
Propósito: Componente para la página donde el usuario introduce su nueva
           contraseña después de hacer clic en el enlace de restablecimiento.
*/
import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient'; // Asegúrate que la ruta sea correcta
import toast from 'react-hot-toast'; // Importar toast


const MIN_PASSWORD_LENGTH = 8;

function ResetPassword() {
  // --- Estado ---
  const [formData, setFormData] = useState({
      newPassword: '',
      confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordUpdated, setIsPasswordUpdated] = useState(false); // Para bloquear form post-éxito

  const navigate = useNavigate();

  // Usamos useCallback aunque el impacto sea mínimo, por consistencia
  const handleInputChange = useCallback((event) => {
      const { name, value } = event.target;
      setFormData(prevData => ({
          ...prevData,
          [name]: value,
      }));
  }, []);

  // Envolver en useCallback
  const handleSubmit = useCallback(async (event) => {
    event.preventDefault();
    if (isLoading || isPasswordUpdated) return;

    // Validación Frontend
    if (!formData.newPassword || !formData.confirmPassword) {
        toast.error('Debes introducir y confirmar la nueva contraseña.');
        return;
    }
    if (formData.newPassword.length < MIN_PASSWORD_LENGTH) {
        toast.error(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
        return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
        toast.error('Las nuevas contraseñas no coinciden.');
        return;
    }

    setIsLoading(true);
    const toastId = toast.loading('Restableciendo contraseña...');

    try {
        // Llamar a updateUser (Supabase maneja la sesión temporal del link)
        const { error } = await supabase.auth.updateUser({
            password: formData.newPassword
        });

        if (error) {
            // Manejar errores comunes de Supabase con toasts
            console.error('Error Supabase al actualizar contraseña:', error);
            let userMessage = `Error al actualizar: ${error.message}`;
            if (error.message.includes("Password should be at least")) {
                 userMessage = `La contraseña es demasiado corta (mínimo ${MIN_PASSWORD_LENGTH}).`;
            } else if (error.message.includes("same as the old password")) {
                userMessage = 'La nueva contraseña no puede ser igual a la anterior.';
            } else if (error.message.includes("Auth session missing")) {
                 userMessage = 'Sesión inválida/expirada. Solicita restablecer de nuevo.';
            }
            toast.error(userMessage, { id: toastId });
        } else {
            // Éxito
            console.log('Contraseña actualizada con éxito.');
            setFormData({ newPassword: '', confirmPassword: '' });
            setIsPasswordUpdated(true); // Bloquear formulario
            toast.success('¡Contraseña actualizada! Redirigiendo al login...', { id: toastId });
            navigate('/login'); // Redirigir inmediatamente
        }

    } catch (error) { // Captura otros errores
        console.error('Error al actualizar contraseña:', error);
        toast.error(error.message || 'Error al actualizar la contraseña.', { id: toastId });
    } finally {
        // Siempre quitar el loading al finalizar (excepto si ya se actualizó y bloqueó)
         if (!isPasswordUpdated) {
             setIsLoading(false);
         }
    }
}, [isLoading, isPasswordUpdated, formData, navigate, supabase]); // Dependencias

// Volver a login (más claro que a /settings si vienes de reset)
const handleBack = () => navigate('/login'); // Volver siempre a login

  // --- Renderizado ---
  return (
    <div className="background-container">
        <div className="reset-container">
            <h1>Restablecer Contraseña</h1>
            <p>Introduce y confirma una nueva contraseña para tu cuenta.</p>

            <form id="reset-password-form" onSubmit={handleSubmit}>
                <div className="input-wrapper">
                    <span className="input-icon lock-icon" role="img" aria-label="lock">🔑</span>
                    <input
                        type="password" id="new-password" name="newPassword"
                        placeholder={`Nueva contraseña (mín. ${MIN_PASSWORD_LENGTH} caracteres)`}
                        value={formData.newPassword} onChange={handleInputChange}
                        required minLength={MIN_PASSWORD_LENGTH}
                        disabled={isLoading || isPasswordUpdated}
                        autoComplete="new-password"
                    />
                </div>

                <div className="input-wrapper">
                    <span className="input-icon lock-icon" role="img" aria-label="lock-confirm">🔑</span>
                    <input
                        type="password" id="confirm-password" name="confirmPassword"
                        placeholder="Confirma la nueva contraseña"
                        value={formData.confirmPassword} onChange={handleInputChange}
                        required minLength={MIN_PASSWORD_LENGTH}
                        disabled={isLoading || isPasswordUpdated}
                        autoComplete="new-password"
                    />
                </div>

                <button
                    type="submit" id="reset-button"
                    disabled={isLoading || isPasswordUpdated || formData.newPassword.length < MIN_PASSWORD_LENGTH || !formData.confirmPassword}
                >
                    {isLoading ? 'Restableciendo...' : 'Restablecer Contraseña'}
                </button>
            </form>

            {/* Feedback con toasts */}

            {/* Enlace Volver */}
            <button onClick={handleBack} className="back-link" style={{marginTop: '15px', background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', textDecoration: 'underline'}}>
                Volver al Login
            </button>
            {/* O si prefieres usar Link: */}
            {/* <Link to="/login" className="return-link" style={{marginTop: '15px'}}>Volver al Login</Link> */}
        </div>
    </div>
);
}

export default ResetPassword;