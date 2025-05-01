/*
Archivo: src/pages/Trips.jsx
Propósito: Componente para gestionar viajes, incluyendo una vista de lista y una de detalle.
*/
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient'; // Asegúrate que la ruta sea correcta

// Importa imágenes
import finAiLogo from '../assets/Logo_FinAI_Oficial.png'; // Asegúrate que la ruta sea correcta
import defaultAvatar from '../assets/avatar_predeterminado.png'; // Asegúrate que la ruta sea correcta
import emptyMascot from '../assets/monstruo_pixar.png'; // Asegúrate que la ruta sea correcta

// --- Componentes Internos Simples (Podrían extraerse a archivos separados) ---

// Componente Tarjeta Viaje
function TripCard({ trip, onViewDetail, onEdit, onDelete }) {
    const { id, name, destination, start_date, end_date, budget, saved_amount } = trip;

    const iconClass = useMemo(() => getIconForTrip(name, destination), [name, destination]);
    const formattedBudget = useMemo(() => formatCurrency(budget), [budget]);
    const formattedSaved = useMemo(() => formatCurrency(saved_amount), [saved_amount]);
    const formattedStartDate = useMemo(() => formatDate(start_date), [start_date]);
    const formattedEndDate = useMemo(() => formatDate(end_date), [end_date]);

    const progress = useMemo(() => {
        const numBudget = parseFloat(budget) || 0;
        const numSaved = parseFloat(saved_amount) || 0;
        return numBudget > 0 ? Math.min(100, Math.max(0, (numSaved / numBudget) * 100)) : 0;
    }, [budget, saved_amount]);

    const progressBarColor = 'var(--accent-orange)'; // Color para ahorro

    return (
        <div className="trip-card" data-id={id}>
            <div className="trip-icon-container">
                <i className={iconClass}></i>
            </div>
            <div className="trip-info">
                <h3 className="trip-name">{name || 'Viaje sin nombre'}</h3>
                {destination && <p className="trip-destination">{destination}</p>}
                <p className="trip-dates">{formattedStartDate} - {formattedEndDate}</p>
                <div className="trip-budget-saved">
                    <span>Presup.: <strong>{formattedBudget}</strong> / Ahorrado: <strong>{formattedSaved}</strong></span>
                </div>
                <div className="trip-progress-bar-container">
                    <div className="trip-progress-bar" style={{ width: `${progress.toFixed(1)}%`, backgroundColor: progressBarColor }} title={`${progress.toFixed(1)}% Ahorrado`}></div>
                </div>
            </div>
            <div className="trip-actions">
                <button className="btn-icon btn-view-expenses" aria-label="Ver Gastos" onClick={onViewDetail} title="Ver Gastos"><i className="fas fa-receipt"></i></button>
                <button className="btn-icon btn-edit-trip" aria-label="Editar Viaje" onClick={onEdit} title="Editar Viaje"><i className="fas fa-pencil-alt"></i></button>
                <button className="btn-icon btn-delete-trip" aria-label="Eliminar Viaje" onClick={onDelete} title="Eliminar Viaje"><i className="fas fa-trash-alt"></i></button>
            </div>
        </div>
    );
}

// Componente Fila Gasto Viaje
function TripExpenseRow({ expense, onEdit, onDelete }) {
    const { id, expense_date, description, category, amount } = expense;
    const formattedDate = useMemo(() => formatDate(expense_date), [expense_date]);
    const formattedAmount = useMemo(() => formatCurrency(amount), [amount]);

    return (
        <tr data-id={id}>
            <td>{formattedDate}</td>
            <td>{description || '-'}</td>
            <td>{category || '-'}</td>
            <td className="amount-col expense">{formattedAmount}</td>
            <td className="actions-col">
                <button className="btn-icon btn-edit-expense" aria-label="Editar Gasto" onClick={onEdit}><i className="fas fa-pencil-alt"></i></button>
                <button className="btn-icon btn-delete-expense" aria-label="Eliminar Gasto" onClick={onDelete}><i className="fas fa-trash-alt"></i></button>
            </td>
        </tr>
    );
}

