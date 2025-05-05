/*
Archivo: src/pages/ChangePassword.jsx
Propósito: Componente para la página donde el usuario puede cambiar su contraseña,
          incluyendo validaciones y llamada a Supabase.
*/
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext.jsx'; // Importar useAuth
import toast from 'react-hot-toast'; // Importar toast

function ChangePassword() {
  const { user } = useAuth(); // Obtener usuario del contexto
  // --- Estado del Componente ---
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  // --- Manejadores de Eventos ---
  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value,
    }));
    // Ya no necesitamos limpiar mensaje aquí
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    // --- Verificación de Sesión ---
    if (!user) {
      toast.error("Error: No hay sesión activa. Por favor, inicia sesión de nuevo.");
      navigate('/login');
      return;
    }

    // --- Validación Frontend ---
    // Ya no validamos currentPassword
    if (!formData.newPassword || !formData.confirmPassword) {
      toast.error('Debes introducir y confirmar la nueva contraseña.');
      return;
    }
    if (formData.newPassword.length < 8) { // Considera usar una constante MIN_PASSWORD_LENGTH
      toast.error('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Las nuevas contraseñas no coinciden.');
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading('Actualizando contraseña...'); // Toast de carga

    try {
      // --- Llamada a Supabase ---
      const { data, error } = await supabase.auth.updateUser({
        password: formData.newPassword
      });

      if (error) {
        // Manejar errores específicos de Supabase
        console.error('Error Supabase al actualizar contraseña:', error);
        let userMessage = `Error al actualizar: ${error.message}`; // Mensaje por defecto
        if (error.message.includes('requires recent login') || error.message.includes('identity constrained')) {
            userMessage = 'Error: Necesitas haber iniciado sesión recientemente. Sal y vuelve a entrar.';
        } else if (error.message.includes('same as the old password')) {
            userMessage = 'La nueva contraseña no puede ser igual a la actual.';
        } else if (error.message.includes('weak password')) {
            userMessage = 'La nueva contraseña es demasiado débil.';
        }
        toast.error(userMessage, { id: toastId }); // Actualiza el toast de carga con el error
      } else {
        console.log("Contraseña actualizada con éxito:", data);
        setFormData({ newPassword: '', confirmPassword: '' }); // Limpiar formulario
        toast.success('¡Contraseña actualizada con éxito!', { id: toastId }); // Actualiza toast de carga
        navigate('/settings'); // Redirigir inmediatamente
      }

    } catch (generalError) {
      console.error('Error general en handleSubmit:', generalError);
      toast.error('Ocurrió un error inesperado.', { id: toastId });
    } finally {
      setIsLoading(false); // Quitar estado de carga general
    }
  };

  const handleBack = () => {
    navigate('/settings');
  };

  // --- Renderizado ---
  return (
    <div className="page-container"> {/* Asume que tienes esta clase o ajusta */}
      <div className="page-header simple-header">
        <button onClick={handleBack} className="btn-icon" aria-label="Volver">
          <i className="fas fa-arrow-left"></i>
        </button>
        <h1>Cambiar Contraseña</h1>
        <div style={{ width: '40px' }}></div> {/* Spacer */}
      </div>

      <div className="change-password-container"> {/* Contenedor específico */}
        <form id="changePasswordForm" onSubmit={handleSubmit}>

          {/* Campo Contraseña Actual Eliminado */}
          {/*
          Si prefieres mantenerlo por UX tradicional (aunque no se use en la API):
          <div className="input-group">
            <label htmlFor="currentPassword">Contraseña Actual</label>
            <input type="password" id="currentPassword" name="currentPassword" ... />
          </div>
          Y recuerda añadirlo de nuevo al estado inicial y a la validación.
          */}

          <div className="input-group">
            <label htmlFor="newPassword">Nueva Contraseña</label>
            <input
              type="password" id="newPassword" name="newPassword"
              value={formData.newPassword} onChange={handleInputChange}
              required autoComplete="new-password" disabled={isLoading}
            />
            <small>Mínimo 8 caracteres.</small>
          </div>

          <div className="input-group">
            <label htmlFor="confirmPassword">Confirmar Nueva Contraseña</label>
            <input
              type="password" id="confirmPassword" name="confirmPassword"
              value={formData.confirmPassword} onChange={handleInputChange}
              required autoComplete="new-password" disabled={isLoading}
            />
          </div>

          {/* El feedback ahora se maneja con toasts, no con el párrafo <p id="message"> */}

          <button type="submit" id="updatePasswordButton" className="btn btn-primary btn-full-width" disabled={isLoading}>
            {isLoading ? 'Actualizando...' : 'Actualizar Contraseña'}
          </button>

        </form>
        <Link to="/settings" className="back-link" style={{display: 'block', textAlign: 'center', marginTop: '20px'}}>Volver a Configuración</Link>
      </div>
    </div>
  );
}

export default ChangePassword;

