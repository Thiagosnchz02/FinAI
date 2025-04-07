// --- Elementos del DOM ---
const resetForm = document.getElementById('reset-password-form');
const newPasswordInput = document.getElementById('new-password');
const messageElement = document.getElementById('message');
const resetButton = document.getElementById('reset-button');

// --- Lógica de Restablecimiento ---

// **IMPORTANTE:** El flujo estándar de Supabase para restablecer contraseña
// normalmente implica manejar un evento 'PASSWORD_RECOVERY' después de que
// el usuario hace clic en un enlace de correo electrónico.
// El siguiente código asume que ya estás en el contexto correcto para
// llamar a `updateUser` o que has manejado la obtención del token de otra manera.

// Ejemplo de cómo podrías detectar el evento (esto iría en una página
// que se carga DESPUÉS de hacer clic en el enlace del email):
/*
_supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'PASSWORD_RECOVERY') {
    console.log('Evento PASSWORD_RECOVERY detectado. Listo para actualizar contraseña.');
    // Aquí es donde habilitarías el formulario o procederías con la actualización
    // una vez que el usuario ingrese la nueva contraseña.
    // Necesitas la sesión que viene con este evento para que updateUser funcione correctamente.
  }
});
*/

// Event listener para el envío del formulario
resetForm.addEventListener('submit', async (event) => {
    event.preventDefault(); // Evita que la página se recargue

    const newPassword = newPasswordInput.value;
    messageElement.textContent = ''; // Limpia mensajes anteriores
    messageElement.className = 'message'; // Resetea clases de estilo del mensaje
    resetButton.disabled = true; // Deshabilita el botón durante el proceso

    if (!newPassword) {
        messageElement.textContent = 'Por favor, introduce una nueva contraseña.';
        messageElement.classList.add('error');
        resetButton.disabled = false;
        return;
    }

    try {
        // Intenta actualizar la contraseña del usuario
        // IMPORTANTE: Esto requiere que el usuario esté autenticado
        // o que se esté manejando un token de recuperación válido.
        // Si el usuario no está autenticado (lo normal en una página de reset
        // a la que se llega desde un email), necesitarás haber gestionado
        // el token/sesión del evento PASSWORD_RECOVERY.
        const { data, error } = await _supabase.auth.updateUser({
            password: newPassword
        });

        if (error) {
            throw error; // Lanza el error para ser capturado por el bloque catch
        }

        // Éxito
        console.log('Contraseña actualizada con éxito:', data);
        messageElement.textContent = '¡Contraseña actualizada con éxito! Redirigiendo al login...';
        messageElement.classList.add('success');
        newPasswordInput.value = ''; // Limpia el campo

        // Opcional: Redirigir al login después de un breve retraso
        setTimeout(() => {
            window.location.href = '/login.html'; // Cambia '/login' por tu ruta de login real
        }, 3000); // Redirige después de 3 segundos

    } catch (error) {
        // Manejo de errores
        console.error('Error al restablecer la contraseña:', error);
        messageElement.textContent = `Error: ${error.message || 'No se pudo restablecer la contraseña.'}`;
        messageElement.classList.add('error');
        resetButton.disabled = false; // Rehabilita el botón si falla
    }
});