// --- Funciones de Utilidad (Podrían moverse a un archivo utils) ---
const formatCurrency = (value, currency = 'EUR') => {
    const numberValue = Number(value);
    if (isNaN(numberValue) || value === null || value === undefined) return '€0.00'; // Default a 0 si no es válido
    try {
        return new Intl.NumberFormat('es-ES', { style: 'currency', currency: currency, minimumFractionDigits: 2 }).format(numberValue);
    } catch (e) {
        console.error("Error formatting currency:", value, e);
        return `${numberValue.toFixed(2)} ${currency}`;
    }
};

const formatDate = (dateString, options = { day: '2-digit', month: '2-digit', year: 'numeric' }) => {
    if (!dateString) return '--/--/----';
    try {
        const date = new Date(dateString);
        const offset = date.getTimezoneOffset();
        const adjustedDate = new Date(date.getTime() + (offset * 60 * 1000));
        if (isNaN(adjustedDate.getTime())) return '--/--/----';
        return adjustedDate.toLocaleDateString('es-ES', options);
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return '--/--/----';
    }
};

const getIconForTrip = (name = '', destination = '') => {
    const text = `${(name || '').toLowerCase()} ${(destination || '').toLowerCase()}`;
    if (text.includes('japón') || text.includes('asia') || text.includes('tokio')) return 'fas fa-torii-gate';
    if (text.includes('parís') || text.includes('francia') || text.includes('europa') || text.includes('torre eiffel')) return 'fas fa-archway';
    if (text.includes('montaña') || text.includes('senderismo') || text.includes('rural') || text.includes('trekking')) return 'fas fa-hiking';
    if (text.includes('playa') || text.includes('costa') || text.includes('cancún') || text.includes('méxico') || text.includes('caribe')) return 'fas fa-umbrella-beach';
    if (text.includes('avión') || text.includes('vuelo')) return 'fas fa-plane';
    return 'fas fa-suitcase-rolling'; // Icono por defecto
};

