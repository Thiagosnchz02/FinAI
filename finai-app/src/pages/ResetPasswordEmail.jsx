/*
Archivo: src/pages/ResetPasswordEmail.jsx
Propósito: Componente para la página donde el usuario solicita el enlace
           para restablecer su contraseña.
*/
import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom'; // Para el enlace de volver al login
import { supabase } from '../services/supabaseClient'; // Asegúrate que la ruta sea correcta
import toast from 'react-hot-toast'; // Importar toast

function ResetPasswordEmail() {
    // --- Estado del Componente ---
    const [email, setEmail] = useState(''); // Estado para el input de email
    const [isLoading, setIsLoading] = useState(false); // Estado de carga
    const [isSubmitted, setIsSubmitted] = useState(false); // Para deshabilitar botón tras éxito

    // --- Manejadores de Eventos ---
    const handleEmailChange = (event) => {
      setEmail(event.target.value);
      // Ya no necesitamos limpiar 'message'
      if (isSubmitted) setIsSubmitted(false); // Permitir nuevo envío si cambia email
    };

    const handleSubmit = useCallback(async (event) => {
      event.preventDefault();
      if (isLoading || isSubmitted) return;

      const trimmedEmail = email.trim(); // Usar email sin espacios extra

      // Validación Frontend (vacío y formato)
      if (!trimmedEmail) {
          toast.error('Por favor, introduce tu correo electrónico.');
          return;
      }
      // Validación Regex simple para formato
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
          toast.error('Introduce un formato de correo válido.');
          return;
      }

      setIsLoading(true);
      // Usar toast para indicar carga
      const toastId = toast.loading('Enviando enlace...');

      try {
          // --- Lógica Supabase ---
          const redirectURL = `${window.location.origin}/reset-password`;
          console.log(`Solicitando restablecimiento para: ${trimmedEmail} a: ${redirectURL}`);

          const { data, error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
              redirectTo: redirectURL,
          });

          if (error) {
              // Manejar errores comunes con toast
              console.error('Error Supabase al solicitar restablecimiento:', error);
              let userMessage = `Error: ${error.message}`; // Mensaje por defecto
              if (error.message.includes("Unable to validate email address")) {
                   // Este error es menos probable que ocurra ahora con la validación regex frontend
                   userMessage = 'El formato del correo electrónico no es válido.';
              } else if (error.message.includes("For security purposes, you can only request this once every")) {
                   userMessage = 'Ya has solicitado un restablecimiento recientemente. Espera un minuto.';
              }
              toast.error(userMessage, { id: toastId });

          } else {
              // Éxito
              console.log('Solicitud de restablecimiento enviada (o simulada):', data);
              toast.success('Si tu correo está registrado, recibirás un enlace. Revisa tu bandeja de entrada y spam.', { id: toastId, duration: 6000 });
              setEmail('');
              setIsSubmitted(true);
          }

      } catch (error) { // Captura otros errores
          console.error('Error al solicitar restablecimiento:', error);
          toast.error(error.message || 'Error al enviar el enlace.', { id: toastId });
      } finally {
          // Quitar loading independientemente del resultado
          // (El botón ya está deshabilitado por isSubmitted si hay éxito)
          setIsLoading(false);
      }
  // Añadir supabase a las dependencias
  }, [isLoading, isSubmitted, email, supabase]);

    // --- Renderizado ---
    return (
      <div className="background-container">
          <div className="forgot-container">
              <h1>¿Olvidaste tu contraseña?</h1>
              <p className="instructions">
                  Introduce tu dirección de correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
              </p>

              <form id="forgot-password-form" onSubmit={handleSubmit}>
                  <div className="input-group">
                      <label htmlFor="email">Correo Electrónico</label>
                      <input
                          type="email"
                          id="email"
                          name="email" // Necesario para handleEmailChange si hubiera más campos
                          placeholder="tu@email.com"
                          value={email}
                          onChange={handleEmailChange}
                          required
                          disabled={isLoading || isSubmitted}
                      />
                  </div>

                  <button
                      type="submit"
                      id="send-link-button"
                      disabled={isLoading || isSubmitted || !email.trim()}
                  >
                      {isLoading ? 'Enviando...' : 'Enviar Enlace'}
                  </button>
              </form>

              {/* Mensajes ahora manejados por toast */}

              <div className="back-to-login">
                  <Link to="/login">Volver a Iniciar Sesión</Link>
              </div>
          </div>
      </div>
  );
}

export default ResetPasswordEmail;
