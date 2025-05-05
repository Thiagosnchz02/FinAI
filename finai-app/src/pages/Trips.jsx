/*
Archivo: src/pages/Trips.jsx
Propósito: Componente para gestionar viajes, incluyendo una vista de lista y una de detalle.
*/
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext.jsx';
import { formatCurrency, formatDate } from '../utils/formatters.js';
import Sidebar from '../components/layout/Sidebar.jsx'; 
//import { getIconForTrip } from '../utils/iconUtils.js'; // Asegúrate que esta función está en utils
import TripCard from '../components/Trips/TripCard.jsx'; // Asume ruta src/components/Trips/
import TripExpenseRow from '../components/Trips/TripExpenseRow.jsx'; // Asume ruta src/components/Trips/
import TripModal from '../components/Trips/TripModal.jsx'; // Asume ruta src/components/Trips/
import TripExpenseModal from '../components/Trips/TripExpenseModal.jsx'; // Asume ruta src/components/Trips/
import toast from 'react-hot-toast';
import ConfirmationModal from '../components/ConfirmationModal.jsx';

// Importa imágenes
import defaultAvatar from '../assets/avatar_predeterminado.png';
import emptyMascot from '../assets/monstruo_pixar.png';
// --- Componente Principal ---
function Trips() {
    // --- Estado ---
    const { user, loading: authLoading } = useAuth();
    const [avatarUrl, setAvatarUrl] = useState(defaultAvatar);
    const [viewMode, setViewMode] = useState('list'); // 'list' o 'detail'
    const [trips, setTrips] = useState([]); // Lista de todos los viajes
    const [selectedTrip, setSelectedTrip] = useState(null); // Viaje seleccionado para detalle/modales
    const [tripExpenses, setTripExpenses] = useState([]); // Gastos del viaje seleccionado
    const [isLoadingTrips, setIsLoadingTrips] = useState(true); // Carga inicial de viajes
    const [isLoadingExpenses, setIsLoadingExpenses] = useState(false); // Carga de gastos en detalle

    // Estados Modales
    const [isTripModalOpen, setIsTripModalOpen] = useState(false);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [tripModalMode, setTripModalMode] = useState('add');
    const [expenseModalMode, setExpenseModalMode] = useState('add');
    const [editingTrip, setEditingTrip] = useState(null); // Objeto trip para editar
    const [editingExpense, setEditingExpense] = useState(null); // Objeto expense para editar
    const [isSavingTrip, setIsSavingTrip] = useState(false); // Estado guardado modal Viaje
    const [isSavingExpense, setIsSavingExpense] = useState(false); // Estado guardado modal Gasto
    const [modalTripError, setModalTripError] = useState(''); // Error para modal Viaje
    const [modalExpenseError, setModalExpenseError] = useState(''); // Error para modal Gasto

    // Estados Confirmación
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    // Guardará { type: 'trip' | 'expense', id: string, name: string }
    const [itemToDelete, setItemToDelete] = useState(null);

    // UI
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [error, setError] = useState(null); // Error general de carga

    const navigate = useNavigate();
    const isMounted = useRef(true); // Para evitar updates en unmount

    // --- Carga Inicial (Usuario, Avatar, Viajes) ---
    const fetchProfileAndTrips = useCallback(async (currentUserId) => {
      setIsLoadingTrips(true); setError(null); setTrips([]);
      console.log(`Trips: Cargando perfil y viajes para ${currentUserId}`);
      try {
          const [profileRes, tripsRes] = await Promise.all([
              supabase.from('profiles').select('avatar_url').eq('id', currentUserId).single(),
              supabase.from('trips').select('*').eq('user_id', currentUserId).order('start_date', { ascending: false, nullsLast: true })
          ]);

          if (profileRes.error && profileRes.status !== 406) throw profileRes.error;
          if (isMounted.current) setAvatarUrl(profileRes.data?.avatar_url || defaultAvatar);

          if (tripsRes.error) throw tripsRes.error;
          if (isMounted.current) setTrips(tripsRes.data || []);

      } catch (err) {
          console.error("Error loading profile/trips:", err);
          if (isMounted.current) setError(err.message || "Error al cargar viajes.");
      } finally {
          if (isMounted.current) setIsLoadingTrips(false);
      }
  }, [supabase]);

  const fetchExpensesForTrip = useCallback(async (currentUserId, tripId) => {
      if (!currentUserId || !tripId) return;
      setIsLoadingExpenses(true); setTripExpenses([]); setError(null); // Limpiar error específico de gastos
      console.log(`Trips: Cargando gastos para viaje ${tripId}`);
      try {
          const { data, error: expensesError } = await supabase
              .from('trip_expenses').select('*')
              .eq('user_id', currentUserId).eq('trip_id', tripId)
              .order('expense_date', { ascending: false });

          if (expensesError) throw expensesError;
          if (isMounted.current) setTripExpenses(data || []);

      } catch (err) {
          console.error("Error loading trip expenses:", err);
          if (isMounted.current) setError(`Error cargando gastos: ${err.message}`); // Mostrar error general
      } finally {
          if (isMounted.current) setIsLoadingExpenses(false);
      }
    }, [supabase]);

    useEffect(() => {
      isMounted.current = true;
      return () => { isMounted.current = false; }; // Cleanup on unmount
    }, []);

    useEffect(() => { // Carga inicial
        if (authLoading) { setIsLoadingTrips(true); return; }
        if (!user) { navigate('/login'); return; }
        fetchProfileAndTrips(user.id);
    }, [user, authLoading, navigate, fetchProfileAndTrips]);

    useEffect(() => { // Carga gastos al entrar en detalle
        if (viewMode === 'detail' && selectedTrip?.id && user?.id) {
            fetchExpensesForTrip(user.id, selectedTrip.id);
        }
    }, [viewMode, selectedTrip, user, fetchExpensesForTrip]);

    useEffect(() => { // Listener Scroll
        const handleScroll = () => isMounted.current && setShowScrollTop(window.scrollY > 300);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

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
      setSelectedTrip(trip); setViewMode('detail'); window.scrollTo(0, 0);
    }, []);

    const handleViewTripList = useCallback(() => {
      setSelectedTrip(null); setTripExpenses([]); setViewMode('list'); setError(null); // Limpiar error al cambiar vista
    }, []);

    const handleOpenTripModal = useCallback((mode = 'add', trip = null) => {
      setTripModalMode(mode); setEditingTrip(trip); setModalTripError('');
      setIsSavingTrip(false); setIsTripModalOpen(true);
    }, []);

    const handleCloseTripModal = useCallback(() => setIsTripModalOpen(false), []);

    const handleOpenExpenseModal = useCallback((mode = 'add', expense = null) => {
        if (viewMode !== 'detail' || !selectedTrip?.id) return;
        setExpenseModalMode(mode); setEditingExpense(expense); setModalExpenseError('');
        setIsSavingExpense(false); setIsExpenseModalOpen(true);
    }, [viewMode, selectedTrip]);

    const handleCloseExpenseModal = useCallback(() => setIsExpenseModalOpen(false), []);

    // --- Manejadores CRUD ---

    // Viajes
    const handleTripFormSubmit = useCallback(async (submittedFormData) => {
        if (!user?.id) { toast.error("Error: Usuario no identificado."); return; }
        // Validación básica ya hecha en el modal
        setIsSavingTrip(true); setModalTripError('');
        const toastId = toast.loading(tripModalMode === 'edit' ? 'Actualizando viaje...' : 'Creando viaje...');
        try {
            const dataToSave = {
                name: submittedFormData.name, destination: submittedFormData.destination || null,
                start_date: submittedFormData.start_date || null, end_date: submittedFormData.end_date || null,
                budget: parseFloat(submittedFormData.budget) || 0,
                saved_amount: parseFloat(submittedFormData.saved_amount) || 0,
                notes: submittedFormData.notes || null
            };

            let error;
            if (tripModalMode === 'edit' && editingTrip?.id) {
                const { error: uError } = await supabase.from('trips')
                    .update({ ...dataToSave, updated_at: new Date() })
                    .eq('id', editingTrip.id).eq('user_id', user.id); error = uError;
            } else {
                const { error: iError } = await supabase.from('trips')
                    .insert([{ ...dataToSave, user_id: user.id }]); error = iError;
            }
            if (error) throw error;

            toast.success('¡Viaje guardado!', { id: toastId });
            handleCloseTripModal();
            fetchProfileAndTrips(user.id); // Recargar viajes y perfil

        } catch (err) {
            console.error('Error saving trip:', err);
            setModalTripError(`Error: ${err.message}`);
            toast.error(`Error: ${err.message}`, { id: toastId });
        } finally { setIsSavingTrip(false); }
      }, [user, tripModalMode, editingTrip, supabase, handleCloseTripModal, fetchProfileAndTrips]);

      const handleDeleteTrip = (tripId, tripName) => { // Abre modal confirmación
        if (!tripId || !tripName) return;
        setItemToDelete({ type: 'trip', id: tripId, name: tripName });
        setIsConfirmModalOpen(true);
      };

    // Gastos Viaje
    const handleExpenseFormSubmit = useCallback(async (submittedFormData) => {
      if (!user?.id || !selectedTrip?.id) { toast.error("Error inesperado."); return; }
      // Validación básica ya hecha en el modal
      setIsSavingExpense(true); setModalExpenseError('');
      const toastId = toast.loading(expenseModalMode === 'edit' ? 'Actualizando gasto...' : 'Añadiendo gasto...');
      try {
          const dataToSave = {
              description: submittedFormData.description,
              amount: parseFloat(submittedFormData.amount), // Ya validado como número > 0 en modal
              expense_date: submittedFormData.expense_date,
              category: submittedFormData.category || null,
              notes: submittedFormData.notes || null
          };

          let error;
          if (expenseModalMode === 'edit' && editingExpense?.id) {
              const { error: uError } = await supabase.from('trip_expenses')
                  .update({ ...dataToSave, updated_at: new Date() })
                  .eq('id', editingExpense.id).eq('user_id', user.id).eq('trip_id', selectedTrip.id); error = uError;
          } else {
              const { error: iError } = await supabase.from('trip_expenses')
                  .insert([{ ...dataToSave, user_id: user.id, trip_id: selectedTrip.id }]); error = iError;
          }
          if (error) throw error;

          toast.success('¡Gasto guardado!', { id: toastId });
          handleCloseExpenseModal();
          fetchExpensesForTrip(user.id, selectedTrip.id); // Recargar solo gastos

      } catch (err) {
          console.error('Error saving trip expense:', err);
          setModalExpenseError(`Error: ${err.message}`);
          toast.error(`Error: ${err.message}`, { id: toastId });
      } finally { setIsSavingExpense(false); }
      }, [user, selectedTrip, expenseModalMode, editingExpense, supabase, handleCloseExpenseModal, fetchExpensesForTrip]);

      const handleDeleteTripExpense = (expenseId, expenseDescription = "Gasto") => { // Abre modal confirmación
        if (!expenseId) return;
        setItemToDelete({ type: 'expense', id: expenseId, name: expenseDescription });
        setIsConfirmModalOpen(true);
      };

      // Handler Confirmación General
    const confirmDeleteHandler = useCallback(async () => {
      if (!itemToDelete || !user?.id) { toast.error("Error interno al eliminar."); return; }

      const { type, id, name } = itemToDelete;
      setIsConfirmModalOpen(false); // Cerrar modal
      const toastId = toast.loading(`Eliminando ${type === 'trip' ? 'viaje' : 'gasto'} "${name}"...`);

      try {
          let error;
          if (type === 'trip') {
              // Eliminar gastos asociados primero (opcional, depende de CASCADE o RPC)
               console.warn("Eliminando gastos asociados al viaje:", id);
               const { error: expenseDelError } = await supabase.from('trip_expenses').delete()
                   .eq('user_id', user.id).eq('trip_id', id);
               if (expenseDelError) console.error("Error eliminando gastos asociados:", expenseDelError); // No detener necesariamente

               // Eliminar el viaje
               const { error: tripDelError } = await supabase.from('trips').delete()
                   .eq('user_id', user.id).eq('id', id);
              error = tripDelError;

          } else if (type === 'expense') {
              // Eliminar solo el gasto
              const { error: expenseDelError } = await supabase.from('trip_expenses').delete()
                  .eq('user_id', user.id).eq('id', id);
              error = expenseDelError;
          }

          if (error) {
               // Podría haber error FK si un gasto está enlazado a otra tabla? Poco probable.
               throw error;
          }

          toast.success(`${type === 'trip' ? 'Viaje' : 'Gasto'} eliminado.`, { id: toastId });
          // Recargar datos apropiados
          if (type === 'trip') {
              fetchProfileAndTrips(user.id); // Recargar lista de viajes
               if (selectedTrip?.id === id) handleViewTripList(); // Si borramos el viaje actual, volver a lista
          } else {
              fetchExpensesForTrip(user.id, selectedTrip.id); // Recargar gastos del viaje actual
          }

      } catch (err) {
          console.error(`Error eliminando ${type}:`, err);
          toast.error(`Error al eliminar: ${err.message}`, { id: toastId });
      } finally {
          setItemToDelete(null); // Limpiar estado
      }
    }, [user, itemToDelete, supabase, fetchProfileAndTrips, fetchExpensesForTrip, selectedTrip, handleViewTripList]); // Dependencia

    const handleBack = useCallback(() => {
      if (viewMode === 'detail') handleViewTripList();
      else navigate(-1);
    }, [viewMode, navigate, handleViewTripList]);
    const scrollToTop = useCallback(() => window.scrollTo({ top: 0, behavior: 'smooth' }), []);

    // --- Renderizado ---
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
                <div className="page-header trips-header">
                  <button onClick={handleBack} id="backButton" className="btn-icon" aria-label="Volver" disabled={isSavingTrip || isSavingExpense}><i className="fas fa-arrow-left"></i></button>
                  <div className="header-title-group">
                      <img id="userAvatarHeader" src={avatarUrl} alt="Avatar" className="header-avatar-small" />
                      <h1>{viewMode === 'list' ? 'Mis Viajes' : (selectedTrip?.name || 'Detalle Viaje')}</h1>
                  </div>
                  {viewMode === 'list' && (
                      <button onClick={() => handleOpenTripModal('add')} id="addTripBtn" className="btn btn-primary btn-add orange-btn" disabled={isLoadingTrips}>
                          <i className="fas fa-plus"></i> Añadir Viaje
                      </button>
                  )}
                   {viewMode === 'detail' && <div style={{ width: '60px' }}></div>} {/* Spacer */}
              </div>

              {/* Mensaje General (Error de carga, etc.) */}
              {error && !isLoadingTrips && !isLoadingExpenses && ( // Mostrar solo si no hay carga activa
                  <p className={`message page-message error`}>{error}</p>
              )}

                {/* --- Vista Lista --- */}
                {viewMode === 'list' && (
                    <div id="tripsListView" className="view active">
                    <div id="tripListContainer" className="trip-list">
                        {isLoadingTrips && <p id="loadingTripsMessage">Cargando viajes...</p>}
                        {!isLoadingTrips && trips.length === 0 && !error && ( /* Mensaje Vacío */
                            <div id="noTripsMessage" className="empty-list-message">
                              <img src={emptyMascot} alt="Mascota FinAi Viajera" className="empty-mascot" />
                              <p>¡A planificar la próxima aventura!</p>
                              <button onClick={() => handleOpenTripModal('add')} id="addTripFromEmptyBtn" className="btn btn-primary orange-btn">
                                  <i className="fas fa-plus"></i> Registrar Viaje
                              </button>
                            </div>
                        )}
                        {!isLoadingTrips && trips.map(trip => (
                            <TripCard
                                key={trip.id} trip={trip}
                                onViewDetail={() => handleViewTripDetail(trip)}
                                onEdit={() => handleOpenTripModal('edit', trip)}
                                onDelete={() => handleDeleteTrip(trip.id, trip.name)} // Pasar nombre también
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
                    {/* Cabecera Detalle */}
                    <div id="tripDetailHeader" className="trip-detail-header">
                         <p id="detailTripDates">{formatDate(selectedTrip.start_date)} - {formatDate(selectedTrip.end_date)}</p>
                         <div className="detail-summary">
                             <div><span>Presup.:</span> <strong id="detailTripBudget">{detailSummary.budget}</strong></div>
                             <div><span>Gastado:</span> <strong id="detailTripSpent">{detailSummary.spent}</strong></div>
                             <div><span>Restante:</span> <strong id="detailTripRemaining" className={detailSummary.remainingIsPositive ? 'positive' : 'negative'}>{detailSummary.remaining}</strong></div>
                         </div>
                    </div>
                    {/* Botones Acción Detalle */}
                    <div className="detail-actions-header">
                         <button onClick={handleViewTripList} id="backToListBtn" className="btn btn-secondary btn-sm" disabled={isSavingExpense}><i className="fas fa-arrow-left"></i> Volver</button>
                         <button onClick={() => handleOpenExpenseModal('add')} id="addTripExpenseBtn" className="btn btn-primary btn-add btn-sm" disabled={isSavingExpense}><i className="fas fa-plus"></i> Añadir Gasto</button>
                    </div>
                    {/* Tabla Gastos */}
                    <div id="tripExpensesListContainer">
                        {isLoadingExpenses && <p>Cargando gastos...</p>}
                        {!isLoadingExpenses && tripExpenses.length === 0 && <p className="empty-list-message small-empty">Sin gastos registrados.</p>}
                        {!isLoadingExpenses && tripExpenses.length > 0 && (
                            <div id="tripExpensesTableWrapper">
                                <table className="expenses-table">
                                    <thead><tr><th>Fecha</th><th>Descripción</th><th>Categoría</th><th className="amount-col">Importe</th><th>Acciones</th></tr></thead>
                                    <tbody id="tripExpensesTableBody">
                                        {tripExpenses.map(exp => (
                                            <TripExpenseRow
                                                key={exp.id} expense={exp}
                                                onEdit={() => handleOpenExpenseModal('edit', exp)}
                                                // Pasar descripción para el mensaje de confirmación
                                                onDelete={() => handleDeleteTripExpense(exp.id, exp.description)}
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

          {/* Modales (usando componentes) */}
          <TripModal
              isOpen={isTripModalOpen} onClose={handleCloseTripModal} onSubmit={handleTripFormSubmit}
              mode={tripModalMode} initialData={editingTrip} isSaving={isSavingTrip} error={modalTripError}
          />
          <TripExpenseModal
              isOpen={isExpenseModalOpen} onClose={handleCloseExpenseModal} onSubmit={handleExpenseFormSubmit}
              mode={expenseModalMode} initialData={editingExpense} tripId={selectedTrip?.id} // Pasa tripId si existe
              isSaving={isSavingExpense} error={modalExpenseError}
          />
          <ConfirmationModal
              isOpen={isConfirmModalOpen}
              onClose={() => { setIsConfirmModalOpen(false); setItemToDelete(null); }}
              onConfirm={confirmDeleteHandler}
              title={`Confirmar Eliminación (${itemToDelete?.type === 'trip' ? 'Viaje' : 'Gasto'})`}
              message={
                  itemToDelete?.type === 'trip'
                  ? `¿Seguro eliminar el viaje "${itemToDelete?.name || ''}" y TODOS sus gastos? ¡No se puede deshacer!`
                  : `¿Seguro eliminar el gasto "${itemToDelete?.name || ''}"?`
              }
              confirmText="Eliminar" cancelText="Cancelar" isDanger={true}
          />

          {/* Botón Scroll-Top */}
          {showScrollTop && ( <button onClick={scrollToTop} id="scrollTopBtn" className="scroll-top-btn visible" title="Volver arriba"> <i className="fas fa-arrow-up"></i> </button> )}
      </div>
  );
}

export default Trips;
