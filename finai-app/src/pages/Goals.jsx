/*
Archivo: src/pages/Goals.jsx
Propósito: Componente para la página de gestión de metas financieras.
*/
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient'; // Importa cliente Supabase

// Importa imágenes
import finAiLogo from '../assets/Logo_FinAI_Oficial.png';
import defaultAvatar from '../assets/avatar_predeterminado.png';
import emptyMascot from '../assets/monstruo_pixar.png'; // Asegúrate que la ruta es correcta si la usas

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
 * Devuelve la clase de icono Font Awesome basada en una palabra clave o nombre de categoría.
 * Incluye un mapeo predefinido y maneja casos donde la clase ya está completa.
 * @param {string | null | undefined} iconKeyword La palabra clave o clase de icono (ej: 'comida', 'fas fa-car').
 * @returns {string} La clase CSS del icono Font Awesome (ej. "fas fa-utensils", "fas fa-tag").
 */
const getIconClass = (iconKeyword) => {
    // Mapeo de palabras clave comunes a iconos Font Awesome (Solid - fas)
    // ¡Asegúrate de que Font Awesome esté cargado en tu index.html!
    // Puedes añadir/modificar este mapa según tus necesidades.
    const iconMap = {
        // Ingresos
        'nomina': 'fas fa-money-check-alt', 'salario': 'fas fa-money-check-alt',
        'freelance': 'fas fa-briefcase', 'negocio': 'fas fa-store',
        'regalo recibido': 'fas fa-gift', 'otros ingresos': 'fas fa-dollar-sign', 'ingreso': 'fas fa-arrow-down', // Genérico
        // Gastos Comunes
        'comida': 'fas fa-utensils', 'supermercado': 'fas fa-shopping-basket',
        'restaurante': 'fas fa-concierge-bell', 'cafe': 'fas fa-coffee',
        'transporte': 'fas fa-bus-alt', 'coche': 'fas fa-car', 'gasolina': 'fas fa-gas-pump',
        'parking': 'fas fa-parking',
        'casa': 'fas fa-home', 'hogar': 'fas fa-home', 'alquiler': 'fas fa-file-contract',
        'hipoteca': 'fas fa-file-contract', 'mantenimiento': 'fas fa-tools',
        'facturas': 'fas fa-file-invoice-dollar', 'luz': 'fas fa-lightbulb', 'agua': 'fas fa-tint',
        'gas': 'fas fa-burn', 'internet': 'fas fa-wifi', 'telefono': 'fas fa-phone',
        'compras': 'fas fa-shopping-bag', 'ropa': 'fas fa-tshirt', 'tecnologia': 'fas fa-laptop',
        'ocio': 'fas fa-film', 'cine': 'fas fa-ticket-alt', 'concierto': 'fas fa-music',
        'libros': 'fas fa-book', 'suscripciones': 'fas fa-rss-square', 'netflix': 'fas fa-tv',
        'spotify': 'fab fa-spotify', // Requiere FA Brands (fab)
        'salud': 'fas fa-heartbeat', 'medico': 'fas fa-stethoscope', 'farmacia': 'fas fa-pills',
        'gimnasio': 'fas fa-dumbbell', 'deporte': 'fas fa-running',
        'regalos': 'fas fa-gift', 'donacion': 'fas fa-hand-holding-heart',
        'educacion': 'fas fa-graduation-cap', 'cursos': 'fas fa-chalkboard-teacher',
        'mascotas': 'fas fa-paw',
        'viajes': 'fas fa-plane-departure', 'vacaciones': 'fas fa-umbrella-beach',
        'tasas': 'fas fa-gavel', 'impuestos': 'fas fa-landmark',
        'inversion': 'fas fa-chart-line', // Para gastos relacionados
        'otros gastos': 'fas fa-question-circle', 'gasto': 'fas fa-arrow-up', // Genérico
        // Transferencias y Pagos
        'transferencia': 'fas fa-exchange-alt',
        'pago deudas': 'fas fa-receipt', // O 'fas fa-file-invoice-dollar'
        'pago prestamo': 'fas fa-hand-holding-usd', // O 'fas fa-file-invoice-dollar'
        // Metas (algunos ejemplos)
        'viaje': 'fas fa-plane-departure', 'japon': 'fas fa-torii-gate',
        'piso': 'fas fa-building', 'entrada': 'fas fa-key',
        'ahorro': 'fas fa-piggy-bank', 'emergencia': 'fas fa-briefcase-medical',
        // Otros
        'evaluacion': 'fas fa-balance-scale',
        'cuenta': 'fas fa-landmark',
        'default': 'fas fa-tag' // Icono por defecto si no hay coincidencia
    };

    // 1. Limpiar y convertir a minúsculas la keyword
    const lowerKeyword = iconKeyword?.trim().toLowerCase();

    // 2. Buscar en el mapa
    const mappedIcon = iconMap[lowerKeyword];
    if (mappedIcon) {
        return mappedIcon; // Devolver icono del mapa si se encuentra
    }

    // 3. Si no está en el mapa, verificar si ya es una clase Font Awesome válida
    //    (empieza con 'fa', seguido de un espacio y luego 'fa-' o el prefijo de marca 'fab', 'far', etc.)
    if (lowerKeyword?.startsWith('fa') && lowerKeyword?.includes(' fa-')) {
         // Podríamos hacer una validación más estricta si quisiéramos
        return iconKeyword.trim(); // Devolver la clase original (con trim)
    }

    // 4. Si no es ninguna de las anteriores, devolver el icono por defecto
    return iconMap['default'];
};


