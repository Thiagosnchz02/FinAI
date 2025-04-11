// auth-listener.js (v7 - Corrected SIGNED_IN Logic)
console.log('DEBUG: auth-listener.js - Cargado (v7)');

if (typeof supabase !== 'undefined' && supabase !== null) {
    console.log('auth-listener.js: Supabase client encontrado. Adjuntando listener.');
    let initialAuthCheckDone = false;

    supabase.auth.onAuthStateChange(async (event, session) => {
        const currentPath = window.location.pathname;
        const user = session?.user;

        // Log inicial
        console.log(`\n--- Auth State Change (v7) ---`);
        console.log(`  Path: [${currentPath}]`);
        console.log(`  Event: ${event}`);
        console.log(`  User: ${user ? user.id : 'null'}`);
        console.log(`  Session: ${session ? '[Exists]' : 'null'}`);
        console.log(`----------------------------`);

        // Nombres de páginas
        const loginPageName = '/Login.html';
        const dashboardPageName = '/Dashboard.html';
        const resetPasswordPageName = '/Reset_password.html';
        const forgotPasswordPageName = '/Reset_password_email.html';
        // No necesitamos listar todas las páginas protegidas aquí

        // Disparar 'authReady' una sola vez
        if (!initialAuthCheckDone) {
             initialAuthCheckDone = true;
             console.log('DEBUG (v7): Triggering authReady.');
             document.dispatchEvent(new CustomEvent('authReady', { detail: { session, user } }));
        }

        // --- Salida Temprana para Reset Page ---
        if (currentPath.endsWith(resetPasswordPageName)) {
            console.log('DEBUG (v7): En Reset Password Page. DETENIENDO listener.');
            return;
        }

        // --- MANEJO DE EVENTOS ESPECÍFICOS ---

        // Evento: Recuperación de contraseña (lleva a la página de reset si no estás ahí)
        if (event === 'PASSWORD_RECOVERY') {
            console.log("DEBUG (v7): Evento PASSWORD_RECOVERY.");
            if (!currentPath.endsWith(resetPasswordPageName)) {
                console.log('DEBUG (v7): Redirigiendo desde RECOVERY a:', resetPasswordPageName);
                window.location.replace(resetPasswordPageName);
            }
            return; // Detener aquí
        }

        // Evento: Cierre de sesión (SIEMPRE lleva a login si no estás ahí)
        if (event === 'SIGNED_OUT') {
            console.log("DEBUG (v7): Evento SIGNED_OUT.");
            if (!currentPath.endsWith(loginPageName)) {
                console.log(`DEBUG (v7): SIGNED_OUT - Redirigiendo a login (${loginPageName}).`);
                window.location.replace(loginPageName);
            } else {
                console.log('DEBUG (v7): SIGNED_OUT - Ya en login, no redirigir.');
            }
            return; // Detener aquí
        }

        // Evento: Inicio de sesión (Solo redirige a Dashboard SI estás en Login)
        if (event === 'SIGNED_IN') {
            console.log("DEBUG (v7): Evento SIGNED_IN detectado.");
            if (currentPath.endsWith(loginPageName)) {
                // Si SIGNED_IN ocurre mientras estás en la página de Login
                console.log(`DEBUG (v7): SIGNED_IN ocurrió en Login Page. Redirigiendo a Dashboard.`);
                window.location.replace(dashboardPageName);
            } else {
                // Si SIGNED_IN ocurre en cualquier otra página (Dashboard, Settings, Profile...), no hagas nada.
                console.log(`DEBUG (v7): SIGNED_IN ocurrió en [${currentPath}]. No se requiere redirección desde aquí.`);
            }
            return; // Detener aquí después de manejar SIGNED_IN
        }

        // --- LÓGICA GENERAL (Para INITIAL_SESSION o eventos desconocidos) ---
        console.log("DEBUG (v7): Ejecutando Lógica General (probablemente INITIAL_SESSION).");
        console.log(`DEBUG (v7): General Logic Check - User: ${!!user}, Path: [${currentPath}]`);

        if (user) { // Usuario logueado (y no fue un evento específico manejado arriba)
            console.log("DEBUG (v7): User is LOGGED IN (Initial Session?).");
             // ¿Está en una página pública donde NO debería estar? (Login/Forgot)
             if (currentPath.endsWith(loginPageName) || currentPath.endsWith(forgotPasswordPageName)) {
                console.log(`DEBUG (v7): Logged in on Public Auth Page (${currentPath}). REDIRECTING to Dashboard.`);
                window.location.replace(dashboardPageName);
            } else {
                 // Está en una página protegida (Dashboard, Settings, Profile, etc.) o en Reset. ¡Todo OK!
                 console.log(`DEBUG (v7): Logged in on Page [${currentPath}]. Acceso permitido.`);
            }
        } else { // Usuario NO logueado
             console.log("DEBUG (v7): User is LOGGED OUT (Initial Session?).");
             // ¿Está en una página pública permitida?
             const publicPageNames = [loginPageName, forgotPasswordPageName, resetPasswordPageName];
             let isPublic = publicPageNames.some(pageName => currentPath.endsWith(pageName)) || currentPath === '/' || currentPath.endsWith('/index.html');

             if (!isPublic) {
                 // NO está en pública y NO está logueado -> A Login!
                 console.warn(`DEBUG (v7): Logged out on PROTECTED Page (${currentPath}). REDIRECTING to Login.`);
                  window.location.replace(loginPageName); // Redirección de protección ACTIVADA
             } else {
                  console.log(`DEBUG (v7): Logged out on PUBLIC Page (${currentPath}). No redirect needed.`);
             }
        }
        console.log("DEBUG (v7): End of listener execution.");
    });

} else {
    console.error("auth-listener.js (v7): Supabase client no está definido.");
}