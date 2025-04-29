// Settings.js (COMPLETO - Incluye Carga y Selector de Tema con Guardado)
// ASEGÚRATE que supabase-init.js y auth-listener.js se cargaron antes

console.log('DEBUG: Settings.js - Cargado');

if (typeof supabase === 'undefined' || supabase === null) {
    console.error('Settings.js: ¡Error Crítico! Cliente Supabase no inicializado.');
    alert("Error crítico al cargar la configuración.");
    document.body.style.opacity = '0.5';
    document.body.style.pointerEvents = 'none';
} else {
    console.log('Settings.js: Cliente Supabase encontrado.');

    // --- Selección de Elementos DOM ---
    const backButton = document.getElementById('backButton');
    const userAvatarSmall = document.getElementById('userAvatarSmall');
    const mainCurrencyEl = document.getElementById('mainCurrency');
    const defaultViewSetting = document.getElementById('defaultViewSetting');
    const defaultViewValueEl = document.getElementById('defaultViewValue');
    const exportDataBtn = document.getElementById('exportDataBtn');
    const importDataBtn = document.getElementById('importDataBtn');
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    const themeSelector = document.getElementById('themeSelector');
    const languageSetting = document.getElementById('languageSetting');
    const languageValueEl = document.getElementById('languageValue');
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const twoFactorToggle = document.getElementById('twoFactorToggle');
    const notifyFixedExpenseToggle = document.getElementById('notifyFixedExpenseToggle');
    const notifyBudgetAlertToggle = document.getElementById('notifyBudgetAlertToggle');
    const notifyGoalReachedToggle = document.getElementById('notifyGoalReachedToggle');
    const editProfileBtn = document.getElementById('editProfileBtn');
    const manageCategoriesBtn = document.getElementById('manageCategoriesBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const helpLink = document.getElementById('helpLink');
    const privacyLink = document.getElementById('privacyLink');
    const termsLink = document.getElementById('termsLink');
    const appVersionEl = document.getElementById('appVersion');
    const scrollTopBtn = document.getElementById('scrollTopBtn');
    const mfaFactorIdInput = document.getElementById('mfaFactorId');
    const setup2faModal = document.getElementById('setup2faModal');
    const verify2faForm = document.getElementById('verify2faForm');
    const verificationCodeInput = document.getElementById('verificationCodeInput');
    const modalTitle2fa = document.getElementById('modalTitle2fa');
    const qrCodeContainer = document.getElementById('qrCodeContainer');
    const secretCodeDisplay = document.getElementById('secretCodeDisplay');
    const copySecretBtn = document.getElementById('copySecretBtn');
    const cancel2faButton = document.getElementById('cancel2faButton');
    const verify2faButton = document.getElementById('verify2faButton');
    const modal2faError = document.getElementById('modal2faError');
    const deleteAccountModal = document.getElementById('deleteAccountModal');
    const deleteConfirmForm = document.getElementById('deleteConfirmForm');
    const deleteUserEmailEl = document.getElementById('deleteUserEmail');
    const deleteConfirmPasswordInput = document.getElementById('deleteConfirmPassword');
    const cancelDeleteButton = document.getElementById('cancelDeleteButton');
    const confirmDeleteButton = document.getElementById('confirmDeleteButton');
    const modalDeleteError = document.getElementById('modalDeleteError');
    const infoModal = document.getElementById('infoModal');
    const infoModalTitle = document.getElementById('infoModalTitle');
    const infoModalMessage = document.getElementById('infoModalMessage');
    const infoModalCloseBtn = document.getElementById('infoModalCloseBtn');
    // Seleccionar elementos que podrían deshabilitarse durante la carga/guardado
    const pageContainer = document.querySelector('.page-container');
    const allToggles = document.querySelectorAll('.toggle-switch input[type="checkbox"]');
    const allButtons = document.querySelectorAll('.settings-grid button, .theme-option, #backButton, #editProfileBtn, #manageCategoriesBtn, #logoutBtn');

    // Nuevos elementos Modal Selección
    const selectionModal = document.getElementById('selectionModal');
    const selectionModalTitle = document.getElementById('selectionModalTitle');
    const selectionForm = document.getElementById('selectionForm');
    const selectionSettingKeyInput = document.getElementById('selectionSettingKey');
    const selectionOptionsContainer = document.getElementById('selectionOptionsContainer');
    const cancelSelectionButton = document.getElementById('cancelSelectionButton');
    const saveSelectionButton = document.getElementById('saveSelectionButton');
    const modalSelectionError = document.getElementById('modalSelectionError');
    
    // --- Variables de Estado ---
    let currentUserId = null;
    let currentUser = null;
    let userSettings = {
        theme: 'system', language: 'es', doble_factor_enabled: false,
        default_view: 'Dashboard', notify_fixed_expense: true,
        notify_budget_alert: true, notify_goal_reached: true,
    };
    let isLoading = false; // Para evitar guardados múltiples

    // --- Constantes ---
    const defaultAvatarPath = 'https://finai.es/images/avatar_predeterminado.png';
    const languageOptions = [ { value: 'es', text: 'Español' }, { value: 'en', text: 'English' } ];
    const defaultViewOptions = [ { value: 'Dashboard', text: 'Dashboard' }, { value: 'Accounts', text: 'Cuentas' }, { value: 'Transactions', text: 'Transacciones' }, { value: 'Budgets', text: 'Presupuestos' } ];

    // --- Funciones ---

    /** Muestra/Oculta un estado de carga visual y deshabilita controles */
    function setLoadingState(loading) {
        isLoading = loading;
        if (pageContainer) pageContainer.style.opacity = loading ? '0.5' : '1';
        // Asegurarse que los elementos existen antes de intentar deshabilitar
        if(allToggles) allToggles.forEach(toggle => toggle.disabled = loading);
        if(allButtons) allButtons.forEach(button => button.disabled = loading);
        console.log(`Loading state: ${loading ? 'ON' : 'OFF'}`);
    }

    function populateSelect(selectElement, items, valueField = 'id', textField = 'name', defaultOptionText = 'Selecciona...', includeAllOption = false, allOptionText = 'Todos/as', firstOptionValue = '') {
        if (!selectElement) { console.error("populateSelect: Elemento select no encontrado"); return; }
        selectElement.innerHTML = ''; // Limpiar siempre
        let hasDefaultSelected = false;
    
        // Añadir opción "Todos/as" si se requiere
        if (includeAllOption) {
            const allOpt = document.createElement('option');
            allOpt.value = 'all';
            allOpt.textContent = allOptionText;
            selectElement.appendChild(allOpt);
        }
    
        // Añadir opción por defecto si se proporciona texto para ella
        if (defaultOptionText) {
            const defaultOpt = document.createElement('option');
            defaultOpt.value = firstOptionValue; // Usar el valor proporcionado o ''
            defaultOpt.textContent = defaultOptionText;
            defaultOpt.disabled = (firstOptionValue === ''); // Deshabilitar si el valor es vacío
            defaultOpt.selected = (firstOptionValue === ''); // Seleccionar si el valor es vacío
            if(defaultOpt.selected) hasDefaultSelected = true;
            selectElement.appendChild(defaultOpt);
        }
    
        // Añadir los items proporcionados
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item[valueField];
            option.textContent = item[textField];
            selectElement.appendChild(option);
        });
    
         // Asegurarse de que la opción por defecto (vacía) esté seleccionada si no se seleccionó otra
         if (!hasDefaultSelected && firstOptionValue === '' && selectElement.options.length > (includeAllOption ? 1 : 0)) {
              selectElement.value = '';
         }
    }

    function toggleInfoModal(show) {
        if (!infoModal) return;
        if (show) { infoModal.style.display = 'flex'; setTimeout(() => infoModal.classList.add('active'), 10); }
        else { infoModal.classList.remove('active'); setTimeout(() => { infoModal.style.display = 'none'; }, 300); }
    }

    function openInfoModal(title, message) {
        if (!infoModalTitle || !infoModalMessage) { console.error("Elementos modal info no encontrados"); return; }
        infoModalTitle.innerHTML = `<i class="fas fa-info-circle"></i> ${title}`; // Poner título con icono
        infoModalMessage.textContent = message;
        toggleInfoModal(true);
         // Opcional: Enfocar botón al abrir
         setTimeout(() => infoModalCloseBtn?.focus(), 350);
    }

    function closeInfoModal() { toggleInfoModal(false); }

    function toggle2faModal(show) {
        if (!setup2faModal) return;
        if (show) { setup2faModal.style.display = 'flex'; setTimeout(() => setup2faModal.classList.add('active'), 10); }
        else { setup2faModal.classList.remove('active'); setTimeout(() => { setup2faModal.style.display = 'none'; if(verify2faForm) verify2faForm.reset(); if(mfaFactorIdInput) mfaFactorIdInput.value = ''; if(qrCodeContainer) qrCodeContainer.innerHTML = '<p>Cargando QR...</p>'; if(secretCodeDisplay) secretCodeDisplay.value = ''; if(modal2faError){ modal2faError.textContent=''; modal2faError.style.display='none';} currentFactorId = null; currentSecret = null; }, 300); }
    }

    function open2faModal(qrCodeSvg, secret, factorId) {
        if (!setup2faModal || !qrCodeContainer || !secretCodeDisplay || !mfaFactorIdInput || !modal2faError) {
            console.error("Elementos del modal 2FA no encontrados"); return;
        }
        console.log("Abriendo modal 2FA para factor:", factorId);
        qrCodeContainer.innerHTML = qrCodeSvg; // Mostrar QR
        secretCodeDisplay.value = secret;      // Mostrar secreto
        mfaFactorIdInput.value = factorId;     // Guardar ID del factor en input oculto
        currentFactorId = factorId;           // Guardar también en variable JS
        currentSecret = secret;               // Guardar secreto
        verificationCodeInput.value = '';     // Limpiar input código
        modal2faError.style.display = 'none'; // Ocultar errores previos
        verify2faButton.disabled = false;
        verify2faButton.textContent = 'Verificar y Activar';
        toggle2faModal(true);
        setTimeout(() => verificationCodeInput.focus(), 350); // Enfocar input código
    }

    async function close2faModal(unenrollOnCancel = true) {
        if (unenrollOnCancel && currentFactorId) {
            if (confirm("Si cancelas ahora, la configuración de 2FA no se completará y se deshará el paso inicial. ¿Continuar?")) {
                console.log(`Cancelando 2FA: Intentando desenrolar factor ${currentFactorId}`);
                setLoadingState(true); // Mostrar carga mientras desenrola
                try {
                     // Directamente usamos unenroll sin listar porque sabemos el ID
                    const { error } = await supabase.auth.mfa.unenroll({ factorId: currentFactorId });
                    if (error) {
                        // Podría fallar si requiere re-autenticación, informar al usuario
                        console.error("Error al desenrolar factor durante cancelación:", error);
                        alert(`No se pudo deshacer la activación inicial: ${error.message}\nEs posible que necesites desactivarlo manualmente más tarde.`);
                        // NO revertimos el toggle aquí, ya que el usuario lo puso en ON
                        // pero sí actualizamos el estado en la BD a false
                        await updateUserSetting('doble_factor_enabled', false);
                        if (twoFactorToggle) twoFactorToggle.checked = false; // Revertir visualmente
                    } else {
                         console.log("Factor desenrolado por cancelación.");
                         // Asegurar que el estado se guarde como false si se canceló
                         await updateUserSetting('doble_factor_enabled', false);
                         if (twoFactorToggle) twoFactorToggle.checked = false; // Revertir visualmente
                    }
                } catch (e) {
                     console.error("Error inesperado durante desenrolamiento por cancelación:", e);
                      alert(`Error inesperado al cancelar. Estado 2FA puede ser inconsistente.`);
                      // Revertir toggle visualmente por precaución
                       if (twoFactorToggle) twoFactorToggle.checked = false;
                       await updateUserSetting('doble_factor_enabled', false);

                } finally {
                     setLoadingState(false);
                     toggle2faModal(false); // Cerrar modal independientemente del resultado de unenroll
                }
            } else {
                 console.log("Cancelación de cierre de modal 2FA abortada por usuario.");
                 // No hacer nada si el usuario no confirma el cierre/cancelación
            }
        } else {
             // Si no hay factorId o no queremos desenrolar (ej. tras éxito), solo cerramos
             toggle2faModal(false);
        }
    }

    /** Intenta iniciar el proceso de enrolamiento MFA (TOTP) */
    async function startMfaEnrollment() {
        if (!currentUserId || isLoading) return;
        console.log("Iniciando enrolamiento MFA (TOTP)...");
        setLoadingState(true); // <-- poner en estado de carga
        let factorSuccessfullyEnrolled = false;
        try {
            // Asegurarse que el estado en la BD está como 'true' ANTES de enrolar
            // Podríamos esperar a que updateUserSetting termine, o confiar en que se llame antes.
            // Para más seguridad, actualizamos aquí también si no está ya en true
            if (!userSettings.doble_factor_enabled) {
                await updateUserSetting('doble_factor_enabled', true);
                 // Si updateUserSetting falló, no continuar
                 if (!userSettings.doble_factor_enabled) {
                      throw new Error("No se pudo marcar 2FA como activado antes de enrolar.");
                 }
            }


            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: 'totp', // Usar Time-based One-Time Password
            });

            if (error) throw new Error(`Error Supabase MFA Enroll: ${error.message}`);
            if (!data || !data.id || !data.totp?.qr_code || !data.totp?.secret) {
                 throw new Error("Respuesta de enrolamiento MFA inválida o incompleta.");
            }

            console.log("Enrolamiento MFA iniciado con éxito. Datos recibidos:", data);
            open2faModal(data.totp.qr_code, data.totp.secret, data.id);

        } catch (error) {
            console.error("Error en startMfaEnrollment:", error);
            alert(`Error al intentar activar 2FA: ${error.message}\n\nEl estado del interruptor se revertirá.`);
            // Revertir el estado visual y en la BD si falló el enrolamiento
            if (twoFactorToggle) twoFactorToggle.checked = false;
             // Solo intentar revertir en BD si NO se llegó a enrolar con éxito
             if (!factorSuccessfullyEnrolled) {
                 await updateUserSetting('doble_factor_enabled', false);
             } // Intentar guardar el estado revertido
        } finally {
            setLoadingState(false); // <-- Quitar estado de carga
        }
    }

    async function disableMfa() {
        if (!currentUserId || isLoading) return;
        console.log("Intentando desactivar MFA...");
        setLoadingState(true);

        try {
            // 1. Listar factores existentes (para obtener sus IDs)
             console.log("Listando factores MFA existentes...");
            const { data: factorsResponse, error: listError } = await supabase.auth.mfa.listFactors();

            if (listError) throw new Error(`Error listando factores MFA: ${listError.message}`);

            const enrolledFactors = factorsResponse?.all || [];
            console.log("Factores encontrados:", enrolledFactors);

            if (enrolledFactors.length === 0) {
                console.log("No hay factores MFA para desactivar.");
                if (userSettings.doble_factor_enabled) { // Solo guardar si estaba activo
                     await updateUserSetting('doble_factor_enabled', false);
                }
                alert("La autenticación de dos pasos ya estaba desactivada o no tenía factores.");
                setLoadingState(false); // Asegurar quitar loading
                return;
            }

            let unenrollErrors = [];
            for (const factor of enrolledFactors) {
                // Intentar desenrolar CUALQUIER factor listado (verificado o no)
                // Supabase puede requerir verificación adicional si ya estaba activo
                console.log(`Intentando desenrolar factor ID: ${factor.id} (Tipo: ${factor.factor_type}, Estado: ${factor.status})`);
                const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
                if (unenrollError) {
                    console.error(`Error al desenrolar factor ${factor.id}:`, unenrollError);
                    unenrollErrors.push(unenrollError.message);
                } else {
                     console.log(`Factor ${factor.id} desenrolado.`);
                }
           }

            if (unenrollErrors.length > 0) {
                 // Si hubo errores, informar pero intentar guardar el estado como 'false' igualmente?
                 // O revertir el toggle? Es más seguro revertir el toggle.
                 throw new Error(`No se pudieron desactivar todos los factores:\n- ${unenrollErrors.join('\n- ')}\nPuede requerir re-autenticación.`);
            }

            // 3. Si todo fue bien, guardar el estado 'false' en profiles
             await updateUserSetting('doble_factor_enabled', false);
            alert("Autenticación de dos pasos desactivada.");

        } catch (error) {
            console.error("Error en disableMfa:", error);
            alert(`Error al intentar desactivar 2FA: ${error.message}`);
            // Revertir el estado visual del toggle si falló la desactivación
             if (twoFactorToggle) twoFactorToggle.checked = true; // Volver a ponerlo activo
            // No intentamos guardar 'true' de nuevo, dejamos que el usuario lo intente otra vez si quiere
        } finally {
            setLoadingState(false);
        }
    }

    async function handleVerifyMfaCode(event) {
        event.preventDefault(); // Si se usa form submit
        if (isLoading || !currentFactorId) {
             console.warn("Verificación prevenida:", { isLoading, currentFactorId });
             return;
        }

        const verificationCode = verificationCodeInput.value.trim();
        if (!verificationCode || !/^[0-9]{6}$/.test(verificationCode)) {
            modal2faError.textContent = 'Introduce un código de 6 dígitos válido.';
            modal2faError.style.display = 'block';
            return;
        }

        console.log(`Verificando código ${verificationCode} para factor ${currentFactorId}`);
        modal2faError.style.display = 'none';
        setLoadingState(true); // Deshabilitar botones del modal
        verify2faButton.textContent = 'Verificando...';

        try {
            // Intentar verificar el código
            const { error: challengeError } = await supabase.auth.mfa.challenge({ factorId: currentFactorId });
             if (challengeError) throw new Error(`Error al generar challenge: ${challengeError.message}`);

             const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
                 factorId: currentFactorId,
                 code: verificationCode,
                 challengeId: challengeError ? null : (await supabase.auth.mfa.challenge({ factorId: currentFactorId })).data.id //Necesitamos challengeId, lo obtenemos aquí aunque la línea anterior tambien lo obtiene
             });


             if (verifyError) throw new Error(`Código de verificación incorrecto o inválido: ${verifyError.message}`);


            // ¡ÉXITO! Factor verificado y activado
            console.log("¡Factor MFA verificado y activado!", verifyData);
            alert("¡Autenticación de dos pasos activada correctamente!");

            // Ya guardamos 'true' en 'doble_factor_enabled' al inicio,
            // así que solo cerramos el modal SIN desenrolar.
            close2faModal(false); // false indica NO desenrolar al cerrar

        } catch (error) {
             console.error("Error verificando código MFA:", error);
             modal2faError.textContent = `Error: ${error.message}`;
             modal2faError.style.display = 'block';
        } finally {
            setLoadingState(false); // Habilitar botones de nuevo
             verify2faButton.textContent = 'Verificar y Activar';
        }
    }

    // --- Funciones Modal Confirmación Borrado Cuenta (NUEVO) ---
    function toggleDeleteModal(show) {
        if (!deleteAccountModal) return;
        if (show) { deleteAccountModal.style.display = 'flex'; setTimeout(() => deleteAccountModal.classList.add('active'), 10); }
        else { deleteAccountModal.classList.remove('active'); setTimeout(() => { deleteAccountModal.style.display = 'none'; if(deleteConfirmForm) deleteConfirmForm.reset(); if(modalDeleteError){ modalDeleteError.textContent=''; modalDeleteError.style.display='none';} }, 300); }
    }

    function openDeleteModal() {
        if (!currentUser || !deleteUserEmailEl || !modalDeleteError || !confirmDeleteButton) {
             alert("Error al preparar la confirmación de eliminación.");
             return;
        }
        deleteUserEmailEl.textContent = currentUser.email || 'tu email'; // Mostrar email
        modalDeleteError.style.display = 'none';
        confirmDeleteButton.disabled = false;
        confirmDeleteButton.textContent = 'Eliminar Mi Cuenta Permanentemente';
        toggleDeleteModal(true);
        setTimeout(() => deleteConfirmPasswordInput.focus(), 350);
    }

    function closeDeleteModal() { toggleDeleteModal(false); }

    /** Verifica contraseña y llama a Edge Function para borrar cuenta */
    async function handleConfirmAccountDeletion(event) {
        event.preventDefault();
        if (isLoading || !currentUser) return;

        const enteredPassword = deleteConfirmPasswordInput.value;
        if (!enteredPassword) {
            modalDeleteError.textContent = 'Introduce tu contraseña actual para confirmar.';
            modalDeleteError.style.display = 'block';
            return;
        }

        modalDeleteError.style.display = 'none';
        setLoadingState(true); // Deshabilitar botones
        confirmDeleteButton.textContent = 'Verificando...';

        try {
            // 1. Verificar Contraseña Actual (Reautenticación simulada)
            console.log("Verificando contraseña para eliminación...");
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: currentUser.email,
                password: enteredPassword,
            });

            // IMPORTANTE: signInWithPassword refresca la sesión. Si bien verifica,
            // no es ideal usarlo solo para verificar sin manejar la nueva sesión.
            // Una alternativa futura sería una Edge Function 'verify-password'.
            // Por ahora, asumimos que si no da error, la contraseña es correcta.

            if (signInError) {
                console.error("Error de verificación de contraseña:", signInError);
                // Diferenciar error de contraseña incorrecta de otros errores
                if (signInError.message.includes('Invalid login credentials')) {
                    throw new Error('Contraseña actual incorrecta.');
                } else {
                    throw new Error(`Error de verificación: ${signInError.message}`);
                }
            }

            console.log("Contraseña verificada. Invocando función de eliminación...");
            confirmDeleteButton.textContent = 'Eliminando...';

            // 2. Llamar a la Edge Function (Placeholder)
            const functionName = 'delete_user_account';
            const { data, error: functionError } = await supabase.functions.invoke(functionName, {
                method: 'POST',
            });

            if (functionError) {
                console.error(`Error invocando Edge Function '${functionName}':`, functionError);
                // Revisar el error específico puede dar pistas
                if (functionError.message.includes('Function not found')) {
                     throw new Error(`La función de eliminación (${functionName}) aún no está creada en el servidor.`);
                } else {
                     throw new Error(`Error del servidor al eliminar: ${functionError.message}`);
                }
            }

            // 3. Éxito (Asumiendo que la función se ejecutó)
            console.log(`Respuesta de Edge Function '${functionName}':`, data);
            alert("Solicitud de eliminación recibida. Tu cuenta y datos se eliminarán en breve. Serás desconectado.");
            await supabase.auth.signOut(); // Forzar cierre de sesión

        } catch (error) {
            console.error("Error durante confirmación/eliminación de cuenta:", error);
            modalDeleteError.textContent = `Error: ${error.message}`;
            modalDeleteError.style.display = 'block';
            setLoadingState(false); // Rehabilitar en caso de error
            confirmDeleteButton.textContent = 'Eliminar Mi Cuenta Permanentemente';
        }
        // No hacemos setLoading(false) en caso de éxito porque signOut debería redirigir
    }

    /** Aplica el tema (clase al body) y actualiza botones del selector */
     function applyTheme(selectedTheme) {
        document.body.classList.remove('light-mode', 'dark-mode');
        console.log("Aplicando tema seleccionado:", selectedTheme);
        let effectiveTheme = selectedTheme;

        if (selectedTheme === 'system') {
             if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                 effectiveTheme = 'dark';
             } else {
                 effectiveTheme = 'light';
             }
             console.log(`Tema Sistema detectado como: ${effectiveTheme}`);
        }

        if (effectiveTheme === 'dark') {
             document.body.classList.add('dark-mode');
        } else {
             document.body.classList.add('light-mode');
        }

        if (themeSelector) {
            themeSelector.querySelectorAll('.theme-option').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.theme === selectedTheme);
            });
        }
    }

    function formatCurrency(value, currency = 'EUR') {
        // ¡Esta función no se usa directamente en Settings.js por ahora,
        // pero es bueno tenerla por consistencia si la necesitaras!
        if (isNaN(value) || value === null) return 'N/A'; // O '€0.00'
        try {
             return new Intl.NumberFormat('es-ES', { style: 'currency', currency: currency, minimumFractionDigits: 2 }).format(value);
        } catch(e) {
            console.error("Error formatting currency:", value, currency, e);
            return `${Number(value).toFixed(2)} ${currency}`;
        }
    }

    function formatDate(dateString, options = { day: '2-digit', month: '2-digit', year: 'numeric' }) {
        // ¡Esta función tampoco se usa directamente en Settings.js ahora mismo,
        // pero la incluimos por si la necesitas para alguna futura opción!
        if (!dateString) return '--/--/----';
        try {
            const date = new Date(dateString);
            const offset = date.getTimezoneOffset();
            const adjustedDate = new Date(date.getTime() + (offset * 60 * 1000));
            if (isNaN(adjustedDate.getTime())) return '--/--/----';
            return adjustedDate.toLocaleDateString('es-ES', options);
        } catch (e) {
            console.error("Error formateando fecha:", dateString, e);
            return '--/--/----';
        }
    }

    /** Carga las configuraciones del perfil del usuario desde Supabase */
    async function loadUserSettings() {
        if (!currentUserId) { console.error("Settings.js: No user ID."); return; }
        console.log("Cargando configuraciones para user:", currentUserId);
        setLoadingState(true);
        
        let profile = null;
        let error = null;

        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('theme, language, doble_factor_enabled, default_view, notify_fixed_expense, notify_budget_alert, notify_goal_reached, avatar_url')
                .eq('id', currentUserId)
                .single();  

            // Ahora el error 406 no debería ocurrir si creaste la fila
            if (error) throw error;
            if (!profile) {
                console.warn("No se encontró perfil, aplicando configuración por defecto.");
                updateUISettings(); // Mostrar UI con los valores por defecto
                setLoadingState(false);
                return;
             }  

            // Si llega aquí, el perfil SÍ se encontró
            console.log("Perfil encontrado:", profile);
            userSettings.theme = profile.theme ?? 'system';
            userSettings.language = profile.language ?? 'es';
            userSettings.doble_factor_enabled = profile.doble_factor_enabled ?? false;
            userSettings.default_view = profile.default_view ?? 'Dashboard';
            userSettings.notify_fixed_expense = profile.notify_fixed_expense ?? true;
            userSettings.notify_budget_alert = profile.notify_budget_alert ?? true;
            userSettings.notify_goal_reached = profile.notify_goal_reached ?? true;

            if(userAvatarSmall) userAvatarSmall.src = profile.avatar_url || defaultAvatarPath;

            updateUISettings();
        } catch (error) {
             // Manejar error si la fila existe pero hay otro problema (ej. RLS)
            if (error.code === 'PGRST116' || error.message.includes('0 rows')) {
                 // Esto no debería pasar ahora que creaste la fila, pero lo dejamos por si acaso
                 console.log("Perfil no encontrado (inesperado), usando defaults.");
                 if(userAvatarSmall) userAvatarSmall.src = defaultAvatarPath;
            } else {
                console.error("Error cargando configuración:", error);
                alert(`Error al cargar la configuración: ${error.message}`);
            }
            updateUISettings(); // Mostrar defaults si falla
        } finally {
            setLoadingState(false);
        }
    }

    /** Actualiza los controles de la UI con los valores del estado `userSettings` */
    function updateUISettings() {
        // ... (código de updateUISettings igual que en la respuesta anterior) ...
        if (!document.body.contains(pageContainer)) return;
        console.log("Actualizando UI con settings:", userSettings);
        try {
            applyTheme(userSettings.theme);
            if(languageValueEl) { languageValueEl.textContent = userSettings.language === 'en' ? 'English ' : 'Español '; languageValueEl.insertAdjacentHTML('beforeend', '<i class="fas fa-chevron-right"></i>'); }
            if(twoFactorToggle) twoFactorToggle.checked = userSettings.doble_factor_enabled;
            // Asegúrate que las claves aquí coincidan con tu objeto userSettings y las columnas DB
            if(notifyFixedExpenseToggle) notifyFixedExpenseToggle.checked = userSettings.notify_fixed_expense;
            if(notifyBudgetAlertToggle) notifyBudgetAlertToggle.checked = userSettings.notify_budget_alert;
            if(notifyGoalReachedToggle) notifyGoalReachedToggle.checked = userSettings.notify_goal_reached;
            if(defaultViewValueEl) { defaultViewValueEl.textContent = userSettings.default_view || 'Dashboard'; defaultViewValueEl.insertAdjacentHTML('beforeend', ' <i class="fas fa-chevron-right"></i>'); }
            if(mainCurrencyEl) mainCurrencyEl.textContent = 'EUR (Predet.)';
            if(appVersionEl) appVersionEl.textContent = 'FinAi v1.0.0';
        } catch (error) { console.error("Error actualizando UI:", error); }
    }

    function toggleSelectionModal(show) {
        if (!selectionModal) return;
        if (show) { selectionModal.style.display = 'flex'; setTimeout(() => selectionModal.classList.add('active'), 10); }
        else { selectionModal.classList.remove('active'); setTimeout(() => { selectionModal.style.display = 'none'; if (selectionForm) selectionForm.reset(); if(selectionOptionsContainer) selectionOptionsContainer.innerHTML = ''; if (modalSelectionError) { modalSelectionError.textContent = ''; modalSelectionError.style.display = 'none'; } }, 300); }
    }

    function openSelectionModal(settingKey, title, options, currentValue) {
        // Log al inicio de la función
        console.log('DEBUG: openSelectionModal llamada con:', { settingKey, title, currentValue });
    
        // Verificar si se encuentran los elementos del modal
        if (!selectionModal || !selectionModalTitle || !selectionSettingKeyInput || !selectionOptionsContainer || !saveSelectionButton) {
            console.error("ERROR en openSelectionModal: ¡Elementos del modal NO encontrados! Verifica IDs en HTML.", {
                 selectionModal, selectionModalTitle, selectionSettingKeyInput, selectionOptionsContainer, saveSelectionButton
             });
            alert("Error al intentar abrir el selector.");
            return;
        }
         console.log("DEBUG: Elementos del modal de selección encontrados.");
    
        modalSelectionError.style.display = 'none';
        selectionModalTitle.textContent = title;
        selectionSettingKeyInput.value = settingKey;
        selectionOptionsContainer.innerHTML = ''; // Limpiar opciones
    
        // Crear radio buttons
        console.log("DEBUG: Creando opciones de radio...");
        options.forEach(option => {
            const label = document.createElement('label');
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'selectedValue';
            radio.value = option.value;
            radio.id = `option-${settingKey}-${option.value}`;
            if (option.value === currentValue) {
                radio.checked = true;
                console.log(`DEBUG: Opción "${option.text}" marcada como actual.`);
            }
            label.appendChild(radio);
            label.appendChild(document.createTextNode(` ${option.text}`));
            label.htmlFor = radio.id;
            selectionOptionsContainer.appendChild(label);
        });
        console.log("DEBUG: Opciones de radio creadas.");
    
        saveSelectionButton.disabled = false;
        saveSelectionButton.textContent = 'Guardar Selección';
        toggleSelectionModal(true); // Intenta mostrar el modal
         console.log("DEBUG: toggleSelectionModal(true) llamado.");
    }

    function closeSelectionModal() { toggleSelectionModal(false); }

    async function handleSelectionFormSubmit(event) {
        event.preventDefault();
        if (!selectionForm || isLoading) return;

        const settingKey = selectionSettingKeyInput.value;
        const selectedRadio = selectionForm.querySelector('input[name="selectedValue"]:checked');

        if (!settingKey || !selectedRadio) {
            modalSelectionError.textContent = 'Por favor, selecciona una opción.';
            modalSelectionError.style.display = 'block';
            return;
        }

        const selectedValue = selectedRadio.value;
        modalSelectionError.style.display = 'none';
        saveSelectionButton.disabled = true;
        saveSelectionButton.textContent = 'Guardando...';

        try {
            // Llamar a la función genérica de guardado
            await updateUserSetting(settingKey, selectedValue);
            // Si el guardado fue exitoso (no hubo error que recargara todo), actualizamos la UI
            updateUISettings(); // Refresca el texto mostrado en la página principal
            closeSelectionModal();
        } catch (error) {
             // El error ya se maneja dentro de updateUserSetting (muestra alerta y recarga)
             // No necesitamos hacer mucho más aquí, excepto quizás mantener el modal abierto
             saveSelectionButton.disabled = false; // Rehabilitar si falló y no se recargó
             saveSelectionButton.textContent = 'Guardar Selección';
        }
        // No necesitamos un 'finally' aquí porque updateUserSetting ya maneja setLoadingState(false)
    }

    /** Guarda una preferencia específica en la tabla profiles (COMPLETADO) */
    async function updateUserSetting(settingKey, settingValue) {
        // Quitado: if (!currentUserId || isLoading) return;
        if (!currentUserId) { // Mantenemos el chequeo de usuario
             console.warn(`Guardado prevenido: No hay User ID.`);
             return;
        }
    
        console.log(`Guardando setting: ${settingKey} = ${settingValue}`);
        // setLoadingState lo maneja la función que llama a esta
    
        try {
            const updateData = {
                 updated_at: new Date(),
                 [settingKey]: settingValue
             };
            const { error } = await supabase
                .from('profiles')
                .update(updateData)
                .eq('id', currentUserId);
            if (error) throw new Error(`Error al guardar ${settingKey}: ${error.message}`);
    
            console.log(`Setting ${settingKey} guardado con éxito.`);
            userSettings[settingKey] = settingValue; // Actualizar estado local
    
        } catch (error) {
            console.error(`Error general guardando ${settingKey}:`, error);
            alert(`Error al guardar la preferencia "<span class="math-inline">\{settingKey\}"\.\\n\(</span>{error.message})`);
            await loadUserSettings(); // Recargar para consistencia
        } finally {
            // setLoadingState lo maneja la función que llama a esta
        }
    }
    function setActiveSidebarLink() {
        const currentPagePath = window.location.pathname;
        // Usamos querySelectorAll en el NAV dentro de la sidebar
        const navButtons = document.querySelectorAll('.sidebar-nav .nav-button[data-page]');
    
        if (!navButtons || navButtons.length === 0) {
            console.warn("setActiveSidebarLink: No se encontraron botones de navegación con 'data-page'.");
            return;
        }
    
        let mostSpecificMatch = null;
    
        navButtons.forEach(button => {
            const linkPath = button.getAttribute('data-page');
            button.classList.remove('active'); // Limpiar todos primero
    
            // Comprobar si la ruta actual COMIENZA con la ruta del botón
            if (linkPath && currentPagePath.startsWith(linkPath)) {
                // Priorizar la coincidencia más específica (más larga)
                if (!mostSpecificMatch || linkPath.length > mostSpecificMatch.dataset.page.length) {
                    mostSpecificMatch = button;
                }
            }
        });
    
        // Activar el botón más específico encontrado
        if (mostSpecificMatch) {
            mostSpecificMatch.classList.add('active');
            console.log('setActiveSidebarLink: Active link set to:', mostSpecificMatch.dataset.page);
        } else {
             // Si no hay coincidencia, marcar Dashboard por defecto
             const dashboardButton = document.querySelector('.sidebar-nav .nav-button[data-page="/Dashboard.html"]');
             if (dashboardButton) dashboardButton.classList.add('active');
             console.log('setActiveSidebarLink: No specific match, defaulting to Dashboard.');
        }
    }

    function addSidebarNavigationListeners() {
        console.log("Attempting to add sidebar listeners...");
        const navButtons = document.querySelectorAll('.sidebar-nav .nav-button[data-page]');
        console.log(`Found ${navButtons.length} nav buttons.`);
        navButtons.forEach(button => {
            // Evitar añadir múltiples listeners
            if (button.dataset.listenerAttached === 'true') return;
    
            button.addEventListener('click', () => {
                const pageUrl = button.getAttribute('data-page');
                if (pageUrl && window.location.pathname !== pageUrl) {
                    console.log(`Navegando a: ${pageUrl}`);
                    window.location.href = pageUrl;
                } else if (pageUrl) {
                     console.log(`Ya estás en ${pageUrl} o no se encontró la URL.`);
                }
            });
            button.dataset.listenerAttached = 'true'; // Marcar que ya tiene listener
        });
    
        // Listener para el botón de logout
        const logoutButton = document.getElementById('btnLogoutSidebar');
        if (logoutButton) {
             console.log("Found logout button, attaching listener.");
             // Evitar añadir múltiples listeners
             if (logoutButton.dataset.listenerAttached !== 'true') {
                 logoutButton.addEventListener('click', async () => {
                     console.log("Logout button clicked");
                     // Asegúrate que 'supabase' está disponible en este scope
                     if (typeof supabase !== 'undefined' && supabase.auth && typeof supabase.auth.signOut === 'function') {
                         logoutButton.disabled = true; // Deshabilitar mientras cierra
                         const { error } = await supabase.auth.signOut();
                         if (error) {
                             console.error("Error during sign out:", error);
                             alert("Error al cerrar sesión.");
                             logoutButton.disabled = false; // Rehabilitar si hay error
                         }
                         // No redirigir aquí, auth-listener.js lo hará
                     } else {
                          console.error("Supabase client or signOut function not available for logout.");
                          alert("Error interno al cerrar sesión.");
                     }
                 });
                 logoutButton.dataset.listenerAttached = 'true'; // Marcar que ya tiene listener
             }
        } else {
             console.error("ERROR: Botón #btnLogoutSidebar no encontrado para añadir listener!");
        }
    }
    

    // --- Asignación de Event Listeners ---
    document.addEventListener('authReady', (e) => {
        console.log('Settings.js: Received authReady event.');
        currentUser = e.detail.user;
        currentUserId = currentUser?.id;
        if(currentUserId) { loadUserSettings(); }
        else { console.warn("Settings.js: No user."); if(pageContainer) pageContainer.innerHTML = '<p style="color:orange; text-align:center;">Debes iniciar sesión.</p>'; }
    });

    document.addEventListener('DOMContentLoaded', () => {
        console.log("Settings.js: DOM fully loaded.");

        // Navegación básica (igual que antes)
        if (backButton) backButton.addEventListener('click', () => { if (currentView === 'detail') switchView('list'); else window.location.href = '/Dashboard.html'; });
        if (editProfileBtn) editProfileBtn.addEventListener('click', () => { window.location.href = '/Profile.html'; });
        if (manageCategoriesBtn) manageCategoriesBtn.addEventListener('click', () => { window.location.href = '/Categories.html'; });
        if (changePasswordBtn) changePasswordBtn.addEventListener('click', () => { window.location.href = '/ChangePassword.html'; }); // Ajusta nombre si es necesario
        if (logoutBtn) logoutBtn.addEventListener('click', async () => { setLoadingState(true); await supabase.auth.signOut(); });

        console.log("Initializing sidebar...");
         setActiveSidebarLink();             // <--- LLAMADA 1
         addSidebarNavigationListeners(); 

        // ---- Listener para Selector de Tema (IMPLEMENTADO) ----
        if (themeSelector) {
            themeSelector.addEventListener('click', (event) => {
                const button = event.target.closest('.theme-option');
                // Evitar doble ejecución si ya se está guardando/cargando
                if (button && button.dataset.theme && !isLoading) {
                    const newTheme = button.dataset.theme;
                    // Actualizar UI inmediatamente (optimista)
                    applyTheme(newTheme);
                    // Guardar en Base de Datos
                    updateUserSetting('theme', newTheme);
                }
            });
        }
        // ----------------------------------------------------
        // Botón Editar Perfil
        if (editProfileBtn) {
            editProfileBtn.addEventListener('click', () => {
                if (isLoading) return; // No navegar si se está cargando/guardando algo
                console.log("Navegando a Perfil...");
                window.location.href = '/Profile.html'; // Ruta a tu página de perfil
            });
        }
        // Botón Gestionar Categorías
        if (manageCategoriesBtn) {
            manageCategoriesBtn.addEventListener('click', () => {
                if (isLoading) return;
                console.log("Navegando a Categorías...");
                window.location.href = '/Categories.html'; // Ruta a tu página de categorías
            });
        }
        if (changePasswordBtn) {
            changePasswordBtn.addEventListener('click', () => {
                if (isLoading) return;
                console.log("Navegando a Cambiar Contraseña...");
                // Asegúrate de crear esta página ChangePassword.html más adelante
                window.location.href = '/Change_Password.html';
                // O si prefieres mostrar alerta hasta que la página exista:
                //alert("Página para cambiar contraseña pendiente de creación.");
            });
        }
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                if (isLoading) return; // Evitar si ya está procesando algo
                console.log("Cerrando sesión...");
                setLoadingState(true); // Mostrar estado de carga/deshabilitar botones
    
                try {
                    const { error } = await supabase.auth.signOut();
                    if (error) {
                        throw error; // Lanzar error para el catch
                    }
                    // SI EL CIERRE ES EXITOSO:
                    // auth-listener.js detectará el evento 'SIGNED_OUT'
                    // y se encargará de redirigir a Login.html.
                    // No necesitamos redirigir manualmente aquí.
                    console.log("Llamada a signOut completada.");
                    // Podríamos dejar el setLoadingState(true) porque la página va a cambiar
    
                } catch (error) {
                    console.error('Error al cerrar sesión:', error);
                    alert('Error al cerrar sesión: ' + error.message);
                    setLoadingState(false); // Rehabilitar botones si falla el cierre
                }
            });
        }
        // Toggle Autenticación de Dos Pasos (2FA)
        if (twoFactorToggle) {
            twoFactorToggle.addEventListener('change', async () => {
                if (isLoading) {
                     console.log("Ignorando cambio de toggle 2FA, operación en curso.");
                     // Revertir visualmente si el usuario intenta cambiarlo mientras carga
                     twoFactorToggle.checked = !twoFactorToggle.checked;
                     return;
                 }
                const shouldBeEnabled = twoFactorToggle.checked;
                console.log(`Toggle 2FA cambiado a: ${shouldBeEnabled}`);
                if (shouldBeEnabled) {
                    await startMfaEnrollment(); // Inicia enrolamiento, maneja errores y estado BD
                } else {
                    await disableMfa(); // Desactiva factores, maneja errores y estado BD
                }
            });
        }

        if (cancel2faButton) {
            cancel2faButton.addEventListener('click', () => {
                // Llama a close2faModal con true para intentar desenrolar al cancelar
                 close2faModal(true);
            });
        }

        if (setup2faModal) {
            setup2faModal.addEventListener('click', (event) => {
                // Cerrar si se hace clic fuera del contenido, pero confirmar desenrolamiento
                if (event.target === setup2faModal) {
                    close2faModal(true);
                }
            });
       }
       if (verify2faForm) {
           verify2faForm.addEventListener('submit', handleVerifyMfaCode);
       }
        // Botón Copiar Secreto
        if(copySecretBtn && secretCodeDisplay) {
           copySecretBtn.addEventListener('click', () => {
                if(currentSecret) {
                   navigator.clipboard.writeText(currentSecret)
                       .then(() => alert("Clave secreta copiada al portapapeles."))
                       .catch(err => alert("Error al copiar la clave. Cópiala manualmente."));
                }
            });
        }

        // Toggles de Notificaciones
        const notificationToggles = [
            { element: notifyFixedExpenseToggle, dbColumn: 'notify_fixed_expense' },
            { element: notifyBudgetAlertToggle, dbColumn: 'notify_budget_alert' },
            { element: notifyGoalReachedToggle, dbColumn: 'notify_goal_reached' }
        ];
        notificationToggles.forEach(({ element, dbColumn }) => {
            if (element) {
                element.addEventListener('change', () => {
                    if (isLoading) return;
                    const isEnabled = element.checked;
                    console.log(`Cambiando notificación ${dbColumn} a: ${isEnabled}`);
                    // Guardar preferencia en la columna correspondiente
                    updateUserSetting(dbColumn, isEnabled);
                    // Nota: La lógica para *generar* y *enviar* estas notificaciones
                    // es una tarea separada (probablemente con Edge Functions).
                });
            } else { console.warn(`Toggle no encontrado para ${dbColumn}`); }
        });
        if (languageSetting) {
            console.log("DEBUG: Elemento #languageSetting encontrado. Añadiendo listener...");
           languageSetting.addEventListener('click', () => {
               console.log("DEBUG: Clic en #languageSetting detectado. isLoading:", isLoading); // Log al hacer clic
               if (isLoading) return;
               try { // Añadir try-catch por si acaso
                    openSelectionModal(
                       'language',
                       'Seleccionar Idioma',
                       languageOptions,
                       userSettings.language
                   );
               } catch (error) { console.error("ERROR al llamar openSelectionModal para idioma:", error); }
           });
       } else {
            console.error("ERROR: Elemento #languageSetting NO encontrado!");
       }
   
       // Selector de Vista Inicial
       if (defaultViewSetting) {
           console.log("DEBUG: Elemento #defaultViewSetting encontrado. Añadiendo listener...");
            defaultViewSetting.addEventListener('click', () => {
               console.log("DEBUG: Clic en #defaultViewSetting detectado. isLoading:", isLoading); // Log al hacer clic
                if (isLoading) return;
                try { // Añadir try-catch
                    openSelectionModal(
                       'default_view',
                       'Seleccionar Vista Inicial',
                       defaultViewOptions,
                       userSettings.default_view
                    );
                } catch (error) { console.error("ERROR al llamar openSelectionModal para vista inicial:", error); }
                // alert("Selector de vista inicial pendiente de implementación completa..."); // Comentamos el alert por ahora
            });
       } else {
            console.error("ERROR: Elemento #defaultViewSetting NO encontrado!");
       }
        // Botón Exportar Datos
        if (exportDataBtn) {
            exportDataBtn.addEventListener('click', async () => {
                if (isLoading || !supabase) return;
                console.log("Botón Exportar presionado. Llamando Edge Function...");
                setLoadingState(true);
                exportDataBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exportando...'; // Mejor feedback
    
                try {
                    // Invocar la función (esperamos JSON o CSV)
                    const { data, error } = await supabase.functions.invoke('export_data', {
                        method: 'POST',
                        // IMPORTANTE: Especificar que podemos aceptar CSV o JSON
                        // aunque el navegador manejará el CSV por Content-Disposition si viene así
                        headers: {
                            'Accept': 'text/csv, application/json'
                        }
                    });
    
                    if (error) {
                        // Error al invocar la función (red, crash de función)
                        console.error("Error invocando Edge Function 'export_data':", error);
                         // Intenta obtener un mensaje más útil del error si está anidado
                         const message = error.context?.message || error.message || 'Error al contactar con el servicio de exportación.';
                        throw new Error(message);
                    }
    
                    // La invocación fue exitosa, ahora vemos qué nos devolvió
    
                    // CASO 1: La función devolvió JSON indicando que no hay datos
                    if (data && data.status === 'empty') {
                        console.log("Exportación completada, pero no había datos.");
                        openInfoModal('Exportar Datos', data.message || "No se encontraron transacciones para exportar.");
                    }
                    // CASO 2: La función devolvió CSV (implícito, no necesitamos procesar 'data')
                    else {
                        // El navegador debería haber iniciado la descarga gracias a las cabeceras
                        console.log("Llamada a export_data exitosa, la descarga del CSV debería iniciarse/haberse iniciado.");
                        // No mostramos 'alert' aquí para no interrumpir la posible descarga
                    }
    
                } catch (error) {
                    console.error('Error durante la exportación:', error);
                    alert(`Error al exportar datos: ${error.message}`);
                } finally {
                    setLoadingState(false); // Quitar estado de carga
                    exportDataBtn.innerHTML = '<i class="fas fa-download"></i> Exportar Datos'; // Restaurar
                }
            });
        }
        // Botón Importar Datos
        if (importDataBtn) {
            importDataBtn.addEventListener('click', () => {
                if (isLoading) return;
                console.log("Botón Importar presionado.");
                alert("La importación de datos es una funcionalidad compleja pendiente de implementación (requiere análisis de CSV y creación de registros).");
                // Aquí iría la lógica para abrir un selector de archivo y procesarlo
            });
        }

        // Botón Eliminar Cuenta
        if (deleteAccountBtn) {
            deleteAccountBtn.addEventListener('click', () => {
                if (isLoading) return;
                console.log("Botón Eliminar Cuenta presionado -> Abriendo modal.");
                openDeleteModal(); // <-- Abre el nuevo modal en lugar de llamar a la lógica vieja
            });
        }

        if (infoModalCloseBtn) infoModalCloseBtn.addEventListener('click', closeInfoModal);
        if (infoModal) infoModal.addEventListener('click', (event) => { if (event.target === infoModal) closeInfoModal(); });

        // ---- Listeners para Enlaces de Ayuda (NUEVO) ----

        if (helpLink) {
            helpLink.addEventListener('click', (event) => {
                event.preventDefault(); // Evita que el enlace intente navegar
                if (isLoading) return;
                alert("Enlace al Centro de Ayuda / FAQ pendiente.");
                // En el futuro, cambiarías esto por:
                // window.location.href = '/ruta/a/tu/pagina/de/ayuda';
                // O abrirías una nueva pestaña:
                // window.open('/ruta/a/tu/pagina/de/ayuda', '_blank');
            });
        }
    
        if (privacyLink) {
            privacyLink.addEventListener('click', (event) => {
                event.preventDefault();
                if (isLoading) return;
                alert("Enlace a la Política de Privacidad pendiente.");
                // window.open('/ruta/a/tu/politica/privacidad', '_blank');
            });
        }
    
        if (termsLink) {
            termsLink.addEventListener('click', (event) => {
                event.preventDefault();
                if (isLoading) return;
                alert("Enlace a los Términos de Servicio pendiente.");
                // window.open('/ruta/a/tu/terminos/servicio', '_blank');
            });
        }

        // Modal de Selección Genérico (NUEVO)
        if (cancelDeleteButton) cancelDeleteButton.addEventListener('click', closeDeleteModal);
        if (deleteAccountModal) deleteAccountModal.addEventListener('click', (event) => { if (event.target === deleteAccountModal) closeDeleteModal(); });
        if (deleteConfirmForm) deleteConfirmForm.addEventListener('submit', handleConfirmAccountDeletion);

        // Scroll to top (igual que antes)
        if (scrollTopBtn) { window.addEventListener('scroll', () => { scrollTopBtn.classList.toggle('visible', window.scrollY > 300); }); scrollTopBtn.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); }); }

    }); // Fin DOMContentLoaded

} // Fin check Supabase