/*
Archivo: src/pages/Settings.jsx
Propósito: Componente para la página de configuración general de la aplicación y cuenta.
*/
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext.jsx';
import toast from 'react-hot-toast';
import SelectionModal from '../components/common/SelectionModal.jsx'; // Ajusta ruta
import InfoModal from '../components/common/InfoModal.jsx';         // Ajusta ruta
import Setup2faModal from '../components/settings/Setup2faModal.jsx'; // Ajusta ruta
import DeleteAccountModal from '../components/settings/DeleteAccountModal.jsx'; // Ajusta ruta
import Sidebar from '../components/layout/Sidebar.jsx'; 
import PageHeader from '../components/layout/PageHeader.jsx';
import '../styles/Settings.scss';


// Importa imágenes
import defaultAvatar from '../assets/avatar_predeterminado.png';

// --- Constantes y Opciones ---
const languageOptions = [ { value: 'es', text: 'Español' }, { value: 'en', text: 'English' } ];
const defaultViewOptions = [ { value: 'Dashboard', text: 'Dashboard' }, { value: 'Accounts', text: 'Cuentas' }, { value: 'Transactions', text: 'Transacciones' }, { value: 'Budgets', text: 'Presupuestos' } ];
const APP_VERSION = 'v1.0.0'; // O desde variables de entorno

