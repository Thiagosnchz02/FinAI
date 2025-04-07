console.log('DEBUG: auth-listener.js - Cargado');

// auth-listener.js
// Este script debe cargarse DESPUÉS de supabase-init.js

// Primero, verifica si la variable global 'supabase' fue inicializada correctamente
if (typeof supabase !== 'undefined' && supabase !== null) {
    console.log('auth-listener.js: Supabase client encontrado. Adjuntando listener de estado de autenticación.');

    supabase.auth.onAuthStateChange(async (event, session) => {
        const currentPath = window.location.pathname; // Obtenemos la ruta completa (ej: /C:/.../Login.html o /Login.html)
        console.log('DEBUG (auth-listener): Current Pathname:', currentPath);
        console.log('DEBUG (auth-listener): Auth state changed:', event, session);
        const user = session?.user;

        // Define SOLO los nombres de archivo (o la parte final única con la barra inicial)
        // ¡¡ASEGÚRATE DE QUE ESTOS NOMBRES COINCIDAN EXACTAMENTE CON TUS ARCHIVOS HTML!!
        const loginPageName = '/Login.html';
        const dashboardPageName = '/Dashboard.html'; // ¡Verifica este nombre!
        const resetPasswordPageName = '/Reset_password.html'; // Página para poner nueva contraseña
        const forgotPasswordPageName = '/Reset_password_email.html'; // Página para pedir email de reset

        // --- 1. Manejo de Eventos Específicos ---
        // Se disparan justo después de una acción concreta (click en enlace, vuelta de Google)

        // Evento tras hacer clic en enlace de restablecer contraseña
        if (event === 'PASSWORD_RECOVERY') {
            console.log("DEBUG: Evento PASSWORD_RECOVERY detectado.");
            if (!currentPath.endsWith(resetPasswordPageName)) { // Si no estamos ya en la página de reset...
                console.log('DEBUG: Redirigiendo desde PASSWORD_RECOVERY a:', resetPasswordPageName);
                window.location.href = resetPasswordPageName; // ...vamos a ella.
            }
            return; // Detiene aquí para este evento
        }

        // Evento tras confirmar email o iniciar sesión (incluyendo Google)
        if (event === 'SIGNED_IN') {
             console.log("DEBUG: Evento SIGNED_IN detectado.");
            // Si acabamos de iniciar sesión y NO estamos ya en el dashboard...
            if (!currentPath.endsWith(dashboardPageName)) {
                console.log(`DEBUG: Redirigiendo desde SIGNED_IN a dashboard (${dashboardPageName})...`);
                window.location.href = dashboardPageName; // ...vamos al dashboard.
            }
            return; // Detiene aquí para este evento
        }

         // Evento tras cerrar sesión
         if (event === 'SIGNED_OUT') {
            console.log("DEBUG: Evento SIGNED_OUT detectado.");
             // Si cerramos sesión y NO estamos ya en la página de login...
             if (!currentPath.endsWith(loginPageName)) {
                console.log(`DEBUG: Redirigiendo desde SIGNED_OUT a login (${loginPageName})...`);
                window.location.href = loginPageName; // ...vamos al login.
            }
            return; // Detiene aquí para este evento
         }


        // --- 2. Lógica General ---

        // Si estamos en la página de reset password, NO hacemos NADA MÁS aquí.
        // El usuario NECESITA quedarse en esta página para introducir la nueva contraseña.
        if (currentPath.endsWith(resetPasswordPageName)) {
            console.log('DEBUG: En la página de Reset Password, no se aplica lógica general de redirección.');
            return; // Salimos del listener para esta página
        }
        // Se ejecuta si no se manejó un evento específico arriba,
        // o al cargar una página y detectar el estado inicial de la sesión.
        
        if (user) { // Si hay una sesión de usuario activa...
            // ...y el usuario está AHORA MISMO en la página de Login...
            if (currentPath.endsWith(loginPageName)) {
                console.log('DEBUG: Usuario logueado en página de login, redirigiendo a:', dashboardPageName);
                window.location.href = dashboardPageName; // ...mándalo al dashboard.
            }
            // Aquí podrías añadir más lógica si el usuario logueado intenta acceder a otras páginas
            // que no debería (ej: reset password), y redirigirlo al dashboard.

        } else { // Si NO hay sesión de usuario activa...

            // Protección de rutas: Si no está en una página pública, redirigir a login
            const publicPageNames = [loginPageName, resetPasswordPageName, forgotPasswordPageName]; // Lista de páginas públicas
            let isPublic = publicPageNames.some(pageName => currentPath.endsWith(pageName)) || currentPath.endsWith('/'); // Considera la raíz '/' como pública

            if (!isPublic) {
                 // Esta es la lógica para proteger rutas, déjala comentada mientras depuras las redirecciones principales
                 // console.log(`DEBUG: Usuario no logueado en ruta protegida (${currentPath}). Redirigiendo a login...`);
                 // window.location.href = loginPath;
            }
        }
    });

} else {
    console.error("auth-listener.js: Supabase client no está definido. Asegúrate de que supabase-init.js se cargue antes.");
    // Podrías añadir un alert o algún indicador visual si Supabase no carga
    // alert("Error crítico: No se pudo inicializar la autenticación.");
}