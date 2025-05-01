/*
Archivo: src/pages/Reports.jsx
Propósito: Componente para la página de generación de informes exportables.
*/
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient'; // Asegúrate que la ruta sea correcta

// Importa imágenes
import finAiLogo from '../assets/Logo_FinAI_Oficial.png'; // Asegúrate que la ruta sea correcta
import defaultAvatar from '../assets/avatar_predeterminado.png'; // Asegúrate que la ruta sea correcta

function Reports() {
    // --- Estado del Componente ---
    const [userId, setUserId] = useState(null);
    const [userAvatarUrl, setUserAvatarUrl] = useState(defaultAvatar);
    const [selectedReportType, setSelectedReportType] = useState('transactions'); // 'transactions' o 'trip_expenses'
    const [selectedFormat, setSelectedFormat] = useState('csv'); // 'csv' (pdf deshabilitado)

    // Filtros Transacciones
    const [transactionFilters, setTransactionFilters] = useState({
        dateFrom: '',
        dateTo: '',
        type: 'all', // 'all', 'ingreso', 'gasto'
        accountId: 'all', // 'all' o ID específico
        categoryId: 'all' // 'all', 'none', o ID específico
    });
    const [selectedAccountName, setSelectedAccountName] = useState('Todas las cuentas');
    const [selectedCategoryName, setSelectedCategoryName] = useState('Todas las categorías');

    // Filtros Viajes
    const [tripFilters, setTripFilters] = useState({
        tripId: '', // ID específico
        dateFrom: '', // Opcional
        dateTo: '' // Opcional
    });

    // Datos para Selectores/Modales
    const [accounts, setAccounts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [trips, setTrips] = useState([]);

    // Estado Modales
    const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
    const [selectionModalConfig, setSelectionModalConfig] = useState({
        title: '',
        options: [],
        settingKey: '', // 'accountId' o 'categoryId'
        currentValue: 'all',
        isLoading: false
    });
    const [infoModalConfig, setInfoModalConfig] = useState({ title: 'Información', message: '' });

    // Otros estados UI
    const [isLoading, setIsLoading] = useState(false); // Carga inicial o generación reporte
    const [isGenerating, setIsGenerating] = useState(false); // Específico para generación
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState(''); // 'success', 'error', 'info'
    const [showScrollTop, setShowScrollTop] = useState(false);

    const navigate = useNavigate();
    const isMounted = useRef(true); // Para evitar setear estado en componente desmontado

    // --- Efecto: Carga Inicial (Usuario y Datos Filtros) ---
    useEffect(() => {
        isMounted.current = true; // Marcar como montado

        const loadInitialData = async () => {
            setIsLoading(true);
            setMessage('');
            try {
                // 1. Obtener usuario
                const { data: { user }, error: userError } = await supabase.auth.getUser();
                if (userError || !user) {
                    console.error('Reports: No user session.', userError);
                    if (isMounted.current) navigate('/login');
                    return;
                }
                if (!isMounted.current) return;
                setUserId(user.id);

                // 2. Obtener avatar y datos para filtros en paralelo
                const [profileRes, accountsRes, categoriesRes, tripsRes] = await Promise.all([
                    supabase.from('profiles').select('avatar_url').eq('id', user.id).single(),
                    supabase.from('accounts').select('id, name').eq('user_id', user.id).order('name'),
                    supabase.from('categories').select('id, name').or(`user_id.eq.${user.id},is_default.eq.true`).order('name'),
                    supabase.from('trips').select('id, name').eq('user_id', user.id).order('start_date', { ascending: false })
                ]);

                if (!isMounted.current) return; // Verificar de nuevo antes de setear estado

                // Procesar avatar
                if (profileRes.error && profileRes.error.code !== 'PGRST116') console.warn("Error loading avatar", profileRes.error);
                setUserAvatarUrl(profileRes.data?.avatar_url || defaultAvatar);

                // Procesar cuentas
                if (accountsRes.error) throw new Error(`Error cargando cuentas: ${accountsRes.error.message}`);
                setAccounts(accountsRes.data || []);

                // Procesar categorías
                if (categoriesRes.error) throw new Error(`Error cargando categorías: ${categoriesRes.error.message}`);
                setCategories(categoriesRes.data || []);

                // Procesar viajes
                if (tripsRes.error) throw new Error(`Error cargando viajes: ${tripsRes.error.message}`);
                setTrips(tripsRes.data || []);

            } catch (error) {
                console.error("Error loading initial data:", error);
                if (isMounted.current) {
                    setMessage(`Error cargando datos: ${error.message}`);
                    setMessageType('error');
                }
            } finally {
                if (isMounted.current) setIsLoading(false);
            }
        };

        loadInitialData();

        // Limpieza al desmontar
        return () => {
            isMounted.current = false;
        };
    }, [navigate]);

    // --- Efecto: Scroll-Top ---
    useEffect(() => {
        const handleScroll = () => {
            if (isMounted.current) setShowScrollTop(window.scrollY > 300);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // --- Manejadores de Eventos ---

    const handleReportTypeChange = useCallback((type) => {
        if (isLoading || isGenerating) return;
        setSelectedReportType(type);
        setMessage(''); // Limpiar mensajes al cambiar
        // Opcional: Resetear filtros si se desea
        // setTransactionFilters({ dateFrom: '', dateTo: '', type: 'all', accountId: 'all', categoryId: 'all' });
        // setTripFilters({ tripId: '', dateFrom: '', dateTo: '' });
    }, [isLoading, isGenerating]);

    const handleFormatChange = useCallback((format) => {
        if (isLoading || isGenerating) return;
        if (format === 'pdf') {
            setInfoModalConfig({ title: 'Función no disponible', message: 'La exportación a PDF estará disponible próximamente.' });
            setIsInfoModalOpen(true);
            return;
        }
        setSelectedFormat(format);
        setMessage('');
    }, [isLoading, isGenerating]);

    const handleTransactionFilterChange = useCallback((e) => {
        const { name, value } = e.target;
        setTransactionFilters(prev => ({ ...prev, [name]: value }));
    }, []);

    const handleTripFilterChange = useCallback((e) => {
        const { name, value } = e.target;
        setTripFilters(prev => ({ ...prev, [name]: value }));
    }, []);

    const handleFilterTypeClick = useCallback((type) => {
        setTransactionFilters(prev => ({ ...prev, type: type }));
    }, []);

    // Abrir Modal de Selección (Cuentas o Categorías)
    const handleOpenSelectionModal = useCallback((settingKey) => {
        if (isLoading || isGenerating) return;

        let title = '';
        let options = [];
        let currentValue = 'all';

        if (settingKey === 'accountId') {
            title = 'Seleccionar Cuenta';
            options = [
                { id: 'all', name: 'Todas las cuentas' }, // Usar 'all' como ID
                ...accounts.map(acc => ({ id: acc.id, name: acc.name }))
            ];
            currentValue = transactionFilters.accountId;
        } else if (settingKey === 'categoryId') {
            title = 'Seleccionar Categoría';
            options = [
                { id: 'all', name: 'Todas las categorías' },
                { id: 'none', name: '(Sin Categoría)' }, // Opción para sin categoría
                ...categories.map(cat => ({ id: cat.id, name: cat.name }))
            ];
            currentValue = transactionFilters.categoryId;
        } else {
            console.error("Invalid settingKey for selection modal:", settingKey);
            return;
        }

        setSelectionModalConfig({
            title: title,
            options: options,
            settingKey: settingKey,
            currentValue: currentValue,
            isLoading: false // Ya no cargamos async aquí
        });
        setIsSelectionModalOpen(true);
    }, [isLoading, isGenerating, accounts, categories, transactionFilters]);

    const handleCloseSelectionModal = useCallback(() => setIsSelectionModalOpen(false), []);

    // Guardar selección del modal
    const handleSaveSelection = useCallback((selectedOption) => {
        if (!selectedOption) return; // Seguridad

        const { settingKey } = selectionModalConfig;
        const selectedId = selectedOption.id; // 'all', 'none', o un UUID
        const selectedName = selectedOption.name;

        console.log(`Selección guardada para ${settingKey}:`, selectedOption);

        if (settingKey === 'accountId') {
            setTransactionFilters(prev => ({ ...prev, accountId: selectedId }));
            setSelectedAccountName(selectedName);
        } else if (settingKey === 'categoryId') {
            setTransactionFilters(prev => ({ ...prev, categoryId: selectedId }));
            setSelectedCategoryName(selectedName);
        }
        handleCloseSelectionModal();
    }, [selectionModalConfig, handleCloseSelectionModal]);

    const handleCloseInfoModal = useCallback(() => setIsInfoModalOpen(false), []);

    // --- Generación del Informe ---
    const handleGenerateReport = useCallback(async () => {
        if (isGenerating || !supabase || !userId) return;
        hideMessage();
        setIsGenerating(true);

        try {
            // 1. Recopilar filtros activos
            let finalFilters = {};
            if (selectedReportType === 'transactions') {
                finalFilters = {
                    dateFrom: transactionFilters.dateFrom || null,
                    dateTo: transactionFilters.dateTo || null,
                    type: transactionFilters.type,
                    accountId: transactionFilters.accountId,
                    categoryId: transactionFilters.categoryId,
                };
                 // Validación fechas transacción
                 if (finalFilters.dateFrom && finalFilters.dateTo && new Date(finalFilters.dateTo) < new Date(finalFilters.dateFrom)) {
                    throw new Error('La fecha "Hasta" no puede ser anterior a la fecha "Desde".');
                }
            } else if (selectedReportType === 'trip_expenses') {
                if (!tripFilters.tripId) {
                    throw new Error('Debes seleccionar un viaje para exportar sus gastos.');
                }
                finalFilters = {
                    tripId: tripFilters.tripId,
                    dateFrom: tripFilters.dateFrom || null, // Fechas opcionales para gastos de viaje
                    dateTo: tripFilters.dateTo || null,
                };
                 // Validación fechas viaje (si ambas están presentes)
                 if (finalFilters.dateFrom && finalFilters.dateTo && new Date(finalFilters.dateTo) < new Date(finalFilters.dateFrom)) {
                    throw new Error('La fecha "Hasta" no puede ser anterior a la fecha "Desde".');
                }
            }

            // 2. Preparar payload para la Edge Function
            const payload = {
                reportType: selectedReportType,
                filters: finalFilters,
                format: selectedFormat // Actualmente siempre 'csv'
            };

            console.log("Generando informe con payload:", payload);

            // 3. Llamar a la Edge Function usando fetch (como en el JS original)
            // Asegúrate que estas variables de entorno o constantes sean correctas
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL; // O tu URL directa
            const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY; // O tu key directa
            const functionUrl = `${supabaseUrl}/functions/v1/generate_filtered_report`;

            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session) throw new Error("No se pudo obtener la sesión de usuario.");
            const accessToken = session.access_token;

            if (!supabaseUrl || !anonKey) throw new Error("URL o Clave Anon de Supabase no configuradas.");

            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'apikey': anonKey, // La anon key es necesaria para funciones con auth
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            console.log("Respuesta de la función - Status:", response.status, response.statusText);

            // 4. Procesar la respuesta
            if (!response.ok) {
                let errorMsg = `Error ${response.status}: ${response.statusText}`;
                try {
                    const errorBody = await response.json();
                    if (errorBody.error) errorMsg = `Error desde la función: ${errorBody.error}`;
                } catch (e) { /* Ignorar si el cuerpo no es JSON */ }
                throw new Error(errorMsg);
            }

            const contentType = response.headers.get('content-type');

            if (contentType && contentType.includes('text/csv')) {
                // Descarga CSV manejada por el navegador (gracias a Content-Disposition)
                // Pero necesitamos iniciarla explícitamente en algunos casos
                const blob = await response.blob();
                const downloadUrl = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = downloadUrl;
                // Extraer nombre del header o poner uno por defecto
                const disposition = response.headers.get('content-disposition');
                let filename = 'reporte.csv';
                if (disposition && disposition.indexOf('attachment') !== -1) {
                    const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                    const matches = filenameRegex.exec(disposition);
                    if (matches != null && matches[1]) {
                        filename = matches[1].replace(/['"]/g, '');
                    }
                }
                link.setAttribute('download', filename);
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(downloadUrl); // Limpiar URL del objeto

                setMessage('Informe generado. Descarga iniciada.');
                setMessageType('success');
                setTimeout(hideMessage, 4000);

            } else if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                if (data && data.status === 'empty') {
                    console.log("Generación completada, no había datos.");
                    setInfoModalConfig({ title: 'Informe Vacío', message: data.message || "No se encontraron datos con los filtros seleccionados." });
                    setIsInfoModalOpen(true);
                } else {
                    console.warn("Respuesta JSON inesperada:", data);
                    throw new Error("Se recibió una respuesta inesperada de la función.");
                }
            } else {
                console.warn("Respuesta con Content-Type desconocido:", contentType);
                setMessage(`Respuesta recibida (${response.status}), pero formato no reconocido.`);
                setMessageType('info');
            }

        } catch (error) {
            console.error('Error generando informe:', error);
            setMessage(`Error al generar el informe: ${error.message}`);
            setMessageType('error');
        } finally {
            setIsGenerating(false);
        }
    }, [isGenerating, supabase, userId, selectedReportType, transactionFilters, tripFilters, selectedFormat]);

    const showMessage = (type, text) => {
        setMessage(text);
        setMessageType(type);
    };
    const hideMessage = () => setMessage('');

    // Reutilizar handleLogout, handleBack, scrollToTop
    const handleLogout = useCallback(async () => {
         if (isGenerating) return; // No cerrar sesión mientras se genera
         setIsLoading(true); // Mostrar indicador general
         try {
             const { error } = await supabase.auth.signOut();
             if (error) throw error;
             // El listener global debería redirigir
         } catch (error) {
             console.error("Error al cerrar sesión:", error);
             setMessage("Error al cerrar sesión."); setMessageType("error"); setIsLoading(false);
         }
     }, [isGenerating, supabase]); // Incluir supabase
    const handleBack = useCallback(() => navigate(-1), [navigate]);
    const scrollToTop = useCallback(() => window.scrollTo({ top: 0, behavior: 'smooth' }), []);

    // --- Renderizado ---
    if (isLoading && !userId) { // Mostrar carga inicial
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><p>Cargando...</p></div>;
    }

    return (
        <div style={{ display: 'flex' }}>

            {/* --- Sidebar --- */}
            <aside className="sidebar">
                <div className="sidebar-logo"> <img src={finAiLogo} alt="FinAi Logo Small" /> </div>
                <nav className="sidebar-nav">
                    <Link to="/dashboard" className="nav-button" title="Dashboard"><i className="fas fa-home"></i> <span>Dashboard</span></Link>
                    {/* ... otros links ... */}
                    <Link to="/reports" className="nav-button active" title="Informes"><i className="fas fa-chart-bar"></i> <span>Informes</span></Link>
                    <Link to="/profile" className="nav-button" title="Perfil"><i className="fas fa-user-circle"></i> <span>Perfil</span></Link>
                    <Link to="/settings" className="nav-button" title="Configuración"><i className="fas fa-cog"></i> <span>Configuración</span></Link>
                    {/* ... otros links ... */}
                </nav>
                <button className="nav-button logout-button" onClick={handleLogout} title="Cerrar Sesión" disabled={isLoading || isGenerating}>
                    {(isLoading || isGenerating) ? <><i className="fas fa-spinner fa-spin"></i> <span>...</span></> : <><i className="fas fa-sign-out-alt"></i> <span>Salir</span></>}
                </button>
            </aside>

            {/* --- Contenido Principal --- */}
            <div className="page-container">
                {/* --- Cabecera --- */}
                <div className="page-header reports-header">
                    <button onClick={handleBack} id="backButton" className="btn-icon" aria-label="Volver" disabled={isGenerating}><i className="fas fa-arrow-left"></i></button>
                    <div className="header-title-group">
                        <img id="userAvatarHeader" src={userAvatarUrl} alt="Avatar" className="header-avatar-small" />
                        <h1>Generar Informes</h1>
                    </div>
                    <div style={{ width: '40px' }}></div> {/* Spacer */}
                </div>

                {/* --- Contenedor Generador --- */}
                <div className="report-generator-container">

                    {/* Paso 1: Tipo de Informe */}
                    <div className="settings-card report-step">
                        <h2><span className="step-number">1</span> ¿Qué quieres exportar?</h2>
                        <div className="report-type-selector">
                            <button
                                className={`report-type-option ${selectedReportType === 'transactions' ? 'active' : ''}`}
                                onClick={() => handleReportTypeChange('transactions')}
                                disabled={isLoading || isGenerating}
                            >
                                <i className="fas fa-exchange-alt"></i> Transacciones
                            </button>
                            <button
                                className={`report-type-option ${selectedReportType === 'trip_expenses' ? 'active' : ''}`}
                                onClick={() => handleReportTypeChange('trip_expenses')}
                                disabled={isLoading || isGenerating}
                            >
                                <i className="fas fa-plane-departure"></i> Gastos de Viaje
                            </button>
                        </div>
                    </div>

                    {/* Paso 2: Filtros (Condicional) */}
                    <div className="settings-card report-step">
                        <h2><span className="step-number">2</span> Aplica los filtros</h2>

                        {/* Filtros para Transacciones */}
                        {selectedReportType === 'transactions' && (
                            <div id="transactionFilters" className="filter-group active">
                                <div className="date-range-filter">
                                    <div className="input-group">
                                        <label htmlFor="dateFrom"><i className="fas fa-calendar-alt icon-inline"></i> Fecha Desde</label>
                                        <input type="date" id="dateFrom" name="dateFrom" value={transactionFilters.dateFrom} onChange={handleTransactionFilterChange} disabled={isGenerating} />
                                    </div>
                                    <div className="input-group">
                                        <label htmlFor="dateTo"><i className="fas fa-calendar-alt icon-inline"></i> Fecha Hasta</label>
                                        <input type="date" id="dateTo" name="dateTo" value={transactionFilters.dateTo} onChange={handleTransactionFilterChange} disabled={isGenerating} />
                                    </div>
                                </div>
                                <div className="input-group">
                                    <label><i className="fas fa-filter icon-inline"></i> Tipo</label>
                                    <div className="type-selector" id="filterTypeSelector">
                                        <button className={`type-option ${transactionFilters.type === 'all' ? 'active' : ''}`} onClick={() => handleFilterTypeClick('all')} disabled={isGenerating}>Todos</button>
                                        <button className={`type-option ${transactionFilters.type === 'ingreso' ? 'active' : ''}`} onClick={() => handleFilterTypeClick('ingreso')} disabled={isGenerating}>Ingresos</button>
                                        <button className={`type-option ${transactionFilters.type === 'gasto' ? 'active' : ''}`} onClick={() => handleFilterTypeClick('gasto')} disabled={isGenerating}>Gastos</button>
                                    </div>
                                </div>
                                <div className={`setting-item clickable ${accounts.length === 0 ? 'disabled' : ''}`} onClick={() => accounts.length > 0 && handleOpenSelectionModal('accountId')} aria-disabled={accounts.length === 0 || isGenerating}>
                                    <span><i className="fas fa-landmark icon-inline"></i> Cuenta</span>
                                    <span className="setting-value-editable" id="selectedAccountFilter">{selectedAccountName} <i className="fas fa-chevron-right"></i></span>
                                </div>
                                <div className={`setting-item clickable ${categories.length === 0 ? 'disabled' : ''}`} onClick={() => categories.length > 0 && handleOpenSelectionModal('categoryId')} aria-disabled={categories.length === 0 || isGenerating}>
                                    <span><i className="fas fa-tag icon-inline"></i> Categoría</span>
                                    <span className="setting-value-editable" id="selectedCategoryFilter">{selectedCategoryName} <i className="fas fa-chevron-right"></i></span>
                                </div>
                            </div>
                        )}

                        {/* Filtros para Gastos de Viaje */}
                        {selectedReportType === 'trip_expenses' && (
                            <div id="tripFilters" className="filter-group active">
                                <div className="input-group">
                                    <label htmlFor="tripFilterSelect"><i className="fas fa-suitcase-rolling icon-inline"></i> Selecciona el Viaje</label>
                                    <select id="tripFilterSelect" name="tripId" required value={tripFilters.tripId} onChange={handleTripFilterChange} disabled={isGenerating || trips.length === 0}>
                                        <option value="" disabled>{isLoading ? 'Cargando...' : (trips.length === 0 ? 'No hay viajes' : 'Selecciona un viaje...')}</option>
                                        {trips.map(trip => <option key={trip.id} value={trip.id}>{trip.name}</option>)}
                                    </select>
                                </div>
                                <div className="date-range-filter">
                                    <div className="input-group">
                                        <label htmlFor="tripDateFrom"><i className="fas fa-calendar-alt icon-inline"></i> Fecha Desde (Opcional)</label>
                                        <input type="date" id="tripDateFrom" name="dateFrom" value={tripFilters.dateFrom} onChange={handleTripFilterChange} disabled={isGenerating} />
                                    </div>
                                    <div className="input-group">
                                        <label htmlFor="tripDateTo"><i className="fas fa-calendar-alt icon-inline"></i> Fecha Hasta (Opcional)</label>
                                        <input type="date" id="tripDateTo" name="dateTo" value={tripFilters.dateTo} onChange={handleTripFilterChange} disabled={isGenerating} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Paso 3: Formato */}
                    <div className="settings-card report-step">
                        <h2><span className="step-number">3</span> Elige el formato</h2>
                        <div className="format-selector" id="formatSelector">
                            <button
                                className={`format-option ${selectedFormat === 'csv' ? 'active' : ''}`}
                                onClick={() => handleFormatChange('csv')}
                                disabled={isLoading || isGenerating}
                            >
                                <i className="fas fa-file-csv"></i> CSV
                            </button>
                            <button
                                className="format-option disabled" // PDF deshabilitado
                                onClick={() => handleFormatChange('pdf')}
                                title="Próximamente"
                                disabled={isLoading || isGenerating}
                            >
                                <i className="fas fa-file-pdf"></i> PDF
                            </button>
                        </div>
                    </div>

                    {/* Sección Acción */}
                    <div className="action-section">
                        <button
                            id="generateReportBtn"
                            className="btn btn-primary btn-generate"
                            onClick={handleGenerateReport}
                            disabled={isLoading || isGenerating || (selectedReportType === 'trip_expenses' && !tripFilters.tripId)} // Deshabilitar si carga, genera o falta viaje
                        >
                            <i className={`fas ${isGenerating ? 'fa-spinner fa-spin' : 'fa-cogs'}`}></i> {isGenerating ? 'Generando...' : 'Generar Informe'}
                        </button>
                        {message && (
                            <p id="reportMessage" className={`message ${messageType}`}>
                                {message}
                            </p>
                        )}
                    </div>

                </div> {/* Fin report-generator-container */}
            </div> {/* Fin page-container */}

            {/* --- Modal de Selección (Genérico - Adaptado) --- */}
            {isSelectionModalOpen && (
                <div id="selectionModal" className="modal-overlay small active" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget) handleCloseSelectionModal(); }}>
                    <div className="modal-content">
                        <h2 id="selectionModalTitle">{selectionModalConfig.title}</h2>
                        {/* No necesitamos form si la selección es directa con botones */}
                        <div id="selectionOptionsContainer" className="selection-options list-options"> {/* Añadida clase list-options */}
                            {selectionModalConfig.isLoading && <p>Cargando opciones...</p>}
                            {!selectionModalConfig.isLoading && selectionModalConfig.options.length === 0 && <p>No hay opciones disponibles.</p>}
                            {!selectionModalConfig.isLoading && selectionModalConfig.options.map(option => (
                                <button
                                    type="button"
                                    key={option.id} // Usar ID como key
                                    onClick={() => handleSaveSelection(option)}
                                    // Marcar visualmente el activo (opcional)
                                    className={`btn btn-option ${option.id === selectionModalConfig.currentValue ? 'active' : ''}`}
                                >
                                    {option.name}
                                </button>
                            ))}
                        </div>
                        <div className="modal-actions">
                            <button type="button" onClick={handleCloseSelectionModal} className="btn btn-secondary">Cancelar</button>
                        </div>
                        {/* <p id="modalSelectionError" className="error-message" style={{ display: 'none' }}></p> */}
                    </div>
                </div>
            )}

            {/* --- Modal de Información (Genérico) --- */}
            {isInfoModalOpen && (
                <div id="infoModal" className="modal-overlay small active" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget) handleCloseInfoModal(); }}>
                    <div className="modal-content info-modal-content">
                        <h2 id="infoModalTitle"><i className="fas fa-info-circle"></i> {infoModalConfig.title}</h2>
                        <p id="infoModalMessage" className="modal-instructions" style={{ textAlign: 'center', margin: '25px 0', lineHeight: '1.6' }}>
                            {infoModalConfig.message}
                        </p>
                        <div className="modal-actions" style={{ justifyContent: 'center' }}>
                            <button type="button" onClick={handleCloseInfoModal} id="infoModalCloseBtn" className="btn btn-primary">Aceptar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Botón Scroll-Top --- */}
            {showScrollTop && (
                <button onClick={scrollToTop} id="scrollTopBtn" className="scroll-top-btn visible" title="Volver arriba">
                    <i className="fas fa-arrow-up"></i>
                </button>
            )}

        </div> // Fin contenedor flex principal
    );
}

export default Reports;
