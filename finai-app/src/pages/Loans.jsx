/*
Archivo: src/pages/Loans.jsx
Propósito: Componente para la página de gestión de préstamos realizados a terceros.
*/
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient'; // Importa cliente Supabase

// Importa imágenes
import finAiLogo from '../assets/Logo_FinAI_Oficial.png';
import defaultAvatar from '../assets/avatar_predeterminado.png';
import emptyMascot from '../assets/monstruo_pixar.png';

// --- Constantes ---
const COLLECTION_CATEGORY_NAME = 'Devolución Préstamos'; // Nombre exacto categoría INGRESO

// --- Funciones de Utilidad --- (Mover a /utils)
// --- Funciones de Utilidad --- (Mover a /utils)
/**
 * Formatea un número como moneda en formato español (EUR por defecto).
 * @param {number | string | null | undefined} value El valor numérico a formatear.
 * @param {string} [currency='EUR'] El código de moneda ISO 4217.
 * @returns {string} El valor formateado como moneda o 'N/A' si la entrada no es válida.
 */
const formatCurrency = (value, currency = 'EUR') => {
    const numberValue = Number(value);
    if (isNaN(numberValue) || value === null || value === undefined) {
        return 'N/A';
    }
    try {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(numberValue);
    } catch (e) {
        console.error("Error formatting currency:", value, currency, e);
        return `${numberValue.toFixed(2)} ${currency}`;
    }
  };
  
  /**
  * Formatea una cadena de fecha (YYYY-MM-DD o ISO) a formato DD/MM/YYYY.
  * @param {string | null | undefined} dateString La cadena de fecha.
  * @returns {string} La fecha formateada o '--/--/----' si no es válida.
  */
  const formatDate = (dateString) => {
    if (!dateString) return '--/--/----';
    try {
        const date = new Date(dateString);
        const offset = date.getTimezoneOffset();
        const adjustedDate = new Date(date.getTime() + (offset * 60 * 1000));
        if (isNaN(adjustedDate.getTime())) return '--/--/----';
        const day = String(adjustedDate.getDate()).padStart(2, '0');
        const month = String(adjustedDate.getMonth() + 1).padStart(2, '0');
        const year = adjustedDate.getFullYear();
        return `${day}/${month}/${year}`;
    } catch (e) {
        console.error("Error formateando fecha:", dateString, e);
        return '--/--/----';
    }
  };
/**
 * Devuelve la clase de icono de Font Awesome para un préstamo.
 * Actualmente devuelve un icono genérico, pero podría personalizarse.
 * @param {string} [description=''] La descripción del préstamo (actualmente no usada).
 * @returns {string} La clase CSS del icono Font Awesome.
 */
const getIconForLoan = (description = '') => {
    // TODO: Podría personalizarse basado en 'description' o 'debtor' si se desea en el futuro.
    return 'fas fa-hand-holding-usd'; // Icono genérico de recibir dinero/préstamo
};

/**
 * Devuelve la clase CSS para el badge de estado de un préstamo.
 * Asegúrate de que estas clases ('status-collected', 'status-pending-loan', 'status-partial-loan')
 * estén definidas en tu archivo CSS global o específico del componente.
 * @param {string | null | undefined} status El estado actual del préstamo ('cobrado', 'pendiente', 'parcial').
 * @returns {string} La clase CSS correspondiente al estado.
 */
const getStatusBadgeClassLoan = (status) => {
    switch (status) {
        case 'cobrado':
            return 'status-collected'; // Ej: fondo verde
        case 'pendiente':
            return 'status-pending-loan'; // Ej: fondo naranja
        case 'parcial':
            return 'status-partial-loan'; // Ej: fondo azul
        default:
            console.warn(`getStatusBadgeClassLoan: Estado desconocido recibido: ${status}. Usando 'status-pending-loan'.`);
            return 'status-pending-loan'; // Estado por defecto si es nulo, indefinido o desconocido
    }
};

/**
 * Devuelve el texto legible para mostrar el estado de un préstamo.
 * @param {string | null | undefined} status El estado actual del préstamo ('cobrado', 'pendiente', 'parcial').
 * @returns {string} El texto descriptivo del estado.
 */
