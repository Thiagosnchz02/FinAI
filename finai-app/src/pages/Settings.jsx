/*
Archivo: src/pages/Settings.jsx
Propósito: Componente para la página de configuración general de la aplicación y cuenta.
*/
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient'; // Asegúrate que la ruta sea correcta
import QRCode from 'qrcode.react'; // Para mostrar QR de 2FA

// Importa imágenes
import finAiLogo from '../assets/Logo_FinAI_Oficial.png'; // Asegúrate que la ruta sea correcta
import defaultAvatar from '../assets/avatar_predeterminado.png'; // Asegúrate que la ruta sea correcta

// --- Constantes y Opciones ---
const languageOptions = [ { value: 'es', text: 'Español' }, { value: 'en', text: 'English' } ];
const defaultViewOptions = [ { value: 'Dashboard', text: 'Dashboard' }, { value: 'Accounts', text: 'Cuentas' }, { value: 'Transactions', text: 'Transacciones' }, { value: 'Budgets', text: 'Presupuestos' } ];
const APP_VERSION = 'v1.0.0'; // O desde variables de entorno

// --- Componente Principal ---
function Settings() {
    // --- Estado ---
    const [userId, setUserId] = useState(null);
    const [userEmail, setUserEmail] = useState('');
    const [userAvatarUrl, setUserAvatarUrl] = useState(defaultAvatar);
    const [settings, setSettings] = useState({
        theme: 'system', language: 'es', doble_factor_enabled: false,
        default_view: 'Dashboard', notify_fixed_expense: true,
        notify_budget_alert: true, notify_goal_reached: true,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false); // Estado genérico para guardado rápido (toggles, tema)
    const [isProcessing, setIsProcessing] = useState(false); // Estado para operaciones más largas (2FA, delete, export)

    // Modales
    const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
    const [isSetup2faModalOpen, setIsSetup2faModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

    // Configuración Modales
    const [selectionModalConfig, setSelectionModalConfig] = useState({ title: '', options: [], settingKey: '', currentValue: '' });
    const [infoModalConfig, setInfoModalConfig] = useState({ title: 'Información', message: '' });
    const [mfaSetupData, setMfaSetupData] = useState({ factorId: null, qrCodeSvgString: '', secret: '' }); // Para datos 2FA

    // Otros
    const [showScrollTop, setShowScrollTop] = useState(false);
    const isMounted = useRef(true);
    const navigate = useNavigate();

    // --- Carga Inicial ---
    const fetchInitialData = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                console.error('Settings: No user session.', userError);
                if (isMounted.current) navigate('/login');
                return;
            }
            if (!isMounted.current) return;
            setUserId(user.id);
            setUserEmail(user.email || '');

            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('theme, language, doble_factor_enabled, default_view, notify_fixed_expense, notify_budget_alert, notify_goal_reached, avatar_url')
                .eq('id', user.id)
                .single();

            if (!isMounted.current) return;

            if (profileError && profileError.code !== 'PGRST116') {
                throw new Error(`Error cargando perfil: ${profileError.message}`);
            }

            if (profile) {
                setSettings({
                    theme: profile.theme ?? 'system',
                    language: profile.language ?? 'es',
                    doble_factor_enabled: profile.doble_factor_enabled ?? false,
                    default_view: profile.default_view ?? 'Dashboard',
                    notify_fixed_expense: profile.notify_fixed_expense ?? true,
                    notify_budget_alert: profile.notify_budget_alert ?? true,
                    notify_goal_reached: profile.notify_goal_reached ?? true,
                });
                setUserAvatarUrl(profile.avatar_url || defaultAvatar);
            } else {
                // Perfil no encontrado (usuario nuevo?), usar defaults ya establecidos
                console.warn("Perfil no encontrado, usando defaults.");
                setUserAvatarUrl(defaultAvatar);
            }
        } catch (error) {
            console.error("Error loading initial data:", error);
             if (isMounted.current) {
                // Mostrar error en UI si se desea
             }
        } finally {
            if (isMounted.current) setIsLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        isMounted.current = true;
        fetchInitialData();
        return () => { isMounted.current = false; };
    }, [fetchInitialData]);

    // --- Aplicar Tema ---
    const applyTheme = useCallback((selectedTheme) => {
        document.body.classList.remove('light-mode', 'dark-mode');
        let effectiveTheme = selectedTheme;
        if (selectedTheme === 'system') {
            effectiveTheme = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light';
        }
        if (effectiveTheme === 'dark') {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.add('light-mode');
        }
    }, []);

    useEffect(() => {
        applyTheme(settings.theme);
        // Listener para cambios de tema del sistema
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
            if (settings.theme === 'system') {
                applyTheme('system');
            }
        };
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [settings.theme, applyTheme]);

    // --- Scroll-Top ---
    useEffect(() => {
        const handleScroll = () => {
            if (isMounted.current) setShowScrollTop(window.scrollY > 300);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // --- Guardado Genérico ---
    const handleUpdateSetting = useCallback(async (key, value) => {
        if (!userId) return;
        setIsSaving(true); // Usar saving para cambios rápidos
        console.log(`Saving setting: ${key} = ${value}`);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ [key]: value, updated_at: new Date() })
                .eq('id', userId);
            if (error) throw error;
            // Actualizar estado local SIEMPRE después de éxito en DB
            setSettings(prev => ({ ...prev, [key]: value }));
            console.log(`Setting ${key} saved successfully.`);
        } catch (error) {
            console.error(`Error saving setting ${key}:`, error);
            alert(`Error al guardar la preferencia: ${error.message}`);
            // Opcional: Recargar todo si falla? O revertir UI?
            // fetchInitialData(); // Podría ser demasiado pesado
        } finally {
            setIsSaving(false);
        }
    }, [userId, supabase]);

    // --- Manejadores UI ---
    const handleThemeChange = useCallback((theme) => {
        if (isSaving || isProcessing) return;
        // Actualiza UI inmediatamente (optimista para tema), luego guarda
        applyTheme(theme);
        handleUpdateSetting('theme', theme);
    }, [isSaving, isProcessing, applyTheme, handleUpdateSetting]);

    const handleToggleChange = useCallback(async (event) => {
        if (isSaving || isProcessing) return;
        const { id, checked, dataset } = event.target;
        const settingKey = dataset.key; // 'doble_factor_enabled', 'notify_...'

        if (!settingKey) {
            console.error("Toggle sin data-key:", id);
            return;
        }

        console.log(`Toggle ${settingKey} changed to: ${checked}`);

        // Manejo especial para 2FA
        if (settingKey === 'doble_factor_enabled') {
            setIsProcessing(true); // Usar isProcessing para 2FA
            if (checked) {
                // Iniciar enrolamiento
                try {
                    console.log("Starting MFA enrollment...");
                    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
                    if (error) throw new Error(`Error Supabase MFA Enroll: ${error.message}`);
                    if (!data?.id || !data.totp?.qr_code || !data.totp?.secret) throw new Error("Respuesta de enrolamiento inválida.");

                    console.log("Enrollment successful, opening modal.");
                    setMfaSetupData({ factorId: data.id, qrCodeSvgString: data.totp.qr_code, secret: data.totp.secret });
                    setIsSetup2faModalOpen(true);
                     // Guardar en DB que el proceso está iniciado (opcional, pero bueno para UI)
                    // await handleUpdateSetting(settingKey, true); // Podría hacerse aquí o tras verificar
                } catch (error) {
                    console.error("Error starting MFA enrollment:", error);
                    alert(`Error al iniciar activación 2FA: ${error.message}`);
                    // Revertir visualmente el toggle si falla el inicio
                    setSettings(prev => ({ ...prev, doble_factor_enabled: false }));
                } finally {
                    setIsProcessing(false);
                }
            } else {
                // Desactivar 2FA
                 if (!window.confirm("¿Seguro que quieres desactivar la autenticación de dos pasos?")) {
                     // Revertir visualmente si el usuario cancela
                     setSettings(prev => ({ ...prev, doble_factor_enabled: true }));
                     return;
                 }
                try {
                    console.log("Disabling MFA...");
                    const { data: factorsResponse, error: listError } = await supabase.auth.mfa.listFactors();
                    if (listError) throw new Error(`Error listando factores: ${listError.message}`);

                    const enrolledFactors = factorsResponse?.all || [];
                    if (enrolledFactors.length === 0) {
                        console.log("No factors to disable.");
                    } else {
                        for (const factor of enrolledFactors) {
                            console.log(`Unenrolling factor ${factor.id}`);
                            const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
                            if (unenrollError) console.warn(`Failed to unenroll factor ${factor.id}: ${unenrollError.message}`);
                        }
                    }
                    // Guardar estado desactivado en DB independientemente de si había factores
                    await handleUpdateSetting(settingKey, false);
                    alert("Autenticación de dos pasos desactivada.");
                } catch (error) {
                    console.error("Error disabling MFA:", error);
                    alert(`Error al desactivar 2FA: ${error.message}`);
                    // Revertir visualmente si falla
                    setSettings(prev => ({ ...prev, doble_factor_enabled: true }));
                } finally {
                    setIsProcessing(false);
                }
            }
        } else {
            // Guardar otras preferencias (notificaciones)
            handleUpdateSetting(settingKey, checked);
        }
    }, [isSaving, isProcessing, handleUpdateSetting, supabase]);


    // --- Modales ---
    const handleOpenSelectionModal = useCallback((settingKey) => {
        if (isSaving || isProcessing) return;
        let title = '';
        let options = [];
        let currentValue = '';

        if (settingKey === 'language') {
            title = 'Seleccionar Idioma'; options = languageOptions; currentValue = settings.language;
        } else if (settingKey === 'default_view') {
            title = 'Seleccionar Vista Inicial'; options = defaultViewOptions; currentValue = settings.default_view;
        } else return;

        setSelectionModalConfig({ title, options, settingKey, currentValue });
        setIsSelectionModalOpen(true);
    }, [isSaving, isProcessing, settings.language, settings.default_view]);

    const handleCloseSelectionModal = useCallback(() => setIsSelectionModalOpen(false), []);

    const handleSaveSelection = useCallback((selectedOption) => {
        if (!selectedOption) return;
        const { settingKey } = selectionModalConfig;
        const valueToSave = settingKey === 'language' ? selectedOption.value : selectedOption.text; // Guardar 'es'/'en' o 'Dashboard'/'Accounts' etc.
        handleUpdateSetting(settingKey, valueToSave);
        handleCloseSelectionModal();
    }, [selectionModalConfig, handleUpdateSetting, handleCloseSelectionModal]);

    const handleCloseInfoModal = useCallback(() => setIsInfoModalOpen(false), []);

    // 2FA Modal
    const handleClose2faModal = useCallback(async (unenrollOnCancel = false) => {
        const factorIdToUnenroll = mfaSetupData.factorId; // Capturar antes de cerrar
        setIsSetup2faModalOpen(false);
        setMfaSetupData({ factorId: null, qrCodeSvgString: '', secret: '' }); // Limpiar datos

        if (unenrollOnCancel && factorIdToUnenroll) {
            if (window.confirm("Si cancelas ahora, la configuración 2FA no se completará. ¿Continuar?")) {
                setIsProcessing(true);
                console.log(`Attempting to unenroll factor ${factorIdToUnenroll} due to cancellation.`);
                try {
                    const { error } = await supabase.auth.mfa.unenroll({ factorId: factorIdToUnenroll });
                    if (error) throw error;
                    console.log("Factor unenrolled successfully on cancel.");
                    // Asegurar que el estado en DB y UI es false
                    await handleUpdateSetting('doble_factor_enabled', false);
                } catch (error) {
                    console.error("Error unenrolling factor on cancel:", error);
                    alert(`No se pudo deshacer la activación inicial: ${error.message}`);
                    // El estado en DB podría ser true, pero la UI ya se revirtió, forzar recarga?
                    // fetchInitialData(); // Opcional
                } finally {
                    setIsProcessing(false);
                }
            } else {
                 // Si el usuario no confirma la cancelación, revertir el toggle visualmente
                 setSettings(prev => ({ ...prev, doble_factor_enabled: true }));
            }
        }
    }, [mfaSetupData.factorId, supabase, handleUpdateSetting]);

    const handleVerifyMfaCode = useCallback(async (verificationCode) => {
         if (isProcessing || !mfaSetupData.factorId) return;
         setIsProcessing(true);
         try {
            // Supabase documentacion recomienda challenge + verify
            const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: mfaSetupData.factorId });
            if (challengeError) throw new Error(`Error al generar challenge: ${challengeError.message}`);
            if (!challengeData?.id) throw new Error("No se recibió challengeId.");

            const { error: verifyError } = await supabase.auth.mfa.verify({
                factorId: mfaSetupData.factorId,
                code: verificationCode,
                challengeId: challengeData.id
            });
            if (verifyError) throw new Error(`Código incorrecto o inválido: ${verifyError.message}`);

            // Éxito
            alert("¡Autenticación de dos pasos activada correctamente!");
             // Guardar estado activado en DB (si no se hizo al inicio)
             await handleUpdateSetting('doble_factor_enabled', true);
            handleClose2faModal(false); // Cerrar SIN desenrolar

         } catch (error) {
            console.error("Error verifying MFA code:", error);
            // Dejar que el modal muestre el error
            throw error; // Re-lanzar para que el modal lo capture
         } finally {
            setIsProcessing(false);
         }
    }, [isProcessing, mfaSetupData.factorId, supabase, handleUpdateSetting, handleClose2faModal]);

    // Delete Modal
    const handleDeleteAccountClick = useCallback(() => {
        if (isProcessing) return;
        setIsDeleteModalOpen(true);
    }, [isProcessing]);
    const handleCloseDeleteModal = useCallback(() => setIsDeleteModalOpen(false), []);
    const handleConfirmDeleteAccount = useCallback(async (password) => {
        if (isProcessing || !userId) return;
        setIsProcessing(true);
        try {
            console.log("Invoking delete_user_account function...");
            // Llamar a la Edge Function. La función DEBE verificar la contraseña internamente.
            const { data, error } = await supabase.functions.invoke('delete_user_account', {
                 method: 'POST',
                 // La función debería obtener el userId del token JWT automáticamente
                 // Podrías pasar la contraseña si la función la necesita para verificar,
                 // pero es menos seguro que la función use reauthenticate o similar.
                 // body: { password: password } // Opcional, depende de tu función
            });

            if (error) {
                 // Capturar errores específicos si la función los devuelve
                 if (error.context?.message?.includes('Invalid password')) {
                     throw new Error('Contraseña actual incorrecta.');
                 }
                 throw new Error(error.context?.message || error.message || 'Error del servidor al eliminar.');
            }

            console.log("Delete function response:", data);
            alert("Solicitud de eliminación recibida. Serás desconectado.");
            await supabase.auth.signOut();
            // La redirección la hará el listener global

        } catch (error) {
            console.error("Error deleting account:", error);
             // Dejar que el modal muestre el error
            throw error; // Re-lanzar para el modal
        } finally {
             // No poner setIsProcessing(false) aquí si signOut tiene éxito
             // Pero sí si falla la llamada a la función antes del signOut
             if (isMounted.current) { // Solo si sigue montado
                 // setIsProcessing(false); // Comentado porque signOut desmontará
             }
        }
    }, [isProcessing, userId, supabase]);


    // --- Otros ---
    const handleExportData = useCallback(async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            const { data, error } = await supabase.functions.invoke('export_data', {
                 method: 'POST', headers: { 'Accept': 'text/csv, application/json' }
            });
            if (error) throw new Error(error.context?.message || error.message || 'Error al exportar.');

            if (data?.status === 'empty') {
                 setInfoModalConfig({ title: 'Exportar Datos', message: data.message || "No hay datos para exportar." });
                 setIsInfoModalOpen(true);
            } else {
                 // Asumir que la descarga CSV fue iniciada por headers
                 console.log("Export function called, download should start.");
            }
        } catch (error) {
            console.error('Error exporting data:', error);
            alert(`Error al exportar: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    }, [isProcessing, supabase]);

    const handleImportData = useCallback(() => {
        if (isProcessing) return;
        setInfoModalConfig({ title: 'Importar Datos', message: 'Función no implementada.' });
        setIsInfoModalOpen(true);
    }, [isProcessing]);

    const handleLogout = useCallback(async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
        } catch (error) {
            console.error("Error logging out:", error);
            alert("Error al cerrar sesión.");
            setIsProcessing(false);
        }
    }, [isProcessing, supabase]);

    const handleBack = useCallback(() => navigate(-1), [navigate]);
    const scrollToTop = useCallback(() => window.scrollTo({ top: 0, behavior: 'smooth' }), []);

    // --- Renderizado ---
    const currentLanguageText = languageOptions.find(l => l.value === settings.language)?.text || settings.language;
    const currentDefaultViewText = defaultViewOptions.find(v => v.value === settings.default_view)?.text || settings.default_view;

    if (isLoading) {
         return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><p>Cargando configuración...</p></div>;
    }

    return (
        <div style={{ display: 'flex' }}>

            {/* --- Sidebar --- */}
             <aside className="sidebar">
                             <div className="sidebar-logo"> <img src={finAiLogo} alt="FinAi Logo Small" /> </div>
                             <nav className="sidebar-nav">
                                 {/* Usar NavLink para 'active' class automática si se configura */}
                                 <Link to="/dashboard" className="nav-button" title="Dashboard"><i className="fas fa-home"></i> <span>Dashboard</span></Link>
                                 <Link to="/accounts" className="nav-button" title="Cuentas"><i className="fas fa-wallet"></i> <span>Cuentas</span></Link>
                                 <Link to="/budgets" className="nav-button" title="Presupuestos"><i className="fas fa-chart-pie"></i> <span>Presupuestos</span></Link>
                                 <Link to="/categories" className="nav-button" title="Categorías"><i className="fas fa-tags"></i> <span>Categorías</span></Link>
                                 <Link to="/transactions" className="nav-button" title="Transacciones"><i className="fas fa-exchange-alt"></i> <span>Transacciones</span></Link>
                                 <Link to="/trips" className="nav-button" title="Viajes"><i className="fas fa-suitcase-rolling"></i> <span>Viajes</span></Link>
                                 <Link to="/evaluations" className="nav-button" title="Evaluación"><i className="fas fa-balance-scale"></i> <span>Evaluación</span></Link>
                                 <Link to="/reports" className="nav-button" title="Informes"><i className="fas fa-chart-bar"></i> <span>Informes</span></Link>
                                 <Link to="/profile" className="nav-button active" title="Perfil"><i className="fas fa-user-circle"></i> <span>Perfil</span></Link> {/* Active */}
                                 <Link to="/settings" className="nav-button" title="Configuración"><i className="fas fa-cog"></i> <span>Configuración</span></Link>
                                 <Link to="/debts" className="nav-button" title="Deudas"><i className="fas fa-credit-card"></i> <span>Deudas</span></Link>
                                 <Link to="/loans" className="nav-button" title="Préstamos"><i className="fas fa-hand-holding-usd"></i> <span>Préstamos</span></Link>
                                 <Link to="/fixed-expenses" className="nav-button" title="Gastos Fijos"><i className="fas fa-receipt"></i> <span>Gastos Fijos</span></Link>
                                 <Link to="/goals" className="nav-button" title="Metas"><i className="fas fa-bullseye"></i> <span>Metas</span></Link>
                             </nav>
                             <button className="nav-button logout-button" onClick={handleLogout} title="Cerrar Sesión" disabled={isLoading || isSaving}>
                                 {isLoading ? <><i className="fas fa-spinner fa-spin"></i> <span>Saliendo...</span></> : <><i className="fas fa-sign-out-alt"></i> <span>Salir</span></>}
                             </button>
                         </aside>
            {/* --- Contenido Principal --- */}
            <div className={`page-container ${isProcessing ? 'processing' : ''}`}> {/* Clase opcional para overlay/cursor */}
                {/* --- Cabecera --- */}
                <div className="page-header settings-header">
                    <button onClick={handleBack} id="backButton" className="btn-icon" aria-label="Volver" disabled={isProcessing}><i className="fas fa-arrow-left"></i></button>
                    <div className="header-title-group">
                        <img id="userAvatarHeader" src={userAvatarUrl} alt="Avatar" className="header-avatar-small" />
                        <h1>Configuración</h1>
                    </div>
                    <div style={{ width: '40px' }}></div> {/* Spacer */}
                </div>

                {/* --- Grid de Configuración --- */}
                <div className="settings-grid">

                    {/* Card General */}
                    <div className="settings-card" id="generalCard">
                        <h2><i className="fas fa-cog icon-prefix"></i> General</h2>
                        <div className="setting-item">
                            <span><i className="fas fa-euro-sign icon-inline"></i> Moneda Principal</span>
                            <span className="setting-value" id="mainCurrency">EUR (Predet.)</span>
                        </div>
                        <div className={`setting-item clickable ${isProcessing ? 'disabled' : ''}`} onClick={() => !isProcessing && handleOpenSelectionModal('default_view')} aria-disabled={isProcessing}>
                            <span><i className="fas fa-eye icon-inline"></i> Vista Inicial</span>
                            <span className="setting-value-editable" id="defaultViewValueEl">{currentDefaultViewText} <i className="fas fa-chevron-right"></i></span>
                        </div>
                        <button onClick={handleExportData} className="btn btn-secondary btn-full-width" id="exportDataBtn" disabled={isProcessing}>
                            {isProcessing ? <><i className="fas fa-spinner fa-spin"></i> Exportando...</> : <><i className="fas fa-download"></i> Exportar Datos</>}
                        </button>
                        <button onClick={handleImportData} className="btn btn-secondary btn-full-width" id="importDataBtn" disabled={isProcessing}><i className="fas fa-upload"></i> Importar Datos</button>
                        <button onClick={handleDeleteAccountClick} className="btn btn-danger btn-full-width" id="deleteAccountBtn" disabled={isProcessing}><i className="fas fa-trash-alt"></i> Eliminar Cuenta</button>
                    </div>

                    {/* Card Apariencia */}
                    <div className="settings-card" id="appearanceCard">
                        <h2><i className="fas fa-paint-brush icon-prefix"></i> Apariencia</h2>
                        <div className="setting-item">
                            <span><i className="fas fa-palette icon-inline"></i> Tema</span>
                            <div className="theme-selector" id="themeSelector">
                                <button onClick={() => handleThemeChange('light')} className={`theme-option ${settings.theme === 'light' ? 'active' : ''}`} title="Claro" disabled={isProcessing || isSaving}><i className="fas fa-sun"></i></button>
                                <button onClick={() => handleThemeChange('dark')} className={`theme-option ${settings.theme === 'dark' ? 'active' : ''}`} title="Oscuro" disabled={isProcessing || isSaving}><i className="fas fa-moon"></i></button>
                                <button onClick={() => handleThemeChange('system')} className={`theme-option ${settings.theme === 'system' ? 'active' : ''}`} title="Sistema" disabled={isProcessing || isSaving}><i className="fas fa-desktop"></i></button>
                            </div>
                        </div>
                        <div className={`setting-item clickable ${isProcessing ? 'disabled' : ''}`} onClick={() => !isProcessing && handleOpenSelectionModal('language')} aria-disabled={isProcessing}>
                            <span><i className="fas fa-language icon-inline"></i> Idioma</span>
                            <span className="setting-value-editable" id="languageValue">{currentLanguageText} <i className="fas fa-chevron-right"></i></span>
                        </div>
                    </div>

                     {/* Card Seguridad */}
                    <div className="settings-card" id="securityCard">
                        <h2><i className="fas fa-shield-alt icon-prefix"></i> Seguridad</h2>
                        <button onClick={() => navigate('/change-password')} className="btn btn-secondary btn-full-width" id="changePasswordBtn" disabled={isProcessing}><i className="fas fa-lock"></i> Cambiar Contraseña</button>
                        <div className="setting-item">
                            <span><i className="fas fa-key icon-inline"></i> Autenticación 2 Pasos</span>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    id="twoFactorToggle"
                                    data-key="doble_factor_enabled" // Usar data-key
                                    checked={settings.doble_factor_enabled}
                                    onChange={handleToggleChange}
                                    disabled={isProcessing || isSaving}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                         {/* <small className="setting-note">Activar 2FA requiere configuración adicional.</small> */}
                    </div>

                    {/* Card Notificaciones */}
                    <div className="settings-card" id="notificationsCard">
                        <h2><i className="fas fa-bell icon-prefix"></i> Notificaciones</h2>
                        <div className="setting-item">
                            <span><i className="fas fa-calendar-alt icon-inline"></i> Recordatorio Gasto Fijo</span>
                            <label className="toggle-switch">
                                <input type="checkbox" id="notifyFixedExpenseToggle" data-key="notify_fixed_expense" checked={settings.notify_fixed_expense} onChange={handleToggleChange} disabled={isProcessing || isSaving}/>
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                        <div className="setting-item">
                            <span><i className="fas fa-chart-pie icon-inline"></i> Alerta Presupuesto</span>
                            <label className="toggle-switch">
                                <input type="checkbox" id="notifyBudgetAlertToggle" data-key="notify_budget_alert" checked={settings.notify_budget_alert} onChange={handleToggleChange} disabled={isProcessing || isSaving}/>
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                        <div className="setting-item">
                            <span><i className="fas fa-bullseye icon-inline"></i> Meta Ahorro Alcanzada</span>
                            <label className="toggle-switch">
                                <input type="checkbox" id="notifyGoalReachedToggle" data-key="notify_goal_reached" checked={settings.notify_goal_reached} onChange={handleToggleChange} disabled={isProcessing || isSaving}/>
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                    </div>

                    {/* Card Cuenta */}
                    <div className="settings-card" id="accountCard">
                        <h2><i className="fas fa-user-circle icon-prefix"></i> Cuenta</h2>
                        <button onClick={() => navigate('/profile')} className="btn btn-secondary btn-full-width" id="editProfileBtn" disabled={isProcessing}><i className="fas fa-user-edit"></i> Editar Perfil</button>
                        <button onClick={() => navigate('/categories')} className="btn btn-secondary btn-full-width" id="manageCategoriesBtn" disabled={isProcessing}><i className="fas fa-tags"></i> Gestionar Categorías</button>
                        {/* Logout está en la sidebar */}
                    </div>

                     {/* Card Ayuda */}
                    <div className="settings-card" id="helpCard">
                        <h2><i className="fas fa-question-circle icon-prefix"></i> Ayuda</h2>
                        <a href="#" target="_blank" rel="noopener noreferrer" className={`setting-link ${isProcessing ? 'disabled-link' : ''}`} id="helpLink"><i className="fas fa-life-ring icon-inline"></i> Centro de Ayuda / FAQ</a>
                        <a href="#" target="_blank" rel="noopener noreferrer" className={`setting-link ${isProcessing ? 'disabled-link' : ''}`} id="privacyLink"><i className="fas fa-user-secret icon-inline"></i> Política de Privacidad</a>
                        <a href="#" target="_blank" rel="noopener noreferrer" className={`setting-link ${isProcessing ? 'disabled-link' : ''}`} id="termsLink"><i className="fas fa-file-contract icon-inline"></i> Términos de Servicio</a>
                    </div>


                </div> {/* Fin settings-grid */}

                {/* App Version */}
                <div className="app-version" id="appVersion">
                    FinAi {APP_VERSION}
                </div>

            </div> {/* Fin page-container */}

            {/* --- Modales --- */}
            <SelectionModal
                isOpen={isSelectionModalOpen}
                onClose={handleCloseSelectionModal}
                onSave={handleSaveSelection}
                config={selectionModalConfig}
                isSaving={isSaving} // Pasar estado de guardado
            />
            <Setup2faModal
                 isOpen={isSetup2faModalOpen}
                 onClose={handleClose2faModal}
                 onVerify={handleVerifyMfaCode}
                 setupData={mfaSetupData}
                 isProcessing={isProcessing} // Usar isProcessing para 2FA
            />
            <DeleteAccountModal
                 isOpen={isDeleteModalOpen}
                 onClose={handleCloseDeleteModal}
                 onConfirm={handleConfirmDeleteAccount}
                 userEmail={userEmail}
                 isProcessing={isProcessing}
            />
            <InfoModal
                 isOpen={isInfoModalOpen}
                 onClose={handleCloseInfoModal}
                 config={infoModalConfig}
            />

            {/* --- Botón Scroll-Top --- */}
            {showScrollTop && (
                <button onClick={scrollToTop} id="scrollTopBtn" className="scroll-top-btn visible" title="Volver arriba" disabled={isProcessing}>
                    <i className="fas fa-arrow-up"></i>
                </button>
            )}

        </div> // Fin contenedor flex principal
    );
}

// --- Componente Modal Selección ---
function SelectionModal({ isOpen, onClose, onSave, config, isSaving }) {
    const [selectedValue, setSelectedValue] = useState('');

    useEffect(() => {
        if (isOpen) {
            setSelectedValue(config.currentValue); // Pre-seleccionar valor actual al abrir
        }
    }, [isOpen, config.currentValue]);

    const handleRadioChange = (e) => {
        setSelectedValue(e.target.value);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const selectedOption = config.options.find(opt => opt.value === selectedValue);
        if (selectedOption) {
            onSave(selectedOption);
        } else {
             console.warn("No selected option found for value:", selectedValue);
             onClose(); // Cerrar si no hay selección válida
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay small active" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget && !isSaving) onClose(); }}>
            <div className="modal-content">
                <h2>{config.title}</h2>
                <form onSubmit={handleSubmit}>
                    <input type="hidden" name="settingKey" value={config.settingKey} readOnly />
                    <div className="selection-options radio-options"> {/* Usar clase para radios */}
                        {config.isLoading && <p>Cargando...</p>}
                        {!config.isLoading && config.options.map(option => (
                            <label key={option.value} htmlFor={`option-${config.settingKey}-${option.value}`}>
                                <input
                                    type="radio"
                                    id={`option-${config.settingKey}-${option.value}`}
                                    name="selectedValue"
                                    value={option.value}
                                    checked={selectedValue === option.value}
                                    onChange={handleRadioChange}
                                    disabled={isSaving}
                                />
                                {option.text}
                            </label>
                        ))}
                    </div>
                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSaving}>Cancelar</button>
                        <button type="submit" className="btn btn-primary" disabled={isSaving || selectedValue === config.currentValue}> {/* Deshabilitar si no hay cambio */}
                            {isSaving ? 'Guardando...' : 'Guardar Selección'}
                        </button>
                    </div>
                     {/* <p className="error-message" style={{ display: 'none' }}></p> */}
                </form>
            </div>
        </div>
    );
}

// --- Componente Modal Setup 2FA ---
function Setup2faModal({ isOpen, onClose, onVerify, setupData, isProcessing }) {
    const [verificationCode, setVerificationCode] = useState('');
    const [error, setError] = useState('');
    const secretInputRef = useRef(null);

    useEffect(() => {
        // Limpiar al abrir/cerrar
        setVerificationCode('');
        setError('');
    }, [isOpen]);

    const handleVerify = async (e) => {
        e.preventDefault();
        setError('');
        if (!/^[0-9]{6}$/.test(verificationCode)) {
            setError('Introduce un código de 6 dígitos válido.');
            return;
        }
        try {
            await onVerify(verificationCode);
            // onClose se llama desde onVerify si tiene éxito
        } catch (err) {
             console.error("Error caught in modal verify handler:", err);
            setError(err.message || 'Error al verificar el código.');
        }
    };

    const handleCopySecret = () => {
        if (secretInputRef.current) {
            navigator.clipboard.writeText(secretInputRef.current.value)
                .then(() => alert("Clave secreta copiada."))
                .catch(err => alert("Error al copiar."));
        }
    };

    // Función para cancelar que intenta desenrolar
    const handleCancel = () => {
        onClose(true); // true indica intentar desenrolar
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay active" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget && !isProcessing) handleCancel(); }}>
            <div className="modal-content">
                <h2>Configurar Autenticación (2FA)</h2>
                <p className="modal-instructions">1. Escanea el código QR con tu app de autenticación (Google Authenticator, Authy, etc.).</p>
                <div className="mfa-setup-details">
                    <div className="qr-code-container">
                         {/* Usar qrcode.react para generar el SVG */}
                         {setupData.qrCodeSvgString ? (
                              <QRCode value={setupData.qrCodeSvgString.replace(/^data:image\/svg\+xml;utf8,/, '')} size={180} level="M" renderAs="svg"/>
                         ) : <p>Generando QR...</p>}
                    </div>
                    <div className="secret-key-container">
                        <label htmlFor="secretCodeDisplay">O introduce esta clave manualmente:</label>
                        <div style={{display: 'flex', alignItems: 'center'}}>
                             <input type="text" id="secretCodeDisplay" ref={secretInputRef} readOnly value={setupData.secret || 'GENERANDO...'} style={{flexGrow: 1, marginRight: '5px'}}/>
                             <button type="button" onClick={handleCopySecret} className="btn-icon-small" title="Copiar" disabled={!setupData.secret || isProcessing}><i className="fas fa-copy"></i></button>
                        </div>
                    </div>
                </div>
                <p className="modal-instructions">2. Introduce el código de 6 dígitos generado por la app.</p>
                <form onSubmit={handleVerify}>
                    <input type="hidden" value={setupData.factorId || ''} readOnly />
                    <div className="input-group">
                        <label htmlFor="verificationCodeInput">Código de Verificación</label>
                        <input
                            type="text" id="verificationCodeInput" name="verificationCodeInput"
                            required inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
                            autoComplete="one-time-code" placeholder="123456"
                            value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)}
                            disabled={isProcessing}
                         />
                    </div>
                    {error && <p className="error-message">{error}</p>}
                    <div className="modal-actions">
                        <button type="button" onClick={handleCancel} className="btn btn-secondary" disabled={isProcessing}>Cancelar</button>
                        <button type="submit" className="btn btn-primary" disabled={isProcessing || verificationCode.length !== 6}>
                            {isProcessing ? 'Verificando...' : 'Verificar y Activar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// --- Componente Modal Eliminar Cuenta ---
function DeleteAccountModal({ isOpen, onClose, onConfirm, userEmail, isProcessing }) {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        // Limpiar al abrir/cerrar
        setPassword('');
        setError('');
    }, [isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!password) {
            setError('Introduce tu contraseña actual para confirmar.');
            return;
        }
        try {
            await onConfirm(password);
            // onClose se llama desde onConfirm si tiene éxito (tras signOut)
        } catch (err) {
            console.error("Error caught in delete modal handler:", err);
            setError(err.message || 'Error al procesar la solicitud.');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay small active" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget && !isProcessing) onClose(); }}>
            <div className="modal-content danger-modal">
                <h2><i className="fas fa-exclamation-triangle"></i> Eliminar Cuenta</h2>
                <p className="modal-instructions danger-text">
                    ¡Atención! Esta acción es irreversible. Se borrarán **todos** tus datos asociados a <strong>{userEmail}</strong>.
                </p>
                <p className="modal-instructions">Para confirmar, introduce tu contraseña actual.</p>
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="deleteConfirmPassword">Contraseña Actual</label>
                        <input
                            type="password" id="deleteConfirmPassword" name="deleteConfirmPassword"
                            required autoComplete="current-password"
                            value={password} onChange={(e) => setPassword(e.target.value)}
                            disabled={isProcessing}
                        />
                    </div>
                    {error && <p className="error-message">{error}</p>}
                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isProcessing}>Cancelar</button>
                        <button type="submit" className="btn btn-danger" disabled={isProcessing || !password}>
                            {isProcessing ? 'Eliminando...' : 'Eliminar Mi Cuenta'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// --- Componente Modal Información ---
function InfoModal({ isOpen, onClose, config }) {
    if (!isOpen) return null;
    return (
         <div className="modal-overlay small active" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="modal-content info-modal-content">
                <h2><i className="fas fa-info-circle"></i> {config.title || 'Información'}</h2>
                <p className="modal-instructions" style={{ textAlign: 'center', margin: '25px 0', lineHeight: '1.6' }}>
                    {config.message}
                </p>
                <div className="modal-actions" style={{ justifyContent: 'center' }}>
                    <button type="button" onClick={onClose} className="btn btn-primary">Aceptar</button>
                </div>
            </div>
        </div>
    );
}


export default Settings;