// --- Componente Principal ---
function Trips() {
    // --- Estado ---
    const [userId, setUserId] = useState(null);
    const [userAvatarUrl, setUserAvatarUrl] = useState(defaultAvatar);
    const [viewMode, setViewMode] = useState('list'); // 'list' o 'detail'
    const [trips, setTrips] = useState([]);
    const [selectedTrip, setSelectedTrip] = useState(null); // Objeto del viaje en detalle
    const [tripExpenses, setTripExpenses] = useState([]);
    const [isLoadingTrips, setIsLoadingTrips] = useState(true);
    const [isLoadingExpenses, setIsLoadingExpenses] = useState(false);
    const [isTripModalOpen, setIsTripModalOpen] = useState(false);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [tripModalMode, setTripModalMode] = useState('add');
    const [expenseModalMode, setExpenseModalMode] = useState('add');
    const [editingTrip, setEditingTrip] = useState(null); // Para precargar form viaje
    const [editingExpense, setEditingExpense] = useState(null); // Para precargar form gasto
    const [isSavingTrip, setIsSavingTrip] = useState(false);
    const [isSavingExpense, setIsSavingExpense] = useState(false);
    const [modalTripError, setModalTripError] = useState('');
    const [modalExpenseError, setModalExpenseError] = useState('');
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [message, setMessage] = useState(''); // Mensajes generales (ej. error carga)
    const [messageType, setMessageType] = useState('');

    const navigate = useNavigate();
    const isMounted = useRef(true);

    // --- Carga Inicial (Usuario, Avatar, Viajes) ---
    const fetchInitialData = useCallback(async () => {
        setIsLoadingTrips(true);
        setMessage('');
        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                console.error('Trips: No user session.', userError);
                if (isMounted.current) navigate('/login');
                return;
            }
             if (!isMounted.current) return;
            setUserId(user.id);

            const [profileRes, tripsRes] = await Promise.all([
                supabase.from('profiles').select('avatar_url').eq('id', user.id).single(),
                supabase.from('trips').select('*').eq('user_id', user.id).order('start_date', { ascending: false, nullsLast: true })
            ]);

            if (!isMounted.current) return;

            if (profileRes.error && profileRes.error.code !== 'PGRST116') console.warn("Error loading avatar", profileRes.error);
            setUserAvatarUrl(profileRes.data?.avatar_url || defaultAvatar);

            if (tripsRes.error) throw new Error(`Error cargando viajes: ${tripsRes.error.message}`);
            setTrips(tripsRes.data || []);

        } catch (error) {
            console.error("Error loading initial data:", error);
            if (isMounted.current) {
                setMessage(`Error cargando datos: ${error.message}`);
                setMessageType('error');
            }
        } finally {
            if (isMounted.current) setIsLoadingTrips(false);
        }
    }, [navigate]);

    useEffect(() => {
        isMounted.current = true;
        fetchInitialData();
        return () => { isMounted.current = false; }; // Cleanup
    }, [fetchInitialData]);

    // --- Carga Gastos Detalle ---
    const fetchTripExpenses = useCallback(async (tripId) => {
        if (!userId || !tripId) return;
        setIsLoadingExpenses(true);
        setTripExpenses([]); // Limpiar antes de cargar
        try {
            const { data, error } = await supabase
                .from('trip_expenses')
                .select('*')
                .eq('user_id', userId)
                .eq('trip_id', tripId)
                .order('expense_date', { ascending: false });

            if (error) throw error;
            if (isMounted.current) {
                setTripExpenses(data || []);
            }
        } catch (error) {
            console.error("Error loading trip expenses:", error);
             if (isMounted.current) {
                setMessage(`Error cargando gastos: ${error.message}`);
                setMessageType('error');
             }
        } finally {
            if (isMounted.current) setIsLoadingExpenses(false);
        }
    }, [userId]);

    useEffect(() => {
        if (viewMode === 'detail' && selectedTrip?.id) {
            fetchTripExpenses(selectedTrip.id);
        }
    }, [viewMode, selectedTrip, fetchTripExpenses]);

    // --- Scroll-Top ---
    useEffect(() => {
        const handleScroll = () => {
            if (isMounted.current) setShowScrollTop(window.scrollY > 300);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // --- Cálculos Resúmenes (useMemo) ---

    // Resumen Footer Lista
    const listSummary = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        let nextDate = null;
        let totalBudgeted = 0;
        let totalSaved = 0;

        trips.forEach(trip => {
            const isFutureOrActive = !trip.end_date || trip.end_date >= today;
            if (isFutureOrActive) {
                totalBudgeted += parseFloat(trip.budget) || 0;
                totalSaved += parseFloat(trip.saved_amount) || 0;
                if (trip.start_date && trip.start_date >= today) {
                    if (!nextDate || trip.start_date < nextDate) {
                        nextDate = trip.start_date;
                    }
                }
            }
        });
        return {
            nextTripDate: formatDate(nextDate),
            totalBudgetedTrips: formatCurrency(totalBudgeted),
            totalSavedForTrips: formatCurrency(totalSaved)
        };
    }, [trips]);

    // Resumen Cabecera Detalle
    const detailSummary = useMemo(() => {
        if (!selectedTrip) return { budget: '€0.00', spent: '€0.00', remaining: '€0.00', remainingIsPositive: true };
        const budget = parseFloat(selectedTrip.budget) || 0;
        const totalSpent = tripExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
        const remaining = budget - totalSpent;
        return {
            budget: formatCurrency(budget),
            spent: formatCurrency(totalSpent),
            remaining: formatCurrency(remaining),
            remainingIsPositive: remaining >= 0
        };
    }, [selectedTrip, tripExpenses]);

    // --- Manejadores Vistas y Modales ---
    const handleViewTripDetail = useCallback((trip) => {
        setSelectedTrip(trip);
        setViewMode('detail');
        window.scrollTo(0, 0);
    }, []);

    const handleViewTripList = useCallback(() => {
        setSelectedTrip(null);
        setTripExpenses([]); // Limpiar gastos al volver a lista
        setViewMode('list');
    }, []);

    const handleOpenTripModal = useCallback((mode = 'add', trip = null) => {
        setTripModalMode(mode);
        setEditingTrip(mode === 'edit' ? trip : null); // Guardar viaje a editar
        setModalTripError(''); // Limpiar error modal
        setIsTripModalOpen(true);
    }, []);
    const handleCloseTripModal = useCallback(() => setIsTripModalOpen(false), []);

    const handleOpenExpenseModal = useCallback((mode = 'add', expense = null) => {
        if (viewMode !== 'detail' || !selectedTrip?.id) return; // Asegurar que estamos en detalle
        setExpenseModalMode(mode);
        setEditingExpense(mode === 'edit' ? expense : null);
        setModalExpenseError('');
        setIsExpenseModalOpen(true);
    }, [viewMode, selectedTrip]);
    const handleCloseExpenseModal = useCallback(() => setIsExpenseModalOpen(false), []);

    // --- Manejadores CRUD ---

    // Viajes
    const handleTripFormSubmit = useCallback(async (formData) => { // Recibe datos del modal
        if (!userId) return;
        setIsSavingTrip(true);
        setModalTripError('');

        const dataToSave = {
            user_id: userId,
            name: formData.name,
            destination: formData.destination || null,
            start_date: formData.start_date || null,
            end_date: formData.end_date || null,
            budget: parseFloat(formData.budget) || 0,
            saved_amount: parseFloat(formData.saved_amount) || 0,
            notes: formData.notes || null
        };

        try {
            let result;
            if (tripModalMode === 'edit' && editingTrip?.id) {
                const { user_id, ...updateData } = dataToSave; // No enviar user_id
                updateData.updated_at = new Date();
                result = await supabase.from('trips').update(updateData).eq('id', editingTrip.id).eq('user_id', userId);
            } else {
                result = await supabase.from('trips').insert([dataToSave]).select();
            }

            const { error, data } = result;
            if (error) throw error;
             if (tripModalMode === 'add' && (!data || data.length === 0)) {
                throw new Error("La inserción no devolvió confirmación.");
            }

            alert(tripModalMode === 'edit' ? 'Viaje actualizado.' : 'Viaje creado.');
            handleCloseTripModal();
            fetchInitialData(); // Recargar lista completa

        } catch (error) {
            console.error('Error saving trip:', error);
            setModalTripError(`Error: ${error.message}`);
        } finally {
            setIsSavingTrip(false);
        }
    }, [userId, tripModalMode, editingTrip, supabase, handleCloseTripModal, fetchInitialData]);

    const handleDeleteTrip = useCallback(async (tripId) => {
        if (!userId || !tripId) return;
        const tripToDelete = trips.find(t => t.id === tripId);
        if (!tripToDelete) return;

        if (!window.confirm(`¿Eliminar viaje "${tripToDelete.name}" y TODOS sus gastos?\n¡No se puede deshacer!`)) return;

        try {
             // Usar RPC puede ser más seguro y eficiente si tienes CASCADE configurado
             // O eliminar gastos primero como en el JS original
             console.log(`Eliminando gastos para trip_id: ${tripId}`);
             const { error: expenseError } = await supabase.from('trip_expenses').delete().eq('user_id', userId).eq('trip_id', tripId);
             if (expenseError) console.warn("Error eliminando gastos (continuando):", expenseError);

             console.log(`Eliminando viaje: ${tripId}`);
             const { error: tripError } = await supabase.from('trips').delete().eq('user_id', userId).eq('id', tripId);
             if (tripError) throw new Error(`Error eliminando el viaje: ${tripError.message}`);

            alert('Viaje y gastos eliminados.');
            fetchInitialData(); // Recargar lista

        } catch (error) {
            console.error("Error deleting trip:", error);
            alert(`Error: ${error.message}`);
        }
    }, [userId, trips, supabase, fetchInitialData]);

    // Gastos Viaje
    const handleExpenseFormSubmit = useCallback(async (formData) => { // Recibe datos del modal
        if (!userId || !selectedTrip?.id) return;
        setIsSavingExpense(true);
        setModalExpenseError('');

        const dataToSave = {
            user_id: userId,
            trip_id: selectedTrip.id,
            description: formData.description,
            amount: parseFloat(formData.amount),
            expense_date: formData.expense_date,
            category: formData.category || null,
            notes: formData.notes || null
        };

        try {
            let result;
            if (expenseModalMode === 'edit' && editingExpense?.id) {
                 const { user_id, trip_id, ...updateData } = dataToSave;
                 result = await supabase.from('trip_expenses').update(updateData).eq('id', editingExpense.id).eq('user_id', userId).eq('trip_id', selectedTrip.id);
            } else {
                result = await supabase.from('trip_expenses').insert([dataToSave]).select();
            }

            const { error, data } = result;
            if (error) throw error;
             if (expenseModalMode === 'add' && (!data || data.length === 0)) {
                 throw new Error("La inserción no devolvió confirmación.");
             }

            alert(expenseModalMode === 'edit' ? 'Gasto actualizado.' : 'Gasto añadido.');
            handleCloseExpenseModal();
            fetchTripExpenses(selectedTrip.id); // Recargar solo gastos del viaje actual

        } catch (error) {
            console.error('Error saving trip expense:', error);
            setModalExpenseError(`Error: ${error.message}`);
        } finally {
            setIsSavingExpense(false);
        }
    }, [userId, selectedTrip, expenseModalMode, editingExpense, supabase, handleCloseExpenseModal, fetchTripExpenses]);

     const handleDeleteTripExpense = useCallback(async (expenseId) => {
        if (!userId || !expenseId || !selectedTrip?.id) return;
        if (!window.confirm("¿Eliminar este gasto del viaje?")) return;

        try {
            const { error } = await supabase.from('trip_expenses').delete().eq('user_id', userId).eq('id', expenseId);
            if (error) throw error;

            alert('Gasto eliminado.');
            fetchTripExpenses(selectedTrip.id); // Recargar gastos del viaje actual

        } catch (error) {
            console.error("Error deleting expense:", error);
            alert(`Error: ${error.message}`);
        }
    }, [userId, selectedTrip, supabase, fetchTripExpenses]);


    // --- Otros Manejadores ---
    const handleLogout = useCallback(async () => {
            setIsLoading(true); // Mostrar indicador mientras se cierra sesión
            console.log('Cerrando sesión...');
            try {
                const { error } = await supabase.auth.signOut();
                if (error) throw error;
                // El listener de auth en App.js o similar debería detectar el cambio y redirigir
                // Si no, se puede forzar aquí: navigate('/login');
            } catch (error) {
                console.error("Error al cerrar sesión:", error);
                setMessage("Error al cerrar sesión.");
                setMessageType("error");
                setIsLoading(false); // Ocultar indicador si falla
            }
            // No poner setIsLoading(false) aquí, la redirección desmontará el componente
     }, [navigate, supabase]); // Incluir supabase
    const handleBack = useCallback(() => {
        if (viewMode === 'detail') handleViewTripList();
        else navigate(-1);
    }, [viewMode, navigate, handleViewTripList]);
    const scrollToTop = useCallback(() => window.scrollTo({ top: 0, behavior: 'smooth' }), []);

    // --- Renderizado ---
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
            <div className="page-container">
                {/* --- Cabecera --- */}
                <div className="page-header trips-header">
                    <button onClick={handleBack} id="backButton" className="btn-icon" aria-label="Volver" disabled={isSavingTrip || isSavingExpense}><i className="fas fa-arrow-left"></i></button>
                    <div className="header-title-group">
                        <img id="userAvatarHeader" src={userAvatarUrl} alt="Avatar" className="header-avatar-small" />
                        <h1>{viewMode === 'list' ? 'Mis Viajes' : (selectedTrip?.name || 'Detalle Viaje')}</h1>
                    </div>
                    {viewMode === 'list' && (
                        <button onClick={() => handleOpenTripModal('add')} id="addTripBtn" className="btn btn-primary btn-add orange-btn" disabled={isLoadingTrips}>
                            <i className="fas fa-plus"></i> Añadir Viaje
                        </button>
                    )}
                     {viewMode === 'detail' && <div style={{ width: '60px' }}></div>} {/* Spacer */}
                </div>

                 {/* Mensaje General */}
                 {message && (
                    <p className={`message page-message ${messageType}`}>{message}</p>
                 )}

                {/* --- Vista Lista --- */}
                {viewMode === 'list' && (
                    <div id="tripsListView" className="view active">
                        <div id="tripListContainer" className="trip-list">
                            {isLoadingTrips && <p id="loadingTripsMessage" style={{ textAlign: 'center', padding: '20px', color: '#666', gridColumn: '1 / -1' }}>Cargando viajes...</p>}
                            {!isLoadingTrips && trips.length === 0 && (
                                <div id="noTripsMessage" className="empty-list-message" style={{ gridColumn: '1 / -1' }}>
                                    <img src={emptyMascot} alt="Mascota FinAi Viajera" className="empty-mascot" />
                                    <p>¡A planificar la próxima aventura!</p>
                                    <p>Registra tu primer viaje para llevar un control.</p>
                                    <button onClick={() => handleOpenTripModal('add')} id="addTripFromEmptyBtn" className="btn btn-primary orange-btn">
                                        <i className="fas fa-plus"></i> Registrar Mi Primer Viaje
                                    </button>
                                </div>
                            )}
                            {!isLoadingTrips && trips.map(trip => (
                                <TripCard
                                    key={trip.id}
                                    trip={trip}
                                    onViewDetail={() => handleViewTripDetail(trip)}
                                    onEdit={() => handleOpenTripModal('edit', trip)}
                                    onDelete={() => handleDeleteTrip(trip.id)}
                                />
                            ))}
                        </div>
                        {/* Footer Resumen Lista */}
                        {!isLoadingTrips && trips.length > 0 && (
                            <div id="summary-footer-list" className="summary-footer">
                                <div className="summary-box blue"> <span className="summary-label">Próximo Viaje</span> <strong id="nextTripDate">{listSummary.nextTripDate}</strong> </div>
                                <div className="summary-box purple"> <span className="summary-label">Presup. Total</span> <strong id="totalBudgetedTrips">{listSummary.totalBudgetedTrips}</strong> <small>(Futuros/Activos)</small> </div>
                                <div className="summary-box orange"> <span className="summary-label">Ahorrado Viajes</span> <strong id="totalSavedForTrips">{listSummary.totalSavedForTrips}</strong> </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- Vista Detalle --- */}
                {viewMode === 'detail' && selectedTrip && (
                    <div id="tripDetailView" className="view active">
                        <div id="tripDetailHeader" className="trip-detail-header">
                            {/* Ya no necesitamos h2 aquí, está en la cabecera principal */}
                            <p id="detailTripDates">{formatDate(selectedTrip.start_date)} - {formatDate(selectedTrip.end_date)}</p>
                            <div className="detail-summary">
                                <div><span>Presupuesto:</span> <strong id="detailTripBudget">{detailSummary.budget}</strong></div>
                                <div><span>Gastado:</span> <strong id="detailTripSpent">{detailSummary.spent}</strong></div>
                                <div><span>Restante:</span> <strong id="detailTripRemaining" className={detailSummary.remainingIsPositive ? 'positive' : 'negative'}>{detailSummary.remaining}</strong></div>
                            </div>
                        </div>

                        <div className="detail-actions-header">
                            <button onClick={handleViewTripList} id="backToListBtn" className="btn btn-secondary btn-sm" disabled={isSavingExpense}>
                                <i className="fas fa-arrow-left"></i> Volver a Viajes
                            </button>
                            <button onClick={() => handleOpenExpenseModal('add')} id="addTripExpenseBtn" className="btn btn-primary btn-add btn-sm" disabled={isSavingExpense}>
                                <i className="fas fa-plus"></i> Añadir Gasto
                            </button>
                        </div>

                        <div id="tripExpensesListContainer">
                            {isLoadingExpenses && <p id="loadingTripExpensesMessage" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>Cargando gastos...</p>}
                            {!isLoadingExpenses && tripExpenses.length === 0 && <p id="noTripExpensesMessage" className="empty-list-message small-empty">Aún no has registrado gastos para este viaje.</p>}
                            {!isLoadingExpenses && tripExpenses.length > 0 && (
                                <div id="tripExpensesTableWrapper">
                                    <table className="expenses-table">
                                        <thead>
                                            <tr>
                                                <th>Fecha</th><th>Descripción</th><th>Categoría</th><th className="amount-col">Importe</th><th>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody id="tripExpensesTableBody">
                                            {tripExpenses.map(exp => (
                                                <TripExpenseRow
                                                    key={exp.id}
                                                    expense={exp}
                                                    onEdit={() => handleOpenExpenseModal('edit', exp)}
                                                    onDelete={() => handleDeleteTripExpense(exp.id)}
                                                />
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div> {/* Fin page-container */}

            {/* --- Modales --- */}
            {isTripModalOpen && (
                <TripModal
                    isOpen={isTripModalOpen}
                    onClose={handleCloseTripModal}
                    onSubmit={handleTripFormSubmit}
                    mode={tripModalMode}
                    initialData={editingTrip}
                    isSaving={isSavingTrip}
                    error={modalTripError}
                />
            )}
            {isExpenseModalOpen && selectedTrip && ( // Asegurar que selectedTrip existe para pasar tripId
                 <TripExpenseModal
                    isOpen={isExpenseModalOpen}
                    onClose={handleCloseExpenseModal}
                    onSubmit={handleExpenseFormSubmit}
                    mode={expenseModalMode}
                    initialData={editingExpense}
                    tripId={selectedTrip.id} // Pasar tripId al modal de gasto
                    isSaving={isSavingExpense}
                    error={modalExpenseError}
                 />
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


// --- Componente Modal Viaje (Ejemplo Básico) ---
function TripModal({ isOpen, onClose, onSubmit, mode, initialData, isSaving, error }) {
    const [formData, setFormData] = useState({
        name: '', destination: '', start_date: '', end_date: '', budget: 0, saved_amount: 0, notes: ''
    });

    useEffect(() => {
        if (mode === 'edit' && initialData) {
            setFormData({
                name: initialData.name || '',
                destination: initialData.destination || '',
                start_date: initialData.start_date || '',
                end_date: initialData.end_date || '',
                budget: initialData.budget || 0,
                saved_amount: initialData.saved_amount || 0,
                notes: initialData.notes || ''
            });
        } else {
             // Resetear para modo 'add' o si no hay initialData
             setFormData({ name: '', destination: '', start_date: '', end_date: '', budget: 0, saved_amount: 0, notes: '' });
        }
    }, [mode, initialData, isOpen]); // Recalcular al abrir o cambiar modo/datos

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Validaciones básicas (pueden mejorarse)
        if (!formData.name.trim()) { alert("El nombre es obligatorio."); return; }
        if (formData.start_date && formData.end_date && new Date(formData.end_date) < new Date(formData.start_date)) {
             alert("La fecha fin no puede ser anterior a la fecha inicio."); return;
        }
        onSubmit(formData);
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay active" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="modal-content">
                <h2>{mode === 'add' ? 'Añadir Nuevo Viaje' : 'Editar Viaje'}</h2>
                <form onSubmit={handleSubmit}>
                    {/* Campos del formulario (controlados) */}
                    <div className="input-group"> <label htmlFor="modalTripName">Nombre</label> <input type="text" id="modalTripName" name="name" required value={formData.name} onChange={handleChange} disabled={isSaving}/> </div>
                    <div className="input-group"> <label htmlFor="modalTripDestination">Destino</label> <input type="text" id="modalTripDestination" name="destination" value={formData.destination} onChange={handleChange} disabled={isSaving}/> </div>
                    <div className="input-group"> <label htmlFor="modalTripStartDate">Fecha Inicio</label> <input type="date" id="modalTripStartDate" name="start_date" value={formData.start_date} onChange={handleChange} disabled={isSaving}/> </div>
                    <div className="input-group"> <label htmlFor="modalTripEndDate">Fecha Fin</label> <input type="date" id="modalTripEndDate" name="end_date" value={formData.end_date} onChange={handleChange} disabled={isSaving}/> </div>
                    <div className="input-group"> <label htmlFor="modalTripBudget">Presupuesto (€)</label> <input type="number" id="modalTripBudget" name="budget" step="0.01" min="0" value={formData.budget} onChange={handleChange} disabled={isSaving}/> </div>
                    <div className="input-group"> <label htmlFor="modalTripSavedAmount">Ahorrado Específico (€)</label> <input type="number" id="modalTripSavedAmount" name="saved_amount" step="0.01" min="0" value={formData.saved_amount} onChange={handleChange} disabled={isSaving}/> <small>Dinero apartado.</small> </div>
                    <div className="input-group"> <label htmlFor="modalTripNotes">Notas</label> <textarea id="modalTripNotes" name="notes" rows={2} value={formData.notes} onChange={handleChange} disabled={isSaving}></textarea> </div>

                    {error && <p className="error-message">{error}</p>}

                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSaving}>Cancelar</button>
                        <button type="submit" className="btn btn-primary" disabled={isSaving}>
                            {isSaving ? 'Guardando...' : (mode === 'add' ? 'Crear Viaje' : 'Guardar Cambios')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// --- Componente Modal Gasto Viaje (Ejemplo Básico) ---
function TripExpenseModal({ isOpen, onClose, onSubmit, mode, initialData, tripId, isSaving, error }) {
     const [formData, setFormData] = useState({
        description: '', amount: '', expense_date: '', category: '', notes: ''
    });

     useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        if (mode === 'edit' && initialData) {
            setFormData({
                description: initialData.description || '',
                amount: initialData.amount || '',
                expense_date: initialData.expense_date ? initialData.expense_date.split('T')[0] : today,
                category: initialData.category || '',
                notes: initialData.notes || ''
            });
        } else {
            // Resetear para modo 'add'
            setFormData({ description: '', amount: '', expense_date: today, category: '', notes: '' });
        }
    }, [mode, initialData, isOpen]); // Recalcular al abrir o cambiar modo/datos

     const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

     const handleSubmit = (e) => {
        e.preventDefault();
        // Validaciones básicas
        if (!formData.description.trim()) { alert("La descripción es obligatoria."); return; }
        const amount = parseFloat(formData.amount);
        if (isNaN(amount) || amount <= 0) { alert("El importe debe ser un número positivo."); return; }
        if (!formData.expense_date) { alert("La fecha es obligatoria."); return; }

        onSubmit({ ...formData, amount: amount }); // Enviar amount como número
    };

     if (!isOpen) return null;

     return (
        <div className="modal-overlay active" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="modal-content">
                <h2>{mode === 'add' ? 'Añadir Gasto del Viaje' : 'Editar Gasto del Viaje'}</h2>
                <form onSubmit={handleSubmit}>
                     {/* Campos del formulario (controlados) */}
                     <div className="input-group"> <label htmlFor="modalExpDesc">Descripción</label> <input type="text" id="modalExpDesc" name="description" required value={formData.description} onChange={handleChange} disabled={isSaving}/> </div>
                     <div className="input-group"> <label htmlFor="modalExpAmount">Importe (€)</label> <input type="number" id="modalExpAmount" name="amount" required step="0.01" min="0.01" value={formData.amount} onChange={handleChange} disabled={isSaving}/> </div>
                     <div className="input-group"> <label htmlFor="modalExpDate">Fecha</label> <input type="date" id="modalExpDate" name="expense_date" required value={formData.expense_date} onChange={handleChange} disabled={isSaving}/> </div>
                     <div className="input-group"> <label htmlFor="modalExpCategory">Categoría</label> <input type="text" id="modalExpCategory" name="category" value={formData.category} onChange={handleChange} disabled={isSaving}/> </div>
                     <div className="input-group"> <label htmlFor="modalExpNotes">Notas</label> <textarea id="modalExpNotes" name="notes" rows={2} value={formData.notes} onChange={handleChange} disabled={isSaving}></textarea> </div>

                     {error && <p className="error-message">{error}</p>}

                     <div className="modal-actions">
                        <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSaving}>Cancelar</button>
                        <button type="submit" className="btn btn-primary" disabled={isSaving}>
                            {isSaving ? 'Guardando...' : (mode === 'add' ? 'Añadir Gasto' : 'Guardar Cambios')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}


export default Trips;