const getStatusTextLoan = (status) => {
    switch (status) {
        case 'cobrado':
            return 'Cobrado';
        case 'pendiente':
            return 'Pendiente';
        case 'parcial':
            return 'Parcialmente Cobrado';
        default:
             console.warn(`getStatusTextLoan: Estado desconocido recibido: ${status}. Usando 'Pendiente'.`);
            return 'Pendiente'; // Texto por defecto
    }
};
// --- Fin Funciones de Utilidad ---


function Loans() {
    // --- Estado del Componente ---
    const [userId, setUserId] = useState(null);
    const [avatarUrl, setAvatarUrl] = useState(defaultAvatar);
    const [loans, setLoans] = useState([]);
    const [accounts, setAccounts] = useState([]); // Para modal de cobro
    const [collectionCategoryId, setCollectionCategoryId] = useState(null); // ID categoría "Devolución Préstamos"
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    // Modales
    const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
    const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add'); // 'add' o 'edit' para loanModal
    const [selectedLoan, setSelectedLoan] = useState(null); // Para editar o añadir cobro
    const [loanFormData, setLoanFormData] = useState({ debtor: '', description: '', initial_amount: '', current_balance: '', interest_rate: '', due_date: '', status: 'pendiente', reminder_enabled: false, notes: '' });
    const [collectionFormData, setCollectionFormData] = useState({ amount: '', date: new Date().toISOString().split('T')[0], accountId: '', notes: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [modalError, setModalError] = useState('');
    // Resumen Footer
    const [showSummaryFooter, setShowSummaryFooter] = useState(false);
    // UI
    const [showScrollTop, setShowScrollTop] = useState(false);

    const navigate = useNavigate();

    // --- Efectos ---
    useEffect(() => {
        // Carga inicial: usuario, avatar, préstamos, cuentas, ID categoría cobro
        const loadInitialData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // 1. Obtener usuario (Simulado)
                const simulatedUserId = 'USER_ID_PLACEHOLDER'; // Reemplazar
                setUserId(simulatedUserId);

                // 2. Cargar perfil, préstamos, cuentas y categoría de cobro
                const [profileRes, loansRes, accountsRes, categoryRes] = await Promise.all([
                    supabase.from('profiles').select('avatar_url').eq('id', simulatedUserId).single(),
                    supabase.from('loans').select('*').eq('user_id', simulatedUserId).order('status').order('due_date'),
                    supabase.from('accounts').select('id, name').eq('user_id', simulatedUserId).order('name'),
                    supabase.from('categories').select('id').eq('name', COLLECTION_CATEGORY_NAME).eq('type', 'ingreso').or(`user_id.eq.${simulatedUserId},is_default.eq.true`).limit(1).single() // Buscar categoría INGRESO
                ]);

                // Procesar perfil
                if (profileRes.error && profileRes.status !== 406) throw profileRes.error;
                setAvatarUrl(profileRes.data?.avatar_url || defaultAvatar);

                // Procesar préstamos
                if (loansRes.error) throw loansRes.error;
                const fetchedLoans = loansRes.data || [];
                setLoans(fetchedLoans);
                setShowSummaryFooter(fetchedLoans.length > 0);

                // Procesar cuentas
                if (accountsRes.error) throw accountsRes.error;
                setAccounts(accountsRes.data || []);

                // Procesar categoría de cobro
                if (categoryRes.error && categoryRes.status !== 406) throw categoryRes.error;
                if (categoryRes.data) {
                    setCollectionCategoryId(categoryRes.data.id);
                    console.log(`ID Categoría "${COLLECTION_CATEGORY_NAME}":`, categoryRes.data.id);
                } else {
                    console.warn(`¡Advertencia! No se encontró la categoría de INGRESO "${COLLECTION_CATEGORY_NAME}". El registro de cobros fallará.`);
                    setError(`Error: Falta la categoría de ingreso "${COLLECTION_CATEGORY_NAME}".`);
                }

            } catch (err) {
                console.error("Error cargando datos iniciales (Loans):", err);
                setError(err.message || "Error al cargar datos.");
            } finally {
                setIsLoading(false);
            }
        };
        loadInitialData();

        // Scroll-top listener
        const handleScroll = () => setShowScrollTop(window.scrollY > 300);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [navigate, supabase]); // Dependencias

    // --- Cálculo Resumen Footer (useMemo) ---
    const summary = useMemo(() => {
        let totalOwed = 0; let totalLoaned = 0; let nextDue = null; const today = new Date(); today.setHours(0, 0, 0, 0);
        loans.forEach(loan => { if (loan.status !== 'cobrado') { totalOwed += Number(loan.current_balance) || 0; totalLoaned += Number(loan.initial_amount) || 0; if (loan.due_date) { try { const dueDate = new Date(loan.due_date); const offset = dueDate.getTimezoneOffset(); const adjustedDueDate = new Date(dueDate.getTime() + (offset * 60 * 1000)); adjustedDueDate.setHours(0,0,0,0); if (adjustedDueDate >= today) { if (nextDue === null || adjustedDueDate < nextDue) nextDue = adjustedDueDate; } } catch (e) {} } } });
        return { totalOwedToUser: formatCurrency(totalOwed), totalLoanedActive: formatCurrency(totalLoaned), nextDueDateLoan: nextDue ? formatDate(nextDue.toISOString().split('T')[0]) : '--/--/----' };
    }, [loans]);

    // --- Manejadores Modales ---
    const handleOpenLoanModal = useCallback((mode = 'add', loan = null) => {
        setModalMode(mode); setSelectedLoan(loan); setModalError(''); setIsSaving(false);
        if (mode === 'edit' && loan) { setLoanFormData({ debtor: loan.debtor || '', description: loan.description || '', initial_amount: loan.initial_amount || '', current_balance: loan.current_balance || '', interest_rate: loan.interest_rate || '', due_date: loan.due_date ? loan.due_date.split('T')[0] : '', status: loan.status || 'pendiente', reminder_enabled: loan.reminder_enabled || false, notes: loan.notes || '' }); } else { setLoanFormData({ debtor: '', description: '', initial_amount: '', current_balance: '', interest_rate: '', due_date: '', status: 'pendiente', reminder_enabled: false, notes: '' }); }
        setIsLoanModalOpen(true);
    }, []);
    const handleCloseLoanModal = useCallback(() => setIsLoanModalOpen(false), []);
    const handleOpenCollectionModal = useCallback((loan) => {
        if (!collectionCategoryId) { alert(`Error: No se encontró la categoría de ingreso "${COLLECTION_CATEGORY_NAME}".`); return; }
        setSelectedLoan(loan); setCollectionFormData({ amount: '', date: new Date().toISOString().split('T')[0], accountId: '', notes: '' }); setModalError(''); setIsSaving(false); setIsCollectionModalOpen(true);
    }, [collectionCategoryId]);
    const handleCloseCollectionModal = useCallback(() => setIsCollectionModalOpen(false), []);

    // --- Manejadores Formularios ---
    const handleLoanFormChange = useCallback((e) => {
        const { name, value, type, checked } = e.target;
        setLoanFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        if (modalError) setModalError('');
    }, [modalError]);
    const handleCollectionFormChange = useCallback((e) => {
        const { name, value } = e.target;
        setCollectionFormData(prev => ({ ...prev, [name]: value }));
        if (modalError) setModalError('');
    }, [modalError]);

    // Submit Modal Préstamo
    const handleLoanFormSubmit = useCallback(async (event) => {
        event.preventDefault(); if (!userId) return;
        const initialAmount = parseFloat(loanFormData.initial_amount); const currentBalance = parseFloat(loanFormData.current_balance);
        if (!loanFormData.debtor.trim() || isNaN(initialAmount) || initialAmount <= 0 || isNaN(currentBalance) || currentBalance < 0) { setModalError('Deudor, Importe Inicial (>0) y Saldo Pendiente (>=0) obligatorios.'); return; }
        if (loanFormData.interest_rate && (isNaN(parseFloat(loanFormData.interest_rate)) || parseFloat(loanFormData.interest_rate) < 0)) { setModalError('Tasa interés inválida.'); return; }
        if (modalMode === 'add' && currentBalance > initialAmount) { setModalError('Saldo pendiente no puede ser mayor que inicial al crear.'); return; }
        setModalError(''); setIsSaving(true);
        try {
            const dataToSave = { user_id: userId, debtor: loanFormData.debtor.trim(), description: loanFormData.description.trim() || null, initial_amount: initialAmount, current_balance: currentBalance, interest_rate: parseFloat(loanFormData.interest_rate) || null, due_date: loanFormData.due_date || null, status: loanFormData.status, reminder_enabled: loanFormData.reminder_enabled, notes: loanFormData.notes.trim() || null };
            let error; if (modalMode === 'edit' && selectedLoan) { dataToSave.updated_at = new Date(); delete dataToSave.user_id; const { error: updateError } = await supabase.from('loans').update(dataToSave).eq('id', selectedLoan.id).eq('user_id', userId); error = updateError; } else { const { error: insertError } = await supabase.from('loans').insert([dataToSave]); error = insertError; }
            if (error) throw error;
            handleCloseLoanModal();
            const { data: refreshed, error: refreshError } = await supabase.from('loans').select('*').eq('user_id', userId).order('status').order('due_date'); if(refreshError) throw refreshError; setLoans(refreshed || []); setShowSummaryFooter((refreshed || []).length > 0);
        } catch (err) { console.error('Error guardando préstamo:', err); setModalError(`Error: ${err.message}`); } finally { setIsSaving(false); }
    }, [userId, modalMode, selectedLoan, loanFormData, supabase, handleCloseLoanModal]);

    // Submit Modal Cobro
    const handleCollectionFormSubmit = useCallback(async (event) => {
        event.preventDefault(); if (!userId || !selectedLoan || !collectionCategoryId) { setModalError(!collectionCategoryId ? `Error: Categoría "${COLLECTION_CATEGORY_NAME}" no encontrada.` : 'Error inesperado.'); return; }
        const collectionAmount = parseFloat(collectionFormData.amount); if (!collectionFormData.accountId || !collectionFormData.date || isNaN(collectionAmount) || collectionAmount <= 0) { setModalError('Importe (>0), Fecha y Cuenta Destino obligatorios.'); return; }
        const currentBalance = Number(selectedLoan.current_balance) || 0; if (collectionAmount > currentBalance) { if (!window.confirm(`Registrando cobro de ${formatCurrency(collectionAmount)}, más de lo pendiente (${formatCurrency(currentBalance)}).\n¿Continuar? (Saldo quedará en 0).`)) return; }
        setModalError(''); setIsSaving(true);
        try {
            const transactionData = { user_id: userId, account_id: collectionFormData.accountId, category_id: collectionCategoryId, type: 'ingreso', description: `Cobro préstamo ${selectedLoan.debtor}` + (selectedLoan.description ? ` (${selectedLoan.description})` : ''), amount: Math.abs(collectionAmount), transaction_date: collectionFormData.date, notes: collectionFormData.notes.trim() || null };
            const { error: txError } = await supabase.from('transactions').insert([transactionData]); if (txError) throw new Error(`Error al registrar transacción: ${txError.message}`);
            const newBalance = Math.max(0, currentBalance - collectionAmount); const newStatus = newBalance <= 0 ? 'cobrado' : selectedLoan.status;
            const { error: loanUpdateError } = await supabase.from('loans').update({ current_balance: newBalance, status: newStatus, updated_at: new Date() }).eq('id', selectedLoan.id).eq('user_id', userId); if (loanUpdateError) throw new Error(`Error al actualizar préstamo: ${loanUpdateError.message}`);
            alert('Cobro registrado y préstamo actualizado.'); handleCloseCollectionModal();
            const { data: refreshed, error: refreshError } = await supabase.from('loans').select('*').eq('user_id', userId).order('status').order('due_date'); if(refreshError) throw refreshError; setLoans(refreshed || []); setShowSummaryFooter((refreshed || []).length > 0);
        } catch (error) { console.error('Error procesando cobro:', error); setModalError(`Error: ${error.message}`); } finally { setIsSaving(false); }
    }, [userId, selectedLoan, collectionFormData, collectionCategoryId, accounts, supabase, handleCloseCollectionModal]);

    // Manejador Eliminación
    const handleDeleteLoan = useCallback(async (loanId, debtorName) => {
        if (!userId) return; if (!window.confirm(`¿Seguro eliminar préstamo a "${debtorName}"?`)) return;
        try { const { error } = await supabase.from('loans').delete().eq('id', loanId).eq('user_id', userId); if (error) throw error; alert('Préstamo eliminado.'); setLoans(prev => prev.filter(l => l.id !== loanId)); } catch (error) { console.error('Error eliminando préstamo:', error); alert(`Error: ${error.message}`); }
    }, [userId, supabase]);

    // Otros manejadores
    const handleLogout = useCallback(() => console.log('Logout pendiente'), []);
    const handleBack = useCallback(() => navigate(-1), [navigate]);
    const scrollToTop = useCallback(() => window.scrollTo({ top: 0, behavior: 'smooth' }), []);

    // --- Renderizado ---
    // ... (JSX completo similar a Debts.jsx, adaptando nombres de clase, textos y lógica de renderizado) ...
    return (
        <div style={{ display: 'flex' }}>
            {/* Sidebar */}
             <aside className="sidebar">
                              {/* ... Sidebar con Links ... */}
                               <div className="sidebar-logo"> <img src={finAiLogo} alt="FinAi Logo Small" /> </div>
                               <nav className="sidebar-nav">
                                   <Link to="/dashboard" className="nav-button" title="Dashboard"><i className="fas fa-home"></i> <span>Dashboard</span></Link>
                                   <Link to="/accounts" className="nav-button" title="Cuentas"><i className="fas fa-wallet"></i> <span>Cuentas</span></Link>
                                   <Link to="/budgets" className="nav-button" title="Presupuestos"><i className="fas fa-chart-pie"></i> <span>Presupuestos</span></Link>
                                   <Link to="/categories" className="nav-button" title="Categorías"><i className="fas fa-tags"></i> <span>Categorías</span></Link>
                                   <Link to="/transactions" className="nav-button" title="Transacciones"><i className="fas fa-exchange-alt"></i> <span>Transacciones</span></Link>
                                   <Link to="/trips" className="nav-button" title="Viajes"><i className="fas fa-suitcase-rolling"></i> <span>Viajes</span></Link>
                                   <Link to="/evaluations" className="nav-button" title="Evaluación"><i className="fas fa-balance-scale"></i> <span>Evaluación</span></Link>
                                   <Link to="/reports" className="nav-button" title="Informes"><i className="fas fa-chart-bar"></i> <span>Informes</span></Link>
                                   <Link to="/profile" className="nav-button" title="Perfil"><i className="fas fa-user-circle"></i> <span>Perfil</span></Link>
                                   <Link to="/settings" className="nav-button" title="Configuración"><i className="fas fa-cog"></i> <span>Configuración</span></Link>
                                   <Link to="/debts" className="nav-button" title="Deudas"><i className="fas fa-credit-card"></i> <span>Deudas</span></Link>
                                   <Link to="/loans" className="nav-button" title="Préstamos"><i className="fas fa-hand-holding-usd"></i> <span>Préstamos</span></Link>
                                   <Link to="/fixed-expenses" className="nav-button active" title="Gastos Fijos"><i className="fas fa-receipt"></i> <span>Gastos Fijos</span></Link> {/* Active */}
                                   <Link to="/goals" className="nav-button" title="Metas"><i className="fas fa-bullseye"></i> <span>Metas</span></Link>
                               </nav>
                               <button className="nav-button logout-button" onClick={handleLogout} title="Cerrar Sesión"><i className="fas fa-sign-out-alt"></i> <span>Salir</span></button>
                         </aside>
            {/* Contenido */}
            <div className="page-container">
                {/* Cabecera */}
                <div className="page-header loans-header">
                    <button onClick={handleBack} className="btn-icon"><i className="fas fa-arrow-left"></i></button>
                    <div className="header-title-group"> <img src={avatarUrl} alt="Avatar" className="header-avatar-small" /> <h1>Mis Préstamos</h1> </div>
                    <button onClick={() => handleOpenLoanModal('add')} className="btn btn-primary btn-add"> <i className="fas fa-plus"></i> Añadir Préstamo </button>
                </div>

                {/* Lista Préstamos */}
                <div id="loanList" className="loan-list"> {/* Ajustar clase si es necesario */}
                    {isLoading && ( <p style={{ textAlign: 'center', padding: '20px', color: '#666', width: '100%' }}>Cargando...</p> )}
                    {error && !isLoading && ( <p style={{ textAlign: 'center', padding: '20px', color: 'red', width: '100%' }}>{error}</p> )}
                    {!isLoading && !error && loans.length === 0 && ( <div className="empty-list-message" style={{ width: '100%' }}> <img src={emptyMascot} alt="Mascota" className="empty-mascot" /> <p>No has registrado préstamos.</p> <button onClick={() => handleOpenLoanModal('add')} className="btn btn-primary"> <i className="fas fa-plus"></i> Registrar Préstamo </button> </div> )}
                    {!isLoading && !error && loans.map(loan => {
                        const iconClass = getIconForLoan(loan.description);
                        const statusBadgeClass = getStatusBadgeClassLoan(loan.status);
                        const statusText = getStatusTextLoan(loan.status);
                        return (
                            <div key={loan.id} className="loan-card" data-id={loan.id} data-status={loan.status}>
                                <div className="loan-icon-status"><div className="loan-icon-bg"><i className={iconClass}></i></div><span className={`loan-status-badge ${statusBadgeClass}`}>{statusText}</span></div>
                                <div className="loan-info">
                                    <span className="loan-debtor">{loan.debtor}</span>
                                    <span className="loan-amount">{formatCurrency(loan.current_balance)}</span>
                                    <span className="loan-description">{loan.description || ''}</span>
                                    <span className="loan-status-text">{statusText}</span>
                                    <span className="loan-date">{formatDate(loan.due_date)}</span>
                                </div>
                                <div className="loan-actions">
                                    {loan.status !== 'cobrado' && <button onClick={() => handleOpenCollectionModal(loan)} className="btn-icon btn-add-collection" title="Registrar Cobro"><i className="fas fa-hand-holding-usd"></i></button>}
                                    <button onClick={() => handleOpenLoanModal('edit', loan)} className="btn-icon btn-edit-loan" title="Editar"><i className="fas fa-pencil-alt"></i></button>
                                    <button onClick={() => handleDeleteLoan(loan.id, loan.debtor)} className="btn-icon btn-delete-loan" title="Eliminar"><i className="fas fa-trash-alt"></i></button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer Resumen */}
                {showSummaryFooter && !isLoading && !error && (
                  <div id="summary-footer" className="summary-footer">
                     <div className="summary-box blue"> <span className="summary-label">Total por cobrar</span> <strong id="totalOwedToUser">{summary.totalOwedToUser}</strong> </div>
                     <div className="summary-box purple"> <span className="summary-label">Total prestado</span> <strong id="totalLoanedActive">{summary.totalLoanedActive}</strong> <small>(Activos)</small> </div>
                     <div className="summary-box orange"> <span className="summary-label">Próximo vencimiento</span> <strong id="nextDueDateLoan">{summary.nextDueDateLoan}</strong> </div>
                  </div>
                )}
            </div>

            {/* Modales */}
            {isLoanModalOpen && (
                <div id="loanModal" className="modal-overlay active" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget) handleCloseLoanModal(); }}>
                    <div className="modal-content">
                        <h2 id="modalTitleLoan">{modalMode === 'add' ? 'Añadir Préstamo' : 'Editar Préstamo'}</h2>
                        <form id="loanForm" onSubmit={handleLoanFormSubmit}>
                            <input type="hidden" name="loanId" value={selectedLoan?.id || ''} />
                            <div className="input-group"> <label htmlFor="loanDebtor">Deudor</label> <input type="text" id="loanDebtor" name="debtor" required value={loanFormData.debtor} onChange={handleLoanFormChange} disabled={isSaving}/> </div>
                            <div className="input-group"> <label htmlFor="loanDescription">Descripción</label> <input type="text" id="loanDescription" name="description" value={loanFormData.description} onChange={handleLoanFormChange} disabled={isSaving}/> </div>
                            <div className="input-group"> <label htmlFor="loanInitialAmount">Importe Inicial (€)</label> <input type="number" id="loanInitialAmount" name="initial_amount" required step="0.01" min="0.01" value={loanFormData.initial_amount} onChange={handleLoanFormChange} disabled={isSaving}/> </div>
                            <div className="input-group"> <label htmlFor="loanCurrentBalance">Saldo Pendiente (€)</label> <input type="number" id="loanCurrentBalance" name="current_balance" required step="0.01" min="0" value={loanFormData.current_balance} onChange={handleLoanFormChange} disabled={isSaving}/> <small>Lo que te deben.</small> </div>
                            <div className="input-group"> <label htmlFor="loanInterestRate">Tasa Interés Anual (%)</label> <input type="number" id="loanInterestRate" name="interest_rate" step="0.01" min="0" value={loanFormData.interest_rate} onChange={handleLoanFormChange} disabled={isSaving}/> </div>
                            <div className="input-group"> <label htmlFor="loanDueDate">Fecha Vencimiento</label> <input type="date" id="loanDueDate" name="due_date" value={loanFormData.due_date} onChange={handleLoanFormChange} disabled={isSaving}/> </div>
                            <div className="input-group"> <label htmlFor="loanStatus">Estado</label> <select id="loanStatus" name="status" required value={loanFormData.status} onChange={handleLoanFormChange} disabled={isSaving}><option value="pendiente">Pendiente</option><option value="parcial">Parcialmente Cobrado</option><option value="cobrado">Cobrado</option></select> </div>
                            <div className="input-group checkbox-group"> <input type="checkbox" id="loanReminderEnabled" name="reminder_enabled" checked={loanFormData.reminder_enabled} onChange={handleLoanFormChange} disabled={isSaving}/> <label htmlFor="loanReminderEnabled">Activar Recordatorio</label> </div>
                            <div className="input-group"> <label htmlFor="loanNotes">Notas</label> <textarea id="loanNotes" name="notes" rows={2} value={loanFormData.notes} onChange={handleLoanFormChange} disabled={isSaving}></textarea> </div>
                            {modalError && <p className="error-message">{modalError}</p>}
                            <div className="modal-actions"> <button type="button" onClick={handleCloseLoanModal} className="btn btn-secondary" disabled={isSaving}>Cancelar</button> <button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? 'Guardando...' : 'Guardar Préstamo'}</button> </div>
                        </form>
                    </div>
                </div>
            )}
            {isCollectionModalOpen && selectedLoan && (
                <div id="addCollectionModal" className="modal-overlay small active" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget) handleCloseCollectionModal(); }}>
                    <div className="modal-content">
                        <h2 id="modalTitleCollection">Registrar Cobro</h2>
                        <form id="addCollectionForm" onSubmit={handleCollectionFormSubmit}>
                            <input type="hidden" name="collectionLoanId" value={selectedLoan.id} />
                            <p>Registrar cobro del préstamo a: <strong>{selectedLoan.debtor || 'N/A'}</strong></p>
                            <p>Pendiente por cobrar: <strong>{formatCurrency(selectedLoan.current_balance)}</strong></p>
                            <div className="input-group"> <label htmlFor="collectionAmount">Importe Cobrado (€)</label> <input type="number" id="collectionAmount" name="amount" required step="0.01" min="0.01" value={collectionFormData.amount} onChange={handleCollectionFormChange} disabled={isSaving}/> </div>
                            <div className="input-group"> <label htmlFor="collectionDate">Fecha del Cobro</label> <input type="date" id="collectionDate" name="date" required value={collectionFormData.date} onChange={handleCollectionFormChange} disabled={isSaving}/> </div>
                            <div className="input-group"> <label htmlFor="collectionAccount">Cuenta Destino</label> <select id="collectionAccount" name="accountId" required value={collectionFormData.accountId} onChange={handleCollectionFormChange} disabled={isSaving}><option value="" disabled>Selecciona...</option>{accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select> </div>
                            <div className="input-group"> <label htmlFor="collectionNotes">Notas</label> <textarea id="collectionNotes" name="notes" rows={2} value={collectionFormData.notes} onChange={handleCollectionFormChange} disabled={isSaving}></textarea> </div>
                            {modalError && <p className="error-message">{modalError}</p>}
                            <div className="modal-actions"> <button type="button" onClick={handleCloseCollectionModal} className="btn btn-secondary" disabled={isSaving}>Cancelar</button> <button type="submit" id="saveCollectionButton" className="btn btn-primary" disabled={isSaving}>{isSaving ? 'Registrando...' : 'Registrar Cobro'}</button> </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Scroll-Top */}
            {showScrollTop && ( <button onClick={scrollToTop} id="scrollTopBtn" className="scroll-top-btn visible" title="Volver arriba"> <i className="fas fa-arrow-up"></i> </button> )}
        </div>
    );
}
export default Loans;