/*
Archivo: src/pages/ChangePassword.jsx
Propósito: Componente para la página donde el usuario puede cambiar su contraseña,
          incluyendo validaciones y llamada a Supabase.
*/
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient'; // Importa cliente Supabase

function ChangePassword() {
  // --- Estado del Componente ---
  const [formData, setFormData] = useState({
    currentPassword: '', // Lo mantenemos en el estado aunque Supabase no lo use directamente en updateUser
    newPassword: '',
    confirmPassword: '',
  });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' o 'error'
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  // --- Manejadores de Eventos ---
  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value,
    }));
    if (message) setMessage(''); // Limpiar mensaje al escribir
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setMessageType('');

    // --- Validación Frontend ---
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setMessage('Todos los campos son obligatorios.');
      setMessageType('error');
      return;
    }
    if (formData.newPassword.length < 8) {
      setMessage('La nueva contraseña debe tener al menos 8 caracteres.');
      setMessageType('error');
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setMessage('Las nuevas contraseñas no coinciden.');
      setMessageType('error');
      return;
    }
    // Opcional: Comprobar si la nueva es igual a la actual (solo si guardáramos la actual en estado, lo cual no es seguro)
    // if (formData.newPassword === formData.currentPassword) {
    //   setMessage('La nueva contraseña no puede ser igual a la actual.');
    //   setMessageType('error');
    //   return;
    // }

    setIsLoading(true);
    console.log('Intentando actualizar contraseña...');

    try {
      // --- Llamada a Supabase ---
      // updateUser actualiza la contraseña del usuario autenticado actualmente.
      // No necesita la contraseña actual como parámetro por seguridad,
      // pero puede fallar si la sesión no es reciente (requiere re-autenticación).
      const { data, error } = await supabase.auth.updateUser({
        password: formData.newPassword
      });

      if (error) {
        // Manejar errores específicos de Supabase
        console.error('Error Supabase al actualizar contraseña:', error);
        if (error.message.includes('requires recent login') || error.message.includes('identity constrained')) {
            setMessage('Por seguridad, necesitas haber iniciado sesión recientemente. Cierra sesión y vuelve a entrar.');
        } else if (error.message.includes('same as the old password')) {
            setMessage('La nueva contraseña no puede ser igual a la actual.');
        } else if (error.message.includes('weak password')) {
            setMessage('La nueva contraseña es demasiado débil. Intenta una más compleja.');
        } else {
            setMessage(`Error al actualizar: ${error.message}`);
        }
        setMessageType('error');
      } else {
        console.log("Contraseña actualizada con éxito:", data);
        setMessage('¡Contraseña actualizada con éxito! Redirigiendo a Configuración...');
        setMessageType('success');
        setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' }); // Limpiar formulario

        // Redirigir a Configuración después de unos segundos
        setTimeout(() => {
          navigate('/settings'); // Usar navigate
        }, 2500); // 2.5 segundos
      }

    } catch (generalError) {
      // Error inesperado no de Supabase API
      console.error('Error general en handleSubmit:', generalError);
      setMessage('Ocurrió un error inesperado. Inténtalo de nuevo.');
      setMessageType('error');
    } finally {
      // Solo quitar loading si no hubo éxito (porque si hay éxito, redirige)
       if (messageType !== 'success') { // Comprobar el tipo de mensaje ANTES de que se actualice el estado
           setIsLoading(false);
       }
       // O, si no queremos esperar al timeout para quitar el loading en caso de éxito:
       // setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/settings'); // Volver explícitamente a settings
  };

  // --- Renderizado ---
  return (
    <div className="page-container"> {/* Ajustar clase si es necesario */}
      <div className="page-header simple-header">
        <button onClick={handleBack} className="btn-icon" aria-label="Volver">
          <i className="fas fa-arrow-left"></i>
        </button>
        <h1>Cambiar Contraseña</h1>
        <div style={{ width: '40px' }}></div>
      </div>

      <div className="change-password-container">
        <form id="changePasswordForm" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="currentPassword">Contraseña Actual</label>
            <input
              type="password"
              id="currentPassword"
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleInputChange}
              required
              autoComplete="current-password"
              disabled={isLoading}
            />
          </div>

          <div className="input-group">
            <label htmlFor="newPassword">Nueva Contraseña</label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleInputChange}
              required
              autoComplete="new-password"
              disabled={isLoading}
            />
            <small>Mínimo 8 caracteres.</small>
          </div>

          <div className="input-group">
            <label htmlFor="confirmPassword">Confirmar Nueva Contraseña</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              required
              autoComplete="new-password"
              disabled={isLoading}
            />
          </div>

          {message && (
            <p
              id="message"
              className={`message ${messageType === 'error' ? 'error-message' : messageType === 'success' ? 'success-message' : ''}`}
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            id="updatePasswordButton"
            className="btn btn-primary btn-full-width"
            disabled={isLoading}
          >
            {isLoading ? 'Actualizando...' : 'Actualizar Contraseña'}
          </button>

        </form>
        <Link to="/settings" className="back-link">Volver a Configuración</Link>
      </div>
    </div>
  );
}


export default ChangePassword;

