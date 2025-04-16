// auth-listener.js (v10 - Stable Base - NO Default View Logic)
console.log('DEBUG: auth-listener.js - Cargado (v10 - Stable)');

if (typeof supabase !== 'undefined' && supabase !== null) {
    console.log('auth-listener.js: Supabase client encontrado. Adjuntando listener.');
    let initialAuthCheckDone = false;

    // Volvemos a un listener síncrono o mínimamente asíncrono
    supabase.auth.onAuthStateChange((event, session) => { // Quitamos async aquí temporalmente si es posible
        const currentPath = window.location.pathname;
        const user = session?.user;

        console.log(`\n--- Auth State Change (v10) ---`);
        console.log(`  Path: [${currentPath}]`);
        console.log(`  Event: ${event}`);
        console.log(`  User: ${user ? user.id : 'null'}`);
        console.log(`----------------------------`);

        const loginPageName = '/Login.html';
        const dashboardPageName = '/Dashboard.html'; // Siempre redirigir aquí por ahora
        const resetPasswordPageName = '/Reset_password.html';
        const forgotPasswordPageName = '/Reset_password_email.html';

        // Disparar 'authReady' una sola vez - HACER ESTO PRIMERO
        // Es crucial que otros scripts reciban esto lo antes posible
        if (!initialAuthCheckDone) {
            initialAuthCheckDone = true;
            console.log('DEBUG (v10): Triggering authReady.');
            // Envolver en try/catch por si algún listener de authReady da error
            try {
                 document.dispatchEvent(new CustomEvent('authReady', { detail: { session, user } }));
            } catch(e) { console.error("Error dispatching authReady", e); }
        }

        // --- Salida Temprana para Reset Page ---
        if (currentPath.endsWith(resetPasswordPageName)) {
            console.log('DEBUG (v10): En Reset Page. DETENIENDO.');
            return; // Evita cualquier redirección desde la página de reset
        }

        // --- MANEJO DE EVENTOS ESPECÍFICOS (Prioridad Alta) ---

        // Evento: Cierre de sesión (SIEMPRE lleva a login si no estás ahí)
        if (event === 'SIGNED_OUT') {
            console.log("DEBUG (v10): Evento SIGNED_OUT.");
            if (!currentPath.endsWith(loginPageName)) {
                console.log(`DEBUG (v10): SIGNED_OUT - Redirigiendo a login (${loginPageName}).`);
                window.location.replace(loginPageName); // Usar replace
            } else {
                console.log('DEBUG (v10): SIGNED_OUT - Ya en login, no redirigir.');
            }
            return; // Importante detener aquí
        }

        // Evento: Inicio de sesión o Confirmación Email (Lleva a Dashboard si no estás ya en una página protegida)
        // Simplificado: si ocurre en Login/Forgot/Root -> Ir a Dashboard. Si ocurre en otro sitio, no hacer nada.
        if (event === 'SIGNED_IN') {
            console.log("DEBUG (v10): Evento SIGNED_IN detectado.");
            if (currentPath.endsWith(loginPageName) || currentPath.endsWith(forgotPasswordPageName) || currentPath === '/' || currentPath.endsWith('/index.html')) {
                 console.log(`DEBUG (v10): SIGNED_IN en Página Pública/Root (${currentPath}). Redirigiendo a Dashboard.`);
                 window.location.replace(dashboardPageName);
            } else {
                 console.log(`DEBUG (v10): SIGNED_IN ocurrió en [${currentPath}]. No se requiere redirección desde aquí (asumiendo página protegida).`);
            }
            return; // Importante detener aquí
        }

        // Evento: Recuperación de Contraseña (lleva a la pág de reset si no estás ahí)
         if (event === 'PASSWORD_RECOVERY') {
             console.log("DEBUG (v10): Evento PASSWORD_RECOVERY.");
             if (!currentPath.endsWith(resetPasswordPageName)) {
                 console.log('DEBUG (v10): Redirigiendo desde RECOVERY a:', resetPasswordPageName);
                 window.location.replace(resetPasswordPageName);
             }
             return; // Importante detener aquí
         }


        // --- LÓGICA GENERAL (Principalmente para INITIAL_SESSION) ---
        // Esta lógica se ejecuta si no saltó un return en los eventos anteriores
        console.log("DEBUG (v10): Ejecutando Lógica General.");

        if (user) { // Usuario logueado
            console.log("DEBUG (v10): User is LOGGED IN (Initial Session?).");
             // ¿Está en una página pública O en la raíz donde NO debería estar?
             if (currentPath.endsWith(loginPageName) || currentPath.endsWith(forgotPasswordPageName) || currentPath === '/' || currentPath.endsWith('/index.html') ) {
                 console.log(`DEBUG (v10): Logged in on Public/Root Page (${currentPath}). REDIRECTING to Dashboard.`);
                 window.location.replace(dashboardPageName); // Siempre a Dashboard por ahora
            } else {
                 // Está en una página protegida (Settings, Accounts, Dashboard, etc.). Todo OK.
                 console.log(`DEBUG (v10): Logged in on Protected Page [${currentPath}]. Acceso permitido.`);
            }
        } else { // Usuario NO logueado
             console.log("DEBUG (v10): User is LOGGED OUT (Initial Session?).");
             // ¿Está en una página pública permitida?
             const publicPageNames = [loginPageName, forgotPasswordPageName, resetPasswordPageName];
             let isPublic = publicPageNames.some(pageName => currentPath.endsWith(pageName)) || currentPath === '/' || currentPath.endsWith('/index.html');

             if (!isPublic) {
                 // NO está en pública y NO está logueado -> A Login!
                 console.warn(`DEBUG (v10): Logged out on PROTECTED Page (${currentPath}). REDIRECTING to Login.`);
                  window.location.replace(loginPageName); // Redirección de protección
             } else {
                  console.log(`DEBUG (v10): Logged out on PUBLIC Page (${currentPath}). No redirect needed.`);
             }
        }
        console.log("DEBUG (v10): End of listener execution.");
    });

} else {
    console.error("auth-listener.js (v10): Supabase client no está definido.");
}