// --- Componente Principal ---
function Settings() {
    // --- Estado ---
    const { user, loading: authLoading } = useAuth();
    const [avatarUrl, setAvatarUrl] = useState(defaultAvatar);
    const [settings, setSettings] = useState({ // Estado único para todas las config del perfil
        theme: 'system', language: 'es', doble_factor_enabled: false,
        default_view: 'Dashboard', notify_fixed_expense: true,
        notify_budget_alert: true, notify_goal_reached: true,
        avatar_url: defaultAvatar // Incluir avatar aquí también
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false); // Para updates rápidos (toggles, selects)
    const [isProcessing, setIsProcessing] = useState(false); // Para operaciones largas (2FA, delete, export)

    // Estados Modales
    const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
    const [isSetup2faModalOpen, setIsSetup2faModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

    // Configuración Modales
    const [selectionModalConfig, setSelectionModalConfig] = useState({ title: '', options: [], settingKey: '', currentValue: '' });
    const [infoModalConfig, setInfoModalConfig] = useState({ title: 'Información', message: '' });
    const [mfaSetupData, setMfaSetupData] = useState({ factorId: null, qrCodeSvgString: '', secret: '' }); // Para modal 2FA

    // UI
    const [showScrollTop, setShowScrollTop] = useState(false);
    const isMounted = useRef(true); // Para cleanup
    const navigate = useNavigate();

    // --- Carga de Datos Inicial ---
    const fetchData = useCallback(async (currentUserId) => {
        setIsLoading(true); // Reinicia isLoading al empezar a cargar
        // No resetear settings aquí para evitar parpadeo, se actualiza si hay datos
        console.log(`Settings: Cargando perfil/settings para ${currentUserId}`);
        try {
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('theme, language, doble_factor_enabled, default_view, notify_fixed_expense, notify_budget_alert, notify_goal_reached, avatar_url')
                .eq('id', currentUserId)
                .single();

            if (!isMounted.current) return;

            if (profileError && profileError.code !== 'PGRST116') {
                throw new Error(`Error cargando perfil: ${profileError.message}`);
            }

            if (profile) {
                setSettings({ // Actualizar estado con datos de DB o defaults
                    theme: profile.theme ?? 'system',
                    language: profile.language ?? 'es',
                    doble_factor_enabled: profile.doble_factor_enabled ?? false,
                    default_view: profile.default_view ?? 'Dashboard',
                    notify_fixed_expense: profile.notify_fixed_expense ?? true,
                    notify_budget_alert: profile.notify_budget_alert ?? true,
                    notify_goal_reached: profile.notify_goal_reached ?? true,
                    avatar_url: profile.avatar_url || defaultAvatar
                });
            } else { // Usuario nuevo sin perfil, mantener defaults y avatar default
                setSettings(prev => ({ ...prev, avatar_url: defaultAvatar }));
                console.warn("Perfil no encontrado, usando defaults.");
            }
        } catch (error) {
            console.error("Error loading initial data (Settings):", error);
            toast.error(`Error al cargar configuración: ${error.message}`);
        } finally {
            if (isMounted.current) setIsLoading(false);
        }
    }, [supabase]); // Dependencia correcta

    useEffect(() => { // Cleanup Ref
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    useEffect(() => { // Carga inicial
        if (authLoading) { setIsLoading(true); return; }
        if (!user) { navigate('/login'); return; }
        fetchData(user.id);
    }, [user, authLoading, navigate, fetchData]);

    // --- Aplicar Tema ---
    const applyTheme = useCallback((selectedTheme) => {
        document.body.classList.remove('light-mode', 'dark-mode');
        let effectiveTheme = selectedTheme;
        if (selectedTheme === 'system') {
            effectiveTheme = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light';
        }
        document.body.classList.add(effectiveTheme === 'dark' ? 'dark-mode' : 'light-mode');
    }, []);

    useEffect(() => { // Listener cambio tema y aplicación inicial
        applyTheme(settings.theme);
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => { if (settings.theme === 'system') applyTheme('system'); };
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [settings.theme, applyTheme]);

    useEffect(() => { // Scroll listener
        const handleScroll = () => isMounted.current && setShowScrollTop(window.scrollY > 300);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // --- Guardado Genérico ---
    const handleUpdateSetting = useCallback(async (key, value) => {
        if (!user?.id) return;
        // Guardar el valor original por si falla
        const originalValue = settings[key];
        // Actualizar UI inmediatamente (optimista)
        setSettings(prev => ({ ...prev, [key]: value }));
        // Para el tema, aplicar cambio visual inmediatamente
        if (key === 'theme') applyTheme(value);

        setIsSaving(true); // Usar isSaving para cambios rápidos
        console.log(`Saving setting: ${key} = ${value}`);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ [key]: value, updated_at: new Date() })
                .eq('id', user.id);
            if (error) throw error;
            console.log(`Setting ${key} saved successfully.`);
            // No hace falta toast si el cambio ya se reflejó en la UI
        } catch (error) {
            console.error(`Error saving setting ${key}:`, error);
            toast.error(`Error al guardar ${key}: ${error.message}`);
            // Revertir cambio en UI si falla
            if (isMounted.current) {
                setSettings(prev => ({ ...prev, [key]: originalValue }));
                if (key === 'theme') applyTheme(originalValue); // Revertir tema visual
            }
        } finally {
            if (isMounted.current) setIsSaving(false);
        }
    }, [user, supabase, settings, applyTheme]);

    // --- Manejadores UI ---
    const handleThemeChange = useCallback((theme) => {
        if (isSaving || isProcessing) return;
        // Actualiza UI inmediatamente (optimista para tema), luego guarda
        applyTheme(theme);
        handleUpdateSetting('theme', theme);
    }, [isSaving, isProcessing, applyTheme, handleUpdateSetting]);

    const handleToggleChange = useCallback(async (event) => {
        if (isSaving || isProcessing) return;
        const { checked, dataset } = event.target;
        const settingKey = dataset.key;
        if (!settingKey) return;

        console.log(`Toggle ${settingKey} changed to: ${checked}`);

        if (settingKey === 'doble_factor_enabled') {
            // --- Lógica 2FA ---
            setIsProcessing(true);
            const toastId = toast.loading(checked ? 'Iniciando activación 2FA...' : 'Desactivando 2FA...');
            if (checked) { // Activar
                try {
                    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
                    if (error) throw new Error(`Enroll: ${error.message}`);
                    if (!data?.id || !data.totp?.qr_code || !data.totp?.secret) throw new Error("Respuesta inválida.");
                    setMfaSetupData({ factorId: data.id, qrCodeSvgString: data.totp.qr_code, secret: data.totp.secret });
                    setIsSetup2faModalOpen(true);
                    toast.dismiss(toastId); // Quitar loading, modal toma el control
                } catch (error) { toast.error(`Error: ${error.message}`, { id: toastId }); setIsProcessing(false); }
                 // No actualizamos settings.doble_factor_enabled aquí, solo al verificar
            } else { // Desactivar
                 if (!window.confirm("¿Seguro que quieres desactivar 2FA?")) {
                     setIsProcessing(false); toast.dismiss(toastId); return; // Cancelar si no confirma
                 }
                try {
                    const { data: factorsResponse, error: listError } = await supabase.auth.mfa.listFactors();
                    if (listError) throw new Error(`List factors: ${listError.message}`);
                    const enrolledFactors = factorsResponse?.all || [];
                    for (const factor of enrolledFactors) {
                         console.log(`Unenrolling factor ${factor.id}`);
                         const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
                         if (unenrollError) console.warn(`Failed unenroll ${factor.id}: ${unenrollError.message}`);
                    }
                    // Guardar en DB y actualizar estado local
                    await handleUpdateSetting(settingKey, false);
                    toast.success('2FA desactivada.', { id: toastId });
                } catch (error) { toast.error(`Error: ${error.message}`, { id: toastId }); }
                finally { setIsProcessing(false); }
            }
        } else { // Otras notificaciones
            handleUpdateSetting(settingKey, checked);
        }
    }, [isSaving, isProcessing, handleUpdateSetting, supabase]);


    // --- Modales ---
    const handleOpenSelectionModal = useCallback((settingKey) => {
        if (isSaving || isProcessing) return; // Evitar abrir si ya hay una acción en curso
        let title = '';
        let options = [];
        let currentValue = '';
    
        if (settingKey === 'language') {
            title = 'Seleccionar Idioma'; options = languageOptions; currentValue = settings.language;
        } else if (settingKey === 'default_view') {
            title = 'Seleccionar Vista Inicial'; options = defaultViewOptions; currentValue = settings.default_view;
        } else return; // No hacer nada si la clave no es válida
    
        setSelectionModalConfig({ title, options, settingKey, currentValue });
        setIsSelectionModalOpen(true);
    }, [isSaving, isProcessing, settings.language, settings.default_view]);

    const handleCloseSelectionModal = useCallback(() => setIsSelectionModalOpen(false), []);

    const handleSaveSelection = useCallback((selectedOption) => {
        const { settingKey } = selectionModalConfig;
        const valueToSave = settingKey === 'language' ? selectedOption.value : selectedOption.text;
        handleUpdateSetting(settingKey, valueToSave);
        handleCloseSelectionModal();
    }, [selectionModalConfig, handleUpdateSetting, handleCloseSelectionModal]);

    const handleCloseInfoModal = useCallback(() => setIsInfoModalOpen(false), []);
    // 2FA Modal
    const handleClose2faModal = useCallback(async (unenrollOnCancel = false) => {
        const factorIdToUnenroll = mfaSetupData.factorId;
        setIsSetup2faModalOpen(false); setMfaSetupData({ factorId: null, qrCodeSvgString: '', secret: '' });

        if (unenrollOnCancel && factorIdToUnenroll) {
            if (window.confirm("Si cancelas, la configuración 2FA no se completará. ¿Continuar?")) {
                setIsProcessing(true); const toastId = toast.loading('Cancelando activación...');
                try {
                    const { error } = await supabase.auth.mfa.unenroll({ factorId: factorIdToUnenroll });
                    if (error) throw error;
                    // No necesitamos guardar en DB porque nunca se activó
                    setSettings(prev => ({ ...prev, doble_factor_enabled: false })); // Revertir UI
                    toast.success('Activación cancelada.', { id: toastId });
                } catch (error) { toast.error(`Error al cancelar: ${error.message}`, { id: toastId }); }
                finally { setIsProcessing(false); }
            } // Si no confirma la cancelación, el toggle queda como estaba (no hay cambio que revertir)
        }
    }, [mfaSetupData.factorId, supabase, handleUpdateSetting]);

    const handleVerifyMfaCode = useCallback(async (verificationCode) => {
        if (!mfaSetupData.factorId) return;
        // isProcessing ya se maneja en el modal, pero lo ponemos aquí por si acaso
        setIsProcessing(true); const toastId = toast.loading('Verificando código...');
        try {
            const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: mfaSetupData.factorId });
            if (challengeError) throw new Error(`Challenge: ${challengeError.message}`);
            const { error: verifyError } = await supabase.auth.mfa.verify({ factorId: mfaSetupData.factorId, code: verificationCode, challengeId: challengeData.id });
            if (verifyError) throw new Error(`Verify: ${verifyError.message}`);

            // Éxito -> Guardar en DB y cerrar modal
            await handleUpdateSetting('doble_factor_enabled', true);
            toast.success('¡2FA activada correctamente!', { id: toastId });
            handleClose2faModal(false); // false = no desenrolar

        } catch (error) {
            console.error("Error verifying MFA code:", error);
            toast.error(`Error: ${error.message}`, { id: toastId });
            throw error; // Re-lanzar para que el modal lo muestre si tiene estado de error interno
        } finally {
             if (isMounted.current) setIsProcessing(false);
        }
   }, [mfaSetupData.factorId, supabase, handleUpdateSetting, handleClose2faModal]);

    // Delete Modal
    const handleDeleteAccountClick = useCallback(() => setIsDeleteModalOpen(true), []);
    const handleCloseDeleteModal = useCallback(() => setIsDeleteModalOpen(false), []);
    const handleConfirmDeleteAccount = useCallback(async (password) => {
        if (!user?.id) return; // Doble check
        setIsProcessing(true); // Usar processing para operaciones largas/destructivas
        const toastId = toast.loading('Procesando eliminación de cuenta...');
        try {
            const { data, error } = await supabase.functions.invoke('delete_user_account', {
                 method: 'POST',
                 body: { password: password } // Pasamos la contraseña para verificación en la Edge Function
            });
            if (error) throw new Error(error.message || 'Error del servidor al eliminar.');
            if (data?.error) throw new Error(data.error); // Error específico devuelto por la función

            console.log("Delete function response:", data);
            toast.success("Cuenta eliminada. Serás desconectado.", { id: toastId, duration: 4000 });
            // Desloguear inmediatamente
            await supabase.auth.signOut();
            // La redirección a /login debería ocurrir por el listener de AuthContext
            // handleCloseDeleteModal(); // Ya no es necesario, se desmontará

        } catch (error) {
            console.error("Error deleting account:", error);
            toast.error(`Error: ${error.message}`, { id: toastId });
            if (isMounted.current) setIsProcessing(false); // Solo quitar loading si falló antes del signOut
            throw error; // Re-lanzar para que el modal muestre el error
        }
        // No poner finally aquí, signOut desmonta
    }, [user, supabase]);


    // --- Otros ---
    const handleExportData = useCallback(async () => {
        if (isProcessing) return;
        setIsProcessing(true); // Usar isProcessing para acciones largas
        const toastId = toast.loading('Generando exportación...');
        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session) throw new Error("No se pudo obtener sesión.");
    
            const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export_data`; // Nombre de tu función
            if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) throw new Error("Configuración incompleta.");
    
            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}`, 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY, 'Accept': 'text/csv, application/json' }
            });
    
            if (!response.ok) {
                let msg = `Error ${response.status}`;
                try { const e = await response.json(); if(e.error) msg=e.error; } catch(e){}
                throw new Error(msg);
            }
    
            const contentType = response.headers.get('content-type');
            if (contentType?.includes('text/csv')) {
                const blob = await response.blob(); const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url;
                const disposition = response.headers.get('content-disposition'); let filename = 'exportacion_finai.csv'; if (disposition?.includes('attachment')) { const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition); if (matches?.[1]) filename = matches[1].replace(/['"]/g, ''); }
                a.download = filename; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
                toast.success('Exportación generada. Descarga iniciada.', { id: toastId });
            } else if (contentType?.includes('application/json')) {
                 const data = await response.json();
                 if(data?.status==='empty'){ toast.dismiss(toastId); setInfoModalConfig({title:'Exportar Datos', message:data.message||'No hay datos'}); setIsInfoModalOpen(true); }
                 else throw new Error("Respuesta inesperada.");
            } else throw new Error("Formato no reconocido.");
    
        } catch (error) {
            console.error('Error exporting data:', error);
            toast.error(`Error al exportar: ${error.message}`, { id: toastId });
        } finally {
            setIsProcessing(false);
        }
    }, [isProcessing, supabase]);
    
    const handleImportData = useCallback(() => {
        if (isProcessing) return;
        // Usar InfoModal para indicar que no está implementado
        setInfoModalConfig({ title: 'Importar Datos', message: 'Esta función aún no está disponible.' });
        setIsInfoModalOpen(true);
    }, [isProcessing]);

    const handleBack = useCallback(() => navigate(-1), [navigate]);
    const scrollToTop = useCallback(() => window.scrollTo({ top: 0, behavior: 'smooth' }), []);

    // --- Renderizado ---
    const currentLanguageText = languageOptions.find(l => l.value === settings.language)?.text || settings.language;
    const currentDefaultViewText = defaultViewOptions.find(v => v.value === settings.default_view)?.text || settings.default_view;

    if (isLoading) { return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><p>Cargando...</p></div>; }

    return (
        <div style={{ display: 'flex' }}>

            {/* --- Sidebar --- */}
            <Sidebar
                // Pasar estado de carga/guardado si quieres deshabilitar botones mientras ocurre algo
                isProcessing={isLoading || isSaving /* ...o el estado relevante */}
            />
            {/* --- Contenido Principal --- */}
            <div className={`page-container ${isProcessing ? 'processing' : ''}`}> {/* Clase opcional para overlay/cursor */}
                {/* --- Cabecera --- */}
                <PageHeader 
                    pageTitle="Configuración"
                    headerClassName="settings-header" // Tu clase específica si la necesitas
                    showSettingsButton={false}       // Definitivamente false aquí
                    showBackButton={true}            // Mantener el botón de volver
                    isProcessingPage={isProcessing} // Para deshabilitar botones de PageHeader si es necesario
                    actionButton={null} // No hay botón de acción principal en la cabecera de Settings
                />

                {/* --- Grid de Configuración --- */}
                <div className="settings-grid">

                    {/* Card General */}
                    <div className="settings-card" id="generalCard">
                        <h2><i className="fas fa-cog icon-prefix"></i> General</h2>
                        <div className="setting-item">
                            <span><i className="fas fa-euro-sign icon-inline"></i> Moneda Principal</span>
                            <span className="setting-value" id="mainCurrency">EUR (Predet.)</span>
                        </div>
                        <div className={`setting-item clickable ${isProcessing || isSaving ? 'disabled' : ''}`} onClick={() => !(isProcessing || isSaving) && handleOpenSelectionModal('default_view')}>
                           <span><i className="fas fa-eye icon-inline"></i> Vista Inicial</span>
                           <span className="setting-value-editable">{currentDefaultViewText} <i className="fas fa-chevron-right"></i></span>
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
                        {/* ... Botón Cambiar Contraseña ... */}
                         <div className="setting-item">
                            <span><i className="fas fa-key icon-inline"></i> 2FA</span>
                            <label className="toggle-switch">
                                <input type="checkbox" data-key="doble_factor_enabled" checked={settings.doble_factor_enabled} onChange={handleToggleChange} disabled={isProcessing || isSaving}/>
                                <span className="toggle-slider"></span>
                            </label>
                         </div>
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

            {/* Modales (Usando Componentes) */}
            <SelectionModal
                isOpen={isSelectionModalOpen} onClose={handleCloseSelectionModal}
                onSave={handleSaveSelection} config={selectionModalConfig} isSaving={isSaving}
            />
            <Setup2faModal
                 isOpen={isSetup2faModalOpen} onClose={handleClose2faModal} onVerify={handleVerifyMfaCode}
                 setupData={mfaSetupData} isProcessing={isProcessing}
            />
            <DeleteAccountModal
                 isOpen={isDeleteModalOpen} onClose={handleCloseDeleteModal} onConfirm={handleConfirmDeleteAccount}
                 userEmail={user?.email || ''} isProcessing={isProcessing}
            />
            <InfoModal
                 isOpen={isInfoModalOpen} onClose={handleCloseInfoModal} config={infoModalConfig}
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

export default Settings;
