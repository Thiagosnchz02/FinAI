/*
Archivo: src/pages/Reports.jsx
Propósito: Componente para la página de generación de informes exportables.
*/
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext.jsx';
import Sidebar from '../components/layout/Sidebar.jsx'; 
//import { formatCurrency, formatDate } from '../utils/formatters.js'; // Importar utils
import toast from 'react-hot-toast'; // Importar toast
import SelectionModal from '../components/common/SelectionModal.jsx'; // Asume componente genérico
import InfoModal from '../components/common/InfoModal.jsx'; 

// Importa imágenes
import defaultAvatar from '../assets/avatar_predeterminado.png';

function Reports() {
    // --- Estado del Componente ---
    const { user, loading: authLoading } = useAuth();
    const [avatarUrl, setAvatarUrl] = useState(defaultAvatar);
    const [selectedReportType, setSelectedReportType] = useState('transactions');
    const [selectedFormat, setSelectedFormat] = useState('csv');

    // Filtros Transacciones
    const [transactionFilters, setTransactionFilters] = useState({ dateFrom: '', dateTo: '', type: 'all', accountId: 'all', categoryId: 'all' });
    // Estados para mostrar nombre seleccionado (alternativa: buscar en listas al renderizar)
    const [selectedAccountName, setSelectedAccountName] = useState('Todas las cuentas');
    const [selectedCategoryName, setSelectedCategoryName] = useState('Todas las categorías');

    // Filtros Viajes
    const [tripFilters, setTripFilters] = useState({ tripId: '', dateFrom: '', dateTo: '' });

    // Datos para Selectores
    const [accounts, setAccounts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [trips, setTrips] = useState([]);

    // Estados Modales
    const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
    const [selectionModalConfig, setSelectionModalConfig] = useState({ title: '', options: [], settingKey: '', currentValue: 'all' });
    const [infoModalConfig, setInfoModalConfig] = useState({ title: 'Información', message: '' });

    // Otros estados UI
    const [isLoading, setIsLoading] = useState(true); // Carga inicial
    const [isGenerating, setIsGenerating] = useState(false); // Generación reporte
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [error, setError] = useState(null); // Error general de carga

    const navigate = useNavigate(); // Para evitar setear estado en componente desmontado

    const fetchData = useCallback(async (currentUserId) => {
        setIsLoading(true); setError(null);
        setAccounts([]); setCategories([]); setTrips([]); // Resetear listas
        console.log(`Reports: Cargando datos iniciales para ${currentUserId}`);
        try {
            const [profileRes, accountsRes, categoriesRes, tripsRes] = await Promise.all([
                supabase.from('profiles').select('avatar_url').eq('id', currentUserId).single(),
                supabase.from('accounts').select('id, name').eq('user_id', currentUserId).order('name'),
                supabase.from('categories').select('id, name').or(`user_id.eq.${currentUserId},is_default.eq.true`).order('name'),
                supabase.from('trips').select('id, name').eq('user_id', currentUserId).order('start_date', { ascending: false })
            ]);

            if (profileRes.error && profileRes.status !== 406) console.warn("Error loading avatar", profileRes.error); // No lanzar error fatal por avatar
            setAvatarUrl(profileRes.data?.avatar_url || defaultAvatar);

            if (accountsRes.error) throw new Error(`Cuentas: ${accountsRes.error.message}`);
            setAccounts(accountsRes.data || []);

            if (categoriesRes.error) throw new Error(`Categorías: ${categoriesRes.error.message}`);
            setCategories(categoriesRes.data || []);

            if (tripsRes.error) throw new Error(`Viajes: ${tripsRes.error.message}`);
            setTrips(tripsRes.data || []);

        } catch (err) {
            console.error("Error loading initial data (Reports):", err);
            setError(err.message || "Error al cargar datos necesarios.");
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    // --- Efecto: Carga Inicial (Usuario y Datos Filtros) ---
    useEffect(() => { // Carga inicial
        if (authLoading) { setIsLoading(true); return; }
        if (!user) { navigate('/login'); return; }
        fetchData(user.id);
    }, [user, authLoading, navigate, fetchData]);

    useEffect(() => { // Scroll listener
        const handleScroll = () => setShowScrollTop(window.scrollY > 300);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // --- Manejadores de Eventos ---

    const handleReportTypeChange = useCallback((type) => {
        if (isLoading || isGenerating) return;
        setSelectedReportType(type);
        setMessage(''); // Limpiar mensajes al cambiar
        // Opcional: Resetear filtros si se desea
        setTransactionFilters({ dateFrom: '', dateTo: '', type: 'all', accountId: 'all', categoryId: 'all' });
        setTripFilters({ tripId: '', dateFrom: '', dateTo: '' });
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
        let title = ''; let options = []; let currentValue = 'all';
        if (settingKey === 'accountId') {
            title = 'Seleccionar Cuenta';
            options = [{ id: 'all', name: 'Todas las cuentas' }, ...accounts.map(a => ({ id: a.id, name: a.name }))];
            currentValue = transactionFilters.accountId;
        } else if (settingKey === 'categoryId') {
            title = 'Seleccionar Categoría';
            options = [{ id: 'all', name: 'Todas las categorías' }, { id: 'none', name: '(Sin Categoría)' }, ...categories.map(c => ({ id: c.id, name: c.name }))];
            currentValue = transactionFilters.categoryId;
        } else return;
        setSelectionModalConfig({ title, options, settingKey, currentValue, isLoading: false });
        setIsSelectionModalOpen(true);
    }, [isLoading, isGenerating, accounts, categories, transactionFilters]);

    const handleCloseSelectionModal = useCallback(() => setIsSelectionModalOpen(false), []);

    const handleSaveSelection = useCallback((selectedOption) => {
        if (!selectedOption) return;
        const { settingKey } = selectionModalConfig;
        if (settingKey === 'accountId') {
            setTransactionFilters(prev => ({ ...prev, accountId: selectedOption.id }));
            setSelectedAccountName(selectedOption.name);
        } else if (settingKey === 'categoryId') {
            setTransactionFilters(prev => ({ ...prev, categoryId: selectedOption.id }));
            setSelectedCategoryName(selectedOption.name);
        }
        handleCloseSelectionModal();
    }, [selectionModalConfig, handleCloseSelectionModal]);

    const handleCloseInfoModal = useCallback(() => setIsInfoModalOpen(false), []);

    // --- Generación del Informe ---
    const handleGenerateReport = useCallback(async () => {
        if (isGenerating || !supabase || !user?.id) return;
        setError(null); // Limpiar error previo
        setIsGenerating(true);
        const toastId = toast.loading('Generando informe...');

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
            const payload = { reportType: selectedReportType, filters: finalFilters, format: selectedFormat };
            console.log("Generando informe con payload:", payload);

            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
            const functionUrl = `${supabaseUrl}/functions/v1/generate_filtered_report`; // Asegúrate que el nombre sea correcto
            if (!supabaseUrl || !anonKey) throw new Error("Configuración de Supabase incompleta.");

            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session) throw new Error("No se pudo obtener la sesión.");

            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}`, 'apikey': anonKey, 'Content-Type': 'application/json' },
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
                // Descarga CSV
                const blob = await response.blob(); const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url;
                // Extraer nombre archivo o default
                const disposition = response.headers.get('content-disposition'); let filename = 'reporte.csv'; if (disposition?.includes('attachment')) { const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition); if (matches?.[1]) filename = matches[1].replace(/['"]/g, ''); }
                a.download = filename; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
                toast.success('Informe generado. Descarga iniciada.', { id: toastId });

            } else if (contentType && contentType.includes('application/json')) {
                 // Informe vacío
                const data = await response.json();
                 if (data?.status === 'empty') {
                    toast.dismiss(toastId); // Quitar toast de carga
                    setInfoModalConfig({ title: 'Informe Vacío', message: data.message || "No hay datos con esos filtros." });
                    setIsInfoModalOpen(true);
                 } else { throw new Error("Respuesta inesperada."); }
            } else { throw new Error("Formato de respuesta no reconocido."); }

        } catch (error) {
            console.error('Error generando informe:', error);
            toast.error(`Error: ${error.message}`, { id: toastId });
        } finally {
            setIsGenerating(false);
        }
    }, [isGenerating, supabase, user, selectedReportType, transactionFilters, tripFilters, selectedFormat]); // Faltaba user

    // Reutilizar handleLogout, handleBack, scrollToTop
    const handleBack = useCallback(() => navigate(-1), [navigate]);
    const scrollToTop = useCallback(() => window.scrollTo({ top: 0, behavior: 'smooth' }), []);

    // --- Renderizado ---
    if (isLoading && !userId) { // Mostrar carga inicial
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><p>Cargando...</p></div>;
    }

    return (
        <div style={{ display: 'flex' }}>

            {/* --- Sidebar --- */}
            <Sidebar
                // Pasar estado de carga/guardado si quieres deshabilitar botones mientras ocurre algo
                isProcessing={isLoading || isSaving /* ...o el estado relevante */}
            />

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
            <SelectionModal
                isOpen={isSelectionModalOpen}
                onClose={handleCloseSelectionModal}
                onSave={handleSaveSelection} // Pasa la función correcta
                config={selectionModalConfig} // Pasa la configuración completa
            />
            <InfoModal
                isOpen={isInfoModalOpen}
                onClose={handleCloseInfoModal}
                config={infoModalConfig} // Pasa la configuración
            />

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
