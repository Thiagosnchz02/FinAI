console.log('DEBUG: Login.js - Cargado');

// --- Esperar a que el contenido del DOM esté listo ---
document.addEventListener('DOMContentLoaded', () => {

    // Verificar si Supabase se inicializó correctamente antes de continuar
    if (!supabase) {
        console.error("Supabase no está disponible. Los formularios no funcionarán.");
        // Podrías deshabilitar los formularios aquí si lo deseas
        return; // Detener la ejecución si Supabase no está listo
    }

    // --- Selección de Elementos del DOM ---
    const signInForm = document.getElementById('signInForm');
    const signUpForm = document.getElementById('signUpForm');
    const googleSignInButton = document.querySelector('.btn-google');
    const forgotPasswordLink = document.querySelector('.forgot-password');

    // Inputs Sign In
    const signInEmailInput = document.getElementById('signInEmail');
    const signInPasswordInput = document.getElementById('signInPassword');

    // Inputs Sign Up
    const signUpNameInput = document.getElementById('signUpName');
    const signUpEmailInput = document.getElementById('signUpEmail');
    const signUpPasswordInput = document.getElementById('signUpPassword');

    // --- Lógica para Sign Up (Registro) ---
    if (signUpForm) {
        signUpForm.addEventListener('submit', (event) => {
            event.preventDefault(); // Prevenir el envío HTML tradicional

            const name = signUpNameInput.value.trim();
            const email = signUpEmailInput.value.trim();
            const password = signUpPasswordInput.value.trim();

            // Validación básica
            if (!name || !email || !password) {
                alert('Por favor, completa todos los campos de registro.');
                return;
            }
            if (password.length < 8) {
                 alert('La contraseña debe tener al menos 8 caracteres.');
                 return;
            }

            // Deshabilitar botón para evitar doble envío (opcional)
            const signUpButton = signUpForm.querySelector('button[type="submit"]');
            signUpButton.disabled = true;
            signUpButton.textContent = 'Registrando...'; // Cambiar texto (opcional)


            supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: name // Guarda el nombre en los metadatos del usuario
                    }
                }
            })
            .then(({ data, error }) => {
                signUpButton.disabled = false;
                signUpButton.textContent = 'Sign Up';
            
                if (error) {
                    console.error('Error en SignUp:', error);
                    alert('Error al registrarse: ' + error.message);
                } else if (data.user && !data.session) { // <--- CONDICIÓN AJUSTADA
                    // Usuario creado, pero sin sesión = necesita confirmar email
                    alert('¡Registro casi listo! Revisa tu email (' + email + ') para confirmar tu cuenta antes de iniciar sesión.');
                    signUpForm.reset();
                } else if (data.user && data.session) {
                    // Usuario creado Y con sesión = confirmación desactivada o ya completada
                    alert('¡Registro exitoso! Ahora puedes iniciar sesión.'); // O redirigir
                    signUpForm.reset();
                } else {
                    // Caso inesperado
                    alert('Registro procesado. Revisa tu email.');
                    signUpForm.reset();
                }
            })
            .catch(err => {
                signUpButton.disabled = false; // Asegurarse de re-habilitar en caso de error inesperado
                signUpButton.textContent = 'Sign Up';
                console.error('Catch Error SignUp:', err);
                alert('Ocurrió un error inesperado durante el registro.');
            });
        });
    }

    // --- Lógica para Sign In (Inicio de Sesión) ---
    if (signInForm) {
        signInForm.addEventListener('submit', (event) => {
            event.preventDefault();

            const email = signInEmailInput.value.trim();
            const password = signInPasswordInput.value.trim();

            if (!email || !password) {
                alert('Por favor, introduce tu email y contraseña.');
                return;
            }

            const signInButton = signInForm.querySelector('button[type="submit"]');
            signInButton.disabled = true;
            signInButton.textContent = 'Iniciando...';

            supabase.auth.signInWithPassword({
                email: email,
                password: password,
            })
            .then(({ data, error }) => {
                signInButton.disabled = false;
                signInButton.textContent = 'Sign In';

                if (error) {
                    console.error('Error en SignIn:', error);
                    // Manejar error específico de email no confirmado
                    if (error.message.includes("Email not confirmed")) {
                         alert('Error: Debes confirmar tu email antes de iniciar sesión. Revisa tu bandeja de entrada.');
                    } else {
                         alert('Error al iniciar sesión: Email o contraseña incorrectos.'); // Mensaje genérico por seguridad
                    }
                } else {
                    console.log('Usuario inició sesión:', data.user);
                    alert('¡Inicio de sesión correcto!');
                    console.log('DEBUG: Intentando redirigir desde signInWithPassword a la RAÍZ (/)');
                    window.location.href = '/Dashboard.html'; // Intenta redirigir solo a la raíz del sitio
                    //const targetUrl = './Dashboard.html';
                    //console.log('DEBUG: Redirigiendo desde signInWithPassword a:', targetUrl);
                    // Redirigir al dashboard
                    //window.location.href = targetUrl; // **Asegúrate de que esta es la URL correcta de tu dashboard en WordPress**
                }
            })
            .catch(err => {
                signInButton.disabled = false;
                signInButton.textContent = 'Sign In';
                console.error('Catch Error SignIn:', err);
                alert('Ocurrió un error inesperado durante el inicio de sesión.');
            });
        });
    }

    // --- Lógica para Google Sign In ---
    if (googleSignInButton) {
        googleSignInButton.addEventListener('click', () => {
            // Deshabilitar botón (opcional)
            googleSignInButton.disabled = true;
            googleSignInButton.textContent = 'Conectando...';

            supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    // **IMPORTANTE:** Si quieres que redirija a una página específica
                    // después del login con Google, descomenta y ajusta la siguiente línea.
                    // Esta URL DEBE estar añadida en tus "URIs de redireccionamiento autorizados"
                    // tanto en Google Cloud Console como en la configuración del proveedor Google en Supabase.
                    redirectTo: window.location.origin + '/Dashboard.html'
                }
            })
            .then(({ data, error }) => {
                 // Normalmente no necesitas re-habilitar el botón aquí si la redirección funciona.
                 // Si no hay redirección, el usuario elige cuenta y la página se recarga
                 // o la sesión se establece para la próxima vez.
                if (error) {
                    googleSignInButton.disabled = false; // Re-habilitar en caso de error
                    googleSignInButton.innerHTML = '<i class="fab fa-google"></i> Sign in with Google'; // Restaurar texto/icono
                    console.error('Error iniciando sesión con Google:', error);
                    alert('Error al intentar iniciar sesión con Google: ' + error.message);
                } else {
                    // Supabase maneja la redirección o el flujo.
                    // Si no especificaste redirectTo, la sesión se establecerá
                    // y podrás detectarla en la próxima carga de página o usando listeners de Supabase.
                    console.log('Inicio de sesión con Google iniciado, esperando redirección...', data);
                    // Podrías mostrar un mensaje tipo "Revisa la ventana de Google..."
                    // No redirijas manualmente aquí a menos que sepas que la sesión ya está establecida.
                     // El botón se puede quedar como "Conectando..." porque la página redirigirá o se actualizará.
                }
            })
            .catch(err => {
                 googleSignInButton.disabled = false;
                 googleSignInButton.innerHTML = '<i class="fab fa-google"></i> Sign in with Google';
                 console.error('Catch Error Google SignIn:', err);
                 alert('Ocurrió un error inesperado con Google Sign In.');
            });
        });
    } else {
        console.warn("Botón de Google no encontrado.");
    }

    // --- Lógica para Forgot Password (Simulado) ---
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (event) => {
            event.preventDefault();
            // Implementación real requeriría un formulario/página para pedir el email
            // y llamar a supabase.auth.resetPasswordForEmail()
            //alert('La funcionalidad de recuperar contraseña necesita ser implementada (requiere llamar a Supabase con el email del usuario).');
            window.location.href = './Reset_password_email.html';
            // Ejemplo de cómo sería la llamada (necesitas obtener el email del usuario):
            /*
            const email = prompt("Introduce tu email para recuperar la contraseña:");
            if (email) {
                supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin + '/reset-password-page.html', // URL donde el usuario creará la nueva contraseña
                })
                .then(({ data, error }) => {
                    if (error) {
                        alert("Error: " + error.message);
                    } else {
                        alert("Revisa tu email para las instrucciones de recuperación.");
                    }
                });
            }
            */
        });
    }

}); // Fin de document.addEventListener('DOMContentLoaded')

// --- Puedes añadir aquí funciones adicionales si las necesitas ---
// Por ejemplo, una función para comprobar el estado de autenticación al cargar CUALQUIER página:

// Este listener debería estar fuera del DOMContentLoaded si es posible,
// o al menos definido para que se ejecute en todas las páginas relevantes.

