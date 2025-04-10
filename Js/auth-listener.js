// auth-listener.js (Intento 2 - Más agresivo)
// Este script debe cargarse DESPUÉS de supabase-init.js

console.log('DEBUG: auth-listener.js - Cargado (v2)');

if (typeof supabase !== 'undefined' && supabase !== null) {
    console.log('auth-listener.js: Supabase client encontrado. Adjuntando listener.');

    let initialAuthCheckDone = false;

    supabase.auth.onAuthStateChange(async (event, session) => {
        const currentPath = window.location.pathname;
        console.log('DEBUG (auth-listener v2): Path:', currentPath);
        console.log('DEBUG (auth-listener v2): Event:', event);
        console.log('DEBUG (auth-listener v2): Session:', session);
        const user = session?.user;

        // --- Constantes de Páginas ---
        const loginPageName = '/Login.html';
        const dashboardPageName = '/Dashboard.html'; // ¡Verifica que este nombre/ruta sea correcto!
        const resetPasswordPageName = '/Reset_password.html';
        const forgotPasswordPageName = '/Reset_password_email.html';

        // --- CONDICIÓN DE SALIDA TEMPRANA ---
        // Si estamos en la página de reset, NO HACER NADA MÁS en este listener.
        if (currentPath.endsWith(resetPasswordPageName)) {
            console.log('DEBUG (auth-listener v2): En Reset Password Page. DETENIENDO listener aquí.');
             // Disparamos authReady aquí también si no se ha hecho,
             // para que Reset_password.js sepa que puede intentar usar supabase.
             if (!initialAuthCheckDone) {
                 initialAuthCheckDone = true;
                 console.log('DEBUG (auth-listener v2): Initial check on Reset Page. Triggering authReady.');
                 document.dispatchEvent(new CustomEvent('authReady', { detail: { session, user } }));
             }
            return; // Salida temprana crucial
        }

        // --- Disparar 'authReady' (si no se hizo ya y no estamos en reset) ---
        if (!initialAuthCheckDone) {
            initialAuthCheckDone = true;
            console.log('DEBUG (auth-listener v2): Initial auth state determined (not reset page). Triggering authReady.');
            document.dispatchEvent(new CustomEvent('authReady', { detail: { session, user } }));
        }
        // ------------------------------------------------------------------------


        // --- MANEJO DE EVENTOS ESPECÍFICOS (Fuera de Reset Page) ---

        // Evento PASSWORD_RECOVERY (Solo redirige SI NO estamos ya en la pág de reset)
        if (event === 'PASSWORD_RECOVERY') {
            console.log("DEBUG (auth-listener v2): Evento PASSWORD_RECOVERY (pero NO deberíamos estar aquí si estamos en Reset Page).");
            // La condición de salida temprana debería haber actuado, pero por si acaso:
            if (!currentPath.endsWith(resetPasswordPageName)) { // Doble check
                console.log('DEBUG (auth-listener v2): Redirigiendo desde RECOVERY a:', resetPasswordPageName);
                window.location.replace(resetPasswordPageName);
            }
            return; // Detener aquí para este evento
        }

        // Evento SIGNED_IN
        if (event === 'SIGNED_IN') {
            console.log("DEBUG (auth-listener v2): Evento SIGNED_IN.");
            if (!currentPath.endsWith(dashboardPageName)) {
                console.log(`DEBUG (auth-listener v2): Redirigiendo desde SIGNED_IN a dashboard (${dashboardPageName}).`);
                window.location.replace(dashboardPageName);
            } else {
                 console.log('DEBUG (auth-listener v2): Ya en dashboard, no redirigir.');
            }
            return; // Detener aquí
        }

        // Evento SIGNED_OUT
        if (event === 'SIGNED_OUT') {
            console.log("DEBUG (auth-listener v2): Evento SIGNED_OUT.");
            if (!currentPath.endsWith(loginPageName)) {
                console.log(`DEBUG (auth-listener v2): Redirigiendo desde SIGNED_OUT a login (${loginPageName}).`);
                window.location.replace(loginPageName);
            } else {
                console.log('DEBUG (auth-listener v2): Ya en login, no redirigir.');
            }
            return; // Detener aquí
        }

        // --- LÓGICA GENERAL (Solo si NO estamos en Reset Page y NO hubo evento específico) ---
        console.log("DEBUG (auth-listener v2): Ejecutando Lógica General.");

        if (user) { // Usuario logueado
            console.log("DEBUG (auth-listener v2): Usuario detectado en Lógica General.");
             if (currentPath.endsWith(loginPageName) || currentPath.endsWith(forgotPasswordPageName)) {
                console.log(`DEBUG (auth-listener v2): Logueado en página pública (${currentPath}). Redirigiendo a dashboard.`);
                window.location.replace(dashboardPageName);
            } else {
                // Si el usuario está logueado y en una página que no es Login ni Forgot Password (y tampoco Reset Password por la salida temprana),
                // asumimos que está en una página correcta (Dashboard, Cuentas, etc.)
                console.log(`DEBUG (auth-listener v2): Logueado en página (${currentPath}). No se redirige.`);
            }
        } else { // Usuario NO logueado
            console.log("DEBUG (auth-listener v2): Usuario NO logueado en Lógica General.");
            // Definir páginas públicas (Reset Password ya está excluida por la salida temprana)
            const publicPageNames = [loginPageName, forgotPasswordPageName];
            // Permitir también la raíz o index.html como públicas
            let isPublic = publicPageNames.some(pageName => currentPath.endsWith(pageName)) || currentPath === '/' || currentPath.endsWith('/index.html');

            if (!isPublic) {
                console.warn(`DEBUG (auth-listener v2): NO logueado en ruta protegida (${currentPath}). Redirigiendo a login...`);
                // Descomenta la siguiente línea cuando quieras activar la protección de rutas para todas las demás páginas
                // window.location.replace(loginPageName);
            } else {
                 console.log(`DEBUG (auth-listener v2): NO logueado en página pública (${currentPath}). No se redirige.`);
            }
        }
    });

} else {
    console.error("auth-listener.js (v2): Supabase client no está definido.");
    // Considera añadir un mensaje de error visible para el usuario
    // document.body.innerHTML = '<p style="color: red; text-align: center; padding-top: 50px;">Error crítico: La aplicación no pudo inicializarse correctamente.</p>';
}