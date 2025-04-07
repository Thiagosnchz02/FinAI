console.log('DEBUG: Reset_password_email.js - Cargado');

// --- Elementos del DOM ---
const forgotForm = document.getElementById('forgot-password-form');
const emailInput = document.getElementById('email');
const messageElement = document.getElementById('message');
const sendButton = document.getElementById('send-link-button');

// --- Lógica para enviar el enlace ---
forgotForm.addEventListener('submit', async (event) => {
    event.preventDefault(); // Evita recargar la página

    const email = emailInput.value.trim(); // Obtiene el email y quita espacios extra
    messageElement.textContent = ''; // Limpia mensajes anteriores
    messageElement.className = 'message'; // Resetea clases de estilo
    sendButton.disabled = true; // Deshabilita el botón

    if (!email) {
        messageElement.textContent = 'Por favor, introduce tu dirección de correo electrónico.';
        messageElement.classList.add('error');
        sendButton.disabled = false;
        return;
    }

    try {
        // ¡¡¡IMPORTANTE!!! Cambia la URL por la ruta EXACTA de tu página
        // donde el usuario establecerá la nueva contraseña
        // (la página visualmente similar a Reset_password_pixar.jpg)
        const resetUrl = window.location.origin + '/Reset_password.html'; // <--- CAMBIA ESTO

        console.log(`Enviando enlace de restablecimiento a: ${email} con redirección a: ${resetUrl}`);

        const { data, error } = await supabase.auth.resetPasswordForEmail(
            email,
            {
              redirectTo: resetUrl,
            }
        );

        if (error) {
            throw error; // Lanza el error para capturarlo abajo
        }

        // Éxito
        console.log('Solicitud de restablecimiento enviada:', data);
        messageElement.textContent = '¡Enlace enviado! Revisa tu bandeja de entrada (y la carpeta de spam) para restablecer tu contraseña.';
        messageElement.classList.add('success');
        emailInput.value = ''; // Opcional: limpiar el campo
        // Mantenemos el botón deshabilitado tras el éxito para evitar envíos múltiples

    } catch (error) {
        // Manejo de errores
        console.error('Error al enviar el enlace de restablecimiento:', error);
        messageElement.textContent = `Error: ${error.message || 'No se pudo enviar el enlace. Inténtalo de nuevo.'}`;
        // Podrías querer dar mensajes más específicos basados en el error.code
        // por ejemplo, si el email no existe (aunque Supabase por seguridad no siempre lo confirma)
        messageElement.classList.add('error');
        sendButton.disabled = false; // Rehabilita el botón si falla
    }
});