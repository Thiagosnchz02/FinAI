// auth-listener.js
// Este script debe cargarse DESPUÉS de supabase-init.js

console.log('DEBUG: auth-listener.js - Cargado');

// Primero, verifica si la variable global 'supabase' fue inicializada correctamente
if (typeof supabase !== 'undefined' && supabase !== null) {
    console.log('auth-listener.js: Supabase client encontrado. Adjuntando listener de estado de autenticación.');

    let initialAuthCheckDone = false; // Flag para disparar authReady solo una vez al inicio

    supabase.auth.onAuthStateChange(async (event, session) => {
        const currentPath = window.location.pathname; // Obtenemos la ruta completa (ej: /C:/.../Login.html o /Login.html)
        console.log('DEBUG (auth-listener): Current Pathname:', currentPath);
        console.log('DEBUG (auth-listener): Auth state changed:', event, session);
        const user = session?.user;

        // --- Disparar evento personalizado 'authReady' en la primera comprobación ---
        // Esto le dice a otros scripts (como categories.js) que el estado inicial está listo
        if (!initialAuthCheckDone) {
            initialAuthCheckDone = true;
            console.log('DEBUG (auth-listener): Initial auth state determined. Triggering authReady event.');
            document.dispatchEvent(new CustomEvent('authReady', { detail: { session, user } }));
        }
        // ------------------------------------------------------------------------

        // Define SOLO los nombres de archivo (o la parte final única con la barra inicial)
        // ¡¡ASEGÚRATE DE QUE ESTOS NOMBRES COINCIDAN EXACTAMENTE CON TUS ARCHIVOS HTML!!
        const loginPageName = '/Login.html';
        const dashboardPageName = '/Dashboard'; // ¡Verifica este nombre!
        const resetPasswordPageName = '/Reset_password.html'; // Página para poner nueva contraseña
        const forgotPasswordPageName = '/Reset_password_email.html'; // Página para pedir email de reset

        // --- 1. Manejo de Eventos Específicos ---
        // Se disparan justo después de una acción concreta (click en enlace, vuelta de Google)

        if (event === 'PASSWORD_RECOVERY') {
            console.log("DEBUG: Evento PASSWORD_RECOVERY detectado.");
            if (!currentPath.endsWith(resetPasswordPageName)) {
                console.log('DEBUG: Programando redirección desde PASSWORD_RECOVERY a:', resetPasswordPageName);
                setTimeout(() => {
                    console.log('DEBUG: Ejecutando redirección (RECOVERY) AHORA a:', resetPasswordPageName);
                    window.location.href = resetPasswordPageName;
                }, 50); // Pequeño delay
            } else {
                console.log('DEBUG: Ya estamos en la página de reset, no se redirige desde el evento RECOVERY.');
            }
            return; // Detiene aquí para este evento
        }

        if (event === 'SIGNED_IN') {
             console.log("DEBUG: Evento SIGNED_IN detectado.");
            if (!currentPath.endsWith(dashboardPageName)) {
                 console.log(`DEBUG: Programando redirección desde SIGNED_IN a dashboard (${dashboardPageName})...`);
                 setTimeout(() => {
                    console.log('DEBUG: Ejecutando redirección (SIGNED_IN) AHORA a:', dashboardPageName);
                    window.location.href = dashboardPageName;
                 }, 50); // Pequeño delay
            } else {
                console.log('DEBUG: Ya estamos en el dashboard, no se redirige desde el evento SIGNED_IN.');
            }
            return; // Detiene aquí para este evento
        }

         if (event === 'SIGNED_OUT') {
            console.log("DEBUG: Evento SIGNED_OUT detectado.");
             if (!currentPath.endsWith(loginPageName)) {
                 console.log(`DEBUG: Programando redirección desde SIGNED_OUT a login (${loginPageName})...`);
                 setTimeout(() => {
                    console.log('DEBUG: Ejecutando redirección (SIGNED_OUT) AHORA a:', loginPageName);
                    window.location.href = loginPageName;
                 }, 50); // Pequeño delay
            } else {
                console.log('DEBUG: Ya estamos en login, no se redirige desde el evento SIGNED_OUT.');
            }
            return; // Detiene aquí para este evento
         }


        // --- 2. Lógica General ---
        // (Se ejecuta si no se manejó un evento específico arriba,
        //  o al cargar la página y detectar el estado inicial si initialAuthCheckDone ya era true)

        // Si estamos en la página de reset password, NO hacemos NADA MÁS aquí.
        if (currentPath.endsWith(resetPasswordPageName)) {
            console.log('DEBUG: En la página de Reset Password, no se aplica lógica general de redirección.');
            return; // Salimos del listener para esta página
        }

        if (user) { // Si hay una sesión de usuario activa...
            // ...y el usuario está AHORA MISMO en la página de Login...
            if (currentPath.endsWith(loginPageName)) {
                console.log('DEBUG: Usuario logueado en página de login, redirigiendo a:', dashboardPageName);
                // No necesita delay normalmente
                window.location.href = dashboardPageName; // ...mándalo al dashboard.
            }
            // Aquí añadirías otras redirecciones generales si usuario está logueado y en página incorrecta

        } else { // Si NO hay sesión de usuario activa...
            // Protección de rutas: Si no está en una página pública, redirigir a login
            const publicPageNames = [loginPageName, resetPasswordPageName, forgotPasswordPageName];
            let isPublic = publicPageNames.some(pageName => currentPath.endsWith(pageName)) || currentPath.endsWith('/'); // Considera raíz pública

            if (!isPublic) {
                 // console.log(`DEBUG: Usuario no logueado en ruta protegida (${currentPath}). Redirigiendo a login...`);
                 // window.location.href = loginPath; // Mantener comentado hasta activar protección
            }
        }
    });

} else {
    console.error("auth-listener.js: Supabase client no está definido. Asegúrate de que supabase-init.js se cargue antes.");
}