function Goals() {
    // --- Estado del Componente ---
    const [userId, setUserId] = useState(null);
    const [avatarUrl, setAvatarUrl] = useState(defaultAvatar);
    const [goals, setGoals] = useState([]);
    const [accounts, setAccounts] = useState([]); // Para dropdown cuenta asociada
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    // Modales
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const [isSavingsModalOpen, setIsSavingsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add'); // 'add' o 'edit' para goalModal
    const [selectedGoal, setSelectedGoal] = useState(null); // Meta para editar o añadir ahorro
    const [goalFormData, setGoalFormData] = useState({ name: '', target_amount: '', current_amount: '0.00', target_date: '', icon: '', related_account_id: '', notes: '' });
    const [savingsFormData, setSavingsFormData] = useState({ amount: '' });
    const [isSaving, setIsSaving] = useState(false); // Estado de carga para ambos modales
    const [modalError, setModalError] = useState('');
    // UI
    const [showScrollTop, setShowScrollTop] = useState(false);

    const navigate = useNavigate();

    // --- Efectos ---
    useEffect(() => {
        // Carga inicial: usuario, avatar, cuentas, metas
        const loadInitialData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // 1. Obtener usuario (Simulado)
                const simulatedUserId = 'USER_ID_PLACEHOLDER'; // Reemplazar
                setUserId(simulatedUserId);

                // 2. Cargar perfil, cuentas y metas en paralelo
                const [profileRes, accountsRes, goalsRes] = await Promise.all([
                    supabase.from('profiles').select('avatar_url').eq('id', simulatedUserId).single(),
                    supabase.from('accounts').select('id, name').eq('user_id', simulatedUserId).order('name'),
                    supabase.from('goals').select('*').eq('user_id', simulatedUserId).order('target_date')
                ]);

                // Procesar perfil
                if (profileRes.error && profileRes.status !== 406) throw profileRes.error;
                setAvatarUrl(profileRes.data?.avatar_url || defaultAvatar);

                // Procesar cuentas
                if (accountsRes.error) throw accountsRes.error;
                setAccounts(accountsRes.data || []);

                // Procesar metas
                if (goalsRes.error) throw goalsRes.error;
                setGoals(goalsRes.data || []);

            } catch (err) {
                console.error("Error cargando datos iniciales (Goals):", err);
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

    }, [navigate]); // Dependencia navigate

    // --- Manejadores Modales ---
    const handleOpenGoalModal = useCallback((mode = 'add', goal = null) => {
        setModalMode(mode);
        setSelectedGoal(goal);
        setModalError('');
        setIsSaving(false);
        if (mode === 'edit' && goal) {
            setGoalFormData({
                name: goal.name || '',
                target_amount: goal.target_amount || '',
                current_amount: goal.current_amount || '0.00', // Mostrar pero deshabilitado
                target_date: goal.target_date ? goal.target_date.split('T')[0] : '',
                icon: goal.icon || '',
                related_account_id: goal.related_account_id || '',
                notes: goal.notes || ''
            });
        } else {
            setGoalFormData({ name: '', target_amount: '', current_amount: '0.00', target_date: '', icon: '', related_account_id: '', notes: '' });
        }
        setIsGoalModalOpen(true);
    }, []);

    const handleCloseGoalModal = useCallback(() => setIsGoalModalOpen(false), []);

    const handleOpenSavingsModal = useCallback((goal) => {
        setSelectedGoal(goal); // Guardar la meta a la que se añade ahorro
        setSavingsFormData({ amount: '' }); // Resetear importe
        setModalError('');
        setIsSaving(false);
        setIsSavingsModalOpen(true);
    }, []);

    const handleCloseSavingsModal = useCallback(() => setIsSavingsModalOpen(false), []);

    // --- Manejadores Formularios ---
    const handleGoalFormChange = useCallback((e) => {
        const { name, value } = e.target;
        setGoalFormData(prev => ({ ...prev, [name]: value }));
        if (modalError) setModalError('');
    }, [modalError]);

    const handleSavingsFormChange = useCallback((e) => {
        const { name, value } = e.target;
        setSavingsFormData(prev => ({ ...prev, [name]: value }));
        if (modalError) setModalError('');
    }, [modalError]);

    // Submit Modal Meta (Añadir/Editar)
    const handleGoalFormSubmit = useCallback(async (event) => {
        event.preventDefault();
        if (!userId) return;

        const targetAmount = parseFloat(goalFormData.target_amount);
        const currentAmountInitial = parseFloat(goalFormData.current_amount) || 0; // Solo para añadir

        // Validaciones
        if (!goalFormData.name.trim() || isNaN(targetAmount) || targetAmount <= 0) {
            setModalError('Nombre y Objetivo (>0) son obligatorios.'); return;
        }
        if (modalMode === 'add' && (isNaN(currentAmountInitial) || currentAmountInitial < 0)) {
            setModalError('El Ahorrado Inicial debe ser un número válido (0 o más).'); return;
        }
        setModalError('');
        setIsSaving(true);

        try {
            const dataToSave = {
                user_id: userId,
                name: goalFormData.name.trim(),
                target_amount: targetAmount,
                // current_amount solo se establece al crear
                current_amount: modalMode === 'add' ? currentAmountInitial : undefined,
                target_date: goalFormData.target_date || null,
                icon: goalFormData.icon.trim() || null,
                related_account_id: goalFormData.related_account_id || null,
                notes: goalFormData.notes.trim() || null
            };

            let error;
            if (modalMode === 'edit' && selectedGoal) {
                // UPDATE (excluir current_amount y user_id)
                delete dataToSave.current_amount;
                delete dataToSave.user_id;
                const { error: updateError } = await supabase.from('goals')
                    .update(dataToSave).eq('id', selectedGoal.id).eq('user_id', userId);
                error = updateError;
            } else {
                // INSERT
                const { error: insertError } = await supabase.from('goals').insert([dataToSave]);
                error = insertError;
            }

            if (error) throw error;

            handleCloseGoalModal();
            // Recargar metas
            const { data: refreshedGoals, error: refreshError } = await supabase.from('goals').select('*').eq('user_id', userId).order('target_date');
            if (refreshError) throw refreshError;
            setGoals(refreshedGoals || []);

        } catch (err) {
            console.error('Error guardando meta:', err);
            setModalError(`Error: ${err.message}`);
        } finally {
            setIsSaving(false);
        }
    }, [userId, modalMode, selectedGoal, goalFormData, supabase, handleCloseGoalModal]); // Dependencias

    // Submit Modal Añadir Ahorro
    const handleAddSavingsSubmit = useCallback(async (event) => {
        event.preventDefault();
        if (!userId || !selectedGoal) return;

        const amountToAdd = parseFloat(savingsFormData.amount);
        if (isNaN(amountToAdd) || amountToAdd <= 0) {
            setModalError('Introduce un importe positivo válido.'); return;
        }
        setModalError('');
        setIsSaving(true);

        try {
            // 1. Obtener el importe actual real de la BD (más seguro)
            const { data: currentGoalData, error: fetchError } = await supabase
                .from('goals')
                .select('current_amount')
                .eq('id', selectedGoal.id)
                .eq('user_id', userId)
                .single(); // Esperamos encontrarla

            if (fetchError) throw new Error(`No se pudo obtener la meta: ${fetchError.message}`);
            if (!currentGoalData) throw new Error('Meta no encontrada.');

            const currentAmount = Number(currentGoalData.current_amount) || 0;
            const newAmount = currentAmount + amountToAdd;

            // 2. Actualizar el importe en la base de datos
            const { error: updateError } = await supabase.from('goals')
                .update({ current_amount: newAmount })
                .eq('id', selectedGoal.id)
                .eq('user_id', userId);

            if (updateError) throw updateError;

            console.log(`Ahorro añadido a meta ${selectedGoal.id}. Nuevo total: ${newAmount}`);
            alert('Ahorro añadido con éxito.'); // Reemplazar por toast
            handleCloseSavingsModal();

            // Recargar metas para reflejar el cambio
            const { data: refreshedGoals, error: refreshError } = await supabase.from('goals').select('*').eq('user_id', userId).order('target_date');
            if (refreshError) throw refreshError;
            setGoals(refreshedGoals || []);

        } catch (error) {
            console.error('Error añadiendo ahorro:', error);
            setModalError(`Error: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    }, [userId, selectedGoal, savingsFormData, supabase, handleCloseSavingsModal]); // Dependencias

    // Manejador Eliminación
    const handleDeleteGoal = useCallback(async (goalId, goalName) => {
        if (!userId) return;
        if (!window.confirm(`¿Seguro eliminar meta "${goalName}"? Se perderá el progreso.`)) return;
        try {
            const { error } = await supabase.from('goals').delete().eq('id', goalId).eq('user_id', userId);
            if (error) throw error;
            alert('Meta eliminada.');
            setGoals(prev => prev.filter(g => g.id !== goalId));
        } catch (error) { console.error('Error eliminando meta:', error); alert(`Error: ${error.message}`); }
    }, [userId, supabase]);

    // Otros manejadores
    const handleLogout = useCallback(() => console.log('Logout pendiente'), []);
    const handleBack = useCallback(() => navigate(-1), [navigate]);
    const scrollToTop = useCallback(() => window.scrollTo({ top: 0, behavior: 'smooth' }), []);

    // --- Renderizado ---
    // ... (JSX completo similar al anterior, usando estados y manejadores) ...
    // Mapear 'goals' para renderizar <GoalCard /> (o el JSX directo)
    // Renderizar modales condicionalmente
    return (
        <div style={{ display: 'flex' }}>
            {/* Sidebar */}
             <aside className="sidebar">
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
                      <Link to="/fixed-expenses" className="nav-button" title="Gastos Fijos"><i className="fas fa-receipt"></i> <span>Gastos Fijos</span></Link>
                      <Link to="/goals" className="nav-button active" title="Metas"><i className="fas fa-bullseye"></i> <span>Metas</span></Link> {/* Active */}
                  </nav>
                  <button className="nav-button logout-button" onClick={handleLogout} title="Cerrar Sesión"><i className="fas fa-sign-out-alt"></i> <span>Salir</span></button>
             </aside>

            {/* Contenido Principal */}
            <div className="page-container">
                {/* Cabecera */}
                <div className="page-header goals-header">
                    <button onClick={handleBack} id="backButton" className="btn-icon" aria-label="Volver"><i className="fas fa-arrow-left"></i></button>
                    <div className="header-title-group"> <img id="userAvatarHeader" src={avatarUrl} alt="Avatar" className="header-avatar-small" /> <h1>Mis Metas</h1> </div>
                    <button onClick={() => handleOpenGoalModal('add')} id="addGoalBtn" className="btn btn-primary btn-add"> <i className="fas fa-plus"></i> Añadir Meta </button>
                </div>

                {/* Lista de Metas */}
                <div id="goalList" className="goal-list-grid">
                    {isLoading && ( <p id="loadingGoalsMessage" style={{ textAlign: 'center', padding: '20px', color: '#666', gridColumn: '1 / -1' }}>Cargando metas...</p> )}
                    {error && !isLoading && ( <p style={{ textAlign: 'center', padding: '20px', color: 'red', gridColumn: '1 / -1' }}>{error}</p> )}
                    {!isLoading && !error && goals.length === 0 && ( <p id="noGoalsMessage" className="empty-list-message" style={{ gridColumn: '1 / -1' }}>¡Define tu primera meta de ahorro!</p> )}
                    {!isLoading && !error && goals.length > 0 && (
                        goals.map(goal => {
                            const targetAmount = Number(goal.target_amount) || 0;
                            const currentAmount = Number(goal.current_amount) || 0;
                            const remaining = targetAmount - currentAmount;
                            const percentage = targetAmount > 0 ? Math.max(0, Math.min((currentAmount / targetAmount) * 100, 100)) : (currentAmount > 0 ? 100 : 0);
                            const isComplete = currentAmount >= targetAmount && targetAmount > 0;
                            let progressBarColor = '#48bb78'; if (isComplete) progressBarColor = '#8a82d5'; else if (percentage >= 75) progressBarColor = '#ecc94b';
                            const remainingClass = isComplete ? 'complete' : (remaining >= 0 ? 'positive' : 'negative');
                            const remainingText = isComplete ? '¡Conseguido!' : `Restante: ${formatCurrency(remaining)}`;
                            const iconClass = getIconClass(goal.icon);
                            const targetDateFormatted = formatDate(goal.target_date);

                            return (
                                <div key={goal.id} className="goal-card" data-id={goal.id}>
                                    <div className="card-header">
                                        <span className="goal-icon"><i className={iconClass}></i></span>
                                        <div className="header-text"> <h3 className="goal-name">{goal.name}</h3> {targetDateFormatted && <p className="goal-target-date">Hasta: {targetDateFormatted}</p>} </div>
                                    </div>
                                    <div className="card-body">
                                        <div className="goal-amounts"> <span className="amount-pair"> <span className="label">Ahorrado:</span> <span className="amount current">{formatCurrency(currentAmount)}</span> </span> <span className="amount-pair"> <span className="label">Objetivo:</span> <span className="amount target">{formatCurrency(targetAmount)}</span> </span> </div>
                                        <div className="progress-bar-container"> <div className="progress-bar" style={{ width: `${percentage}%`, backgroundColor: progressBarColor }}></div> <span className="progress-percentage">{percentage.toFixed(1)}%</span> </div>
                                        <div className={`amount-remaining ${remainingClass}`}>{remainingText}</div>
                                    </div>
                                    <div className="card-actions">
                                        <button onClick={() => handleOpenSavingsModal(goal)} className="btn-icon btn-add-savings" aria-label="Añadir Ahorro" title="Añadir Ahorro"><i className="fas fa-plus-circle"></i></button>
                                        <button onClick={() => handleOpenGoalModal('edit', goal)} className="btn-icon btn-edit" aria-label="Editar Meta" title="Editar Meta"><i className="fas fa-pencil-alt"></i></button>
                                        <button onClick={() => handleDeleteGoal(goal.id, goal.name)} className="btn-icon btn-delete" aria-label="Eliminar Meta" title="Eliminar Meta"><i className="fas fa-trash-alt"></i></button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

            </div> {/* Fin page-container */}

             {/* --- Modal Añadir/Editar Meta --- */}
             {isGoalModalOpen && (
                <div id="goalModal" className="modal-overlay active" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget) handleCloseGoalModal(); }}>
                    <div className="modal-content">
                        <h2 id="modalTitleGoal">{modalMode === 'add' ? 'Añadir Nueva Meta' : 'Editar Meta'}</h2>
                        <form id="goalForm" onSubmit={handleGoalFormSubmit}>
                            <input type="hidden" name="goalId" value={selectedGoal?.id || ''} />
                            <div className="input-group"> <label htmlFor="goalName">Nombre</label> <input type="text" id="goalName" name="name" required value={goalFormData.name} onChange={handleGoalFormChange} disabled={isSaving}/> </div>
                            <div className="input-group"> <label htmlFor="goalTargetAmount">Importe Objetivo (€)</label> <input type="number" id="goalTargetAmount" name="target_amount" required step="0.01" min="0.01" value={goalFormData.target_amount} onChange={handleGoalFormChange} disabled={isSaving}/> </div>
                            {/* Mostrar Ahorrado Inicial solo al añadir */}
                            {modalMode === 'add' && (
                                <div className="input-group"> <label htmlFor="goalCurrentAmount">Ahorrado Inicialmente (€)</label> <input type="number" id="goalCurrentAmount" name="current_amount" step="0.01" min="0" value={goalFormData.current_amount} onChange={handleGoalFormChange} disabled={isSaving}/> <small>Si ya tienes algo.</small> </div>
                            )}
                            <div className="input-group"> <label htmlFor="goalTargetDate">Fecha Objetivo</label> <input type="date" id="goalTargetDate" name="target_date" value={goalFormData.target_date} onChange={handleGoalFormChange} disabled={isSaving}/> </div>
                            <div className="input-group"> <label htmlFor="goalIcon">Icono (Font Awesome)</label> <input type="text" id="goalIcon" name="icon" placeholder="Ej: fas fa-plane-departure" value={goalFormData.icon} onChange={handleGoalFormChange} disabled={isSaving}/> <small>Busca en <a href="https://fontawesome.com/search?m=free&s=solid" target="_blank" rel="noopener noreferrer">Font Awesome</a>.</small> </div>
                            <div className="input-group"> <label htmlFor="goalAccount">Cuenta Asociada</label> <select id="goalAccount" name="related_account_id" value={goalFormData.related_account_id} onChange={handleGoalFormChange} disabled={isSaving}><option value="">(Ninguna)</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select> <small>Dónde guardas el dinero.</small> </div>
                            <div className="input-group"> <label htmlFor="goalNotes">Notas</label> <textarea id="goalNotes" name="notes" rows={2} value={goalFormData.notes} onChange={handleGoalFormChange} disabled={isSaving}></textarea> </div>
                            {modalError && <p className="error-message">{modalError}</p>}
                            <div className="modal-actions"> <button type="button" onClick={handleCloseGoalModal} className="btn btn-secondary" disabled={isSaving}>Cancelar</button> <button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? 'Guardando...' : 'Guardar Meta'}</button> </div>
                        </form>
                    </div>
                </div>
            )}

             {/* --- Modal Añadir Ahorro --- */}
             {isSavingsModalOpen && selectedGoal && (
                <div id="addSavingsModal" className="modal-overlay small active" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget) handleCloseSavingsModal(); }}>
                    <div className="modal-content">
                        <h2 id="modalTitleAddSavings">Añadir Ahorro</h2>
                        <form id="addSavingsForm" onSubmit={handleAddSavingsSubmit}>
                            <input type="hidden" name="savingsGoalId" value={selectedGoal.id} />
                            <p>¿Cuánto has ahorrado para la meta "<strong id="savingsGoalName">{selectedGoal.name || 'N/A'}</strong>"?</p>
                            <div className="input-group"> <label htmlFor="savingsAmount">Importe a Añadir (€)</label> <input type="number" id="savingsAmount" name="amount" required step="0.01" min="0.01" value={savingsFormData.amount} onChange={handleSavingsFormChange} disabled={isSaving}/> </div>
                            {modalError && <p className="error-message">{modalError}</p>}
                            <div className="modal-actions"> <button type="button" onClick={handleCloseSavingsModal} className="btn btn-secondary" disabled={isSaving}>Cancelar</button> <button type="submit" id="saveSavingsButton" className="btn btn-primary" disabled={isSaving}>{isSaving ? 'Añadiendo...' : 'Añadir'}</button> </div>
                        </form>
                    </div>
                </div>
            )}


            {/* --- Botón Scroll-Top --- */}
            {showScrollTop && ( <button onClick={scrollToTop} id="scrollTopBtn" className="scroll-top-btn visible" title="Volver arriba"> <i className="fas fa-arrow-up"></i> </button> )}

        </div> // Fin contenedor flex principal
    );
}
export default Goals;
