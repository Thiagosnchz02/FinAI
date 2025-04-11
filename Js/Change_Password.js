// ChangePassword.js
// ASEGÚRATE que supabase-init.js y auth-listener.js se cargaron antes

console.log('DEBUG: ChangePassword.js - Cargado');

if (typeof supabase === 'undefined' || supabase === null) {
    console.error('ChangePassword.js: ¡Error Crítico! Cliente Supabase no inicializado.');
    alert("Error crítico: No se puede cambiar la contraseña.");
    // Redirigir o deshabilitar formulario
    const form = document.getElementById('changePasswordForm');
    if(form) form.style.display = 'none';
} else {
    console.log('ChangePassword.js: Cliente Supabase encontrado.');

    // --- Selección de Elementos DOM ---
    const backToSettingsButton = document.getElementById('backToSettingsButton');
    const changePasswordForm = document.getElementById('changePasswordForm');
    const currentPasswordInput = document.getElementById('currentPassword'); // Aunque no se use para API, lo usamos para UX
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const updatePasswordButton = document.getElementById('updatePasswordButton');
    const messageElement = document.getElementById('message');

    // --- Variables ---
    let currentUserId = null;
    let isLoading = false;

    // --- Funciones ---
    function showMessage(type, text) {
        if (messageElement) {
            messageElement.textContent = text;
            messageElement.className = `message ${type}`; // 'success' o 'error'
            messageElement.style.display = 'block';
        }
    }

    function hideMessage() {
        if (messageElement) {
            messageElement.textContent = '';
            messageElement.style.display = 'none';
        }
    }

    function setLoading(loading) {
        isLoading = loading;
        if (updatePasswordButton) updatePasswordButton.disabled = loading;
        if (updatePasswordButton) updatePasswordButton.textContent = loading ? 'Actualizando...' : 'Actualizar Contraseña';
        // Deshabilitar inputs durante carga?
        if(currentPasswordInput) currentPasswordInput.disabled = loading;
        if(newPasswordInput) newPasswordInput.disabled = loading;
        if(confirmPasswordInput) confirmPasswordInput.disabled = loading;
    }

    // --- Manejador del Formulario ---
    async function handleChangePasswordSubmit(event) {
        event.preventDefault();
        if (isLoading) return;

        hideMessage(); // Limpiar mensajes anteriores
        const currentPassword = currentPasswordInput.value; // Lo pedimos, pero no lo usamos en la llamada API
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        // Validaciones Frontend
        if (!currentPassword || !newPassword || !confirmPassword) {
            showMessage('error', 'Todos los campos son obligatorios.');
            return;
        }
        if (newPassword.length < 8) {
             showMessage('error', 'La nueva contraseña debe tener al menos 8 caracteres.');
             return;
        }
        if (newPassword !== confirmPassword) {
            showMessage('error', 'Las nuevas contraseñas no coinciden.');
            return;
        }
        if (newPassword === currentPassword) {
             showMessage('error', 'La nueva contraseña no puede ser igual a la actual.');
             return;
        }

        setLoading(true);

        try {
            console.log("Intentando actualizar contraseña...");
            const { data, error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) {
                // Manejar errores específicos de Supabase
                console.error('Error Supabase al actualizar contraseña:', error);
                if (error.message.includes('requires recent login') || error.message.includes('identity constrained')) {
                     showMessage('error', 'Por seguridad, necesitas haber iniciado sesión recientemente para cambiar la contraseña. Por favor, cierra sesión y vuelve a entrar.');
                } else if (error.message.includes('same as the old password')) { // Supabase puede dar este error también
                     showMessage('error', 'La nueva contraseña no puede ser igual a la actual.');
                } else if (error.message.includes('weak password')) {
                    showMessage('error', 'La nueva contraseña es demasiado débil. Intenta una más compleja.');
                }
                 else {
                    showMessage('error', `Error al actualizar: ${error.message}`);
                }
            } else {
                console.log("Contraseña actualizada con éxito:", data);
                showMessage('success', '¡Contraseña actualizada con éxito! Serás redirigido a Configuración...');
                changePasswordForm.reset(); // Limpiar formulario

                // Redirigir a Configuración después de unos segundos
                setTimeout(() => {
                    window.location.href = '/Settings.html';
                }, 3000); // 3 segundos de espera
            }

        } catch (generalError) {
             // Error inesperado no de Supabase API
             console.error('Error general en handleChangePasswordSubmit:', generalError);
             showMessage('error', 'Ocurrió un error inesperado. Inténtalo de nuevo.');
        } finally {
            // Solo rehabilitar si no hubo éxito o si la redirección no va a ocurrir
             if (!messageElement.classList.contains('success')) {
                 setLoading(false);
             }
        }
    }

    // --- Asignación de Event Listeners ---
    document.addEventListener('authReady', (e) => {
        console.log('ChangePassword.js: Received authReady event.');
        currentUser = e.detail.user; // Guardar usuario
        currentUserId = currentUser?.id;
        if (!currentUserId) {
            // Si llega aquí sin estar logueado, auth-listener debería redirigir
            console.warn("ChangePassword.js: Usuario no autenticado detectado en authReady. Redirigiendo a Login...");
            alert("Debes iniciar sesión para cambiar tu contraseña.");
            window.location.replace('/Login.html');
        } else {
             console.log("ChangePassword.js: Usuario autenticado:", currentUserId);
        }
    });

    document.addEventListener('DOMContentLoaded', () => {
        console.log("ChangePassword.js: DOM fully loaded.");

        if (backToSettingsButton) {
            backToSettingsButton.addEventListener('click', () => {
                // Navegar de vuelta a configuración, usando replace para no guardar esta página en el historial
                window.location.replace('/Settings.html');
            });
        }

        if (changePasswordForm) {
            changePasswordForm.addEventListener('submit', handleChangePasswordSubmit);
        } else {
             console.error("Error: Formulario changePasswordForm no encontrado.");
        }

    }); // Fin DOMContentLoaded

} // Fin check Supabase