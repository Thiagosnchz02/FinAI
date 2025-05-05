/*
Archivo: src/pages/FixedExpenses.jsx
Propósito: Componente para gestionar los gastos fijos recurrentes, con vista de lista y calendario.
*/
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext.jsx';
import { formatCurrency, formatDate } from '../utils/formatters.js';
import Sidebar from '../components/layout/Sidebar.jsx'; 
// Icono ahora se usa en FixedExpenseRow
import FixedExpenseRow from '../components/FixedExpenses/FixedExpenseRow.jsx'; // Asume ruta /components/
import FixedExpenseModal from '../components/FixedExpenses/FixedExpenseModal.jsx'; // Asume ruta /components/
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from '@fullcalendar/core/locales/es';
import toast from 'react-hot-toast';
import ConfirmationModal from '../components/ConfirmationModal.jsx';

// Importa imágenes
import defaultAvatar from '../assets/avatar_predeterminado.png';
// Importar mascota si se usa

function FixedExpenses() {
    // --- Estado ---
    const { user, loading: authLoading } = useAuth();
    const [avatarUrl, setAvatarUrl] = useState(defaultAvatar);
    const [fixedExpenses, setFixedExpenses] = useState([]);
    const [categories, setCategories] = useState([]); // Categorías de GASTO
    const [accounts, setAccounts] = useState([]); // Cuentas del usuario
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState('list');

    // Estados Modales
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [selectedExpense, setSelectedExpense] = useState(null); // Objeto para editar
    const [isSaving, setIsSaving] = useState(false);
    const [modalError, setModalError] = useState('');

    // Estado Confirmación
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [expenseToDelete, setExpenseToDelete] = useState(null); // { id, name }
    // UI
    const [showScrollTop, setShowScrollTop] = useState(false);

    const navigate = useNavigate();

    const fetchData = useCallback(async (currentUserId) => {
        setIsLoading(true); setError(null);
        setFixedExpenses([]); setAccounts([]); setCategories([]); // Resetear
        console.log(`FixedExpenses: Cargando datos para usuario ${currentUserId}`);
        try {
            const [profileRes, accountsRes, categoriesRes, expensesRes] = await Promise.all([
                supabase.from('profiles').select('avatar_url').eq('id', currentUserId).single(),
                supabase.from('accounts').select('id, name').eq('user_id', currentUserId).order('name'),
                supabase.from('categories').select('id, name, icon, color') // Incluir icon/color para calendario
                    .or(`user_id.eq.${currentUserId},is_default.eq.true`)
                    .eq('type', 'gasto').order('name'),
                // NO es necesario el JOIN aquí si pasamos 'categories' a FixedExpenseRow
                supabase.from('scheduled_fixed_expenses').select(`*`)
                    .eq('user_id', currentUserId).order('next_due_date')
            ]);

            if (profileRes.error && profileRes.status !== 406) throw profileRes.error;
            setAvatarUrl(profileRes.data?.avatar_url || defaultAvatar);

            if (accountsRes.error) throw accountsRes.error; setAccounts(accountsRes.data || []);
            if (categoriesRes.error) throw categoriesRes.error; setCategories(categoriesRes.data || []);

            // ** SIN ACTUALIZACIÓN DE FECHAS AQUÍ ** - Lo hace la Edge Function
            if (expensesRes.error) throw expensesRes.error;
            setFixedExpenses(expensesRes.data || []);
            console.log(`FixedExpenses: ${expensesRes.data?.length || 0} gastos fijos cargados.`);

        } catch (err) {
            console.error("Error cargando datos (Fixed Expenses):", err);
            setError(err.message || "Error al cargar datos.");
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    // --- Cálculo Total Mensual (useMemo) ---
    // Calcula el total estimado de gastos fijos para el mes actual.
    // useMemo evita recalcular esto en cada renderizado si 'fixedExpenses' no ha cambiado.
    const monthlyTotal = useMemo(() => {
      console.log("Recalculando total mensual estimado..."); // Para depuración
      const now = new Date();
      const currentMonth = now.getMonth(); // 0-11
      const currentYear = now.getFullYear();
      let total = 0;

      // Iterar sobre la lista actual de gastos fijos guardada en el estado
      fixedExpenses.forEach(exp => {
          // Solo considerar gastos marcados como activos
          if (exp.is_active) {
              // Lógica para determinar si este gasto contribuye al total del mes actual
              // (Esta lógica puede necesitar ajustes según cómo quieras calcular el total mensual exacto)

              if (exp.frequency === 'mensual') {
                  // Si es mensual, siempre suma al total del mes
                  total += Number(exp.amount) || 0;
              } else if (exp.next_due_date) {
                  // Si no es mensual pero tiene fecha de vencimiento,
                  // comprobar si esa fecha cae dentro del mes actual.
                  try {
                      const nextDueDate = new Date(exp.next_due_date);
                      // Ajustar por zona horaria para comparación correcta
                      const offset = nextDueDate.getTimezoneOffset();
                      const adjustedNextDueDate = new Date(nextDueDate.getTime() + (offset * 60 * 1000));

                      // Comprobar si el año y mes del vencimiento coinciden con el actual
                      if (adjustedNextDueDate.getFullYear() === currentYear && adjustedNextDueDate.getMonth() === currentMonth) {
                          // Sumar si vence este mes.
                          // NOTA: Esto suma el importe completo de gastos anuales/semestrales/etc.
                          // si vencen este mes. Podrías querer prorratearlos en su lugar,
                          // pero eso complica significativamente el cálculo aquí.
                          total += Number(exp.amount) || 0;
                      }
                  } catch(e) {
                      // Ignorar si la fecha es inválida
                      console.error("Error procesando fecha en cálculo total mensual:", exp.next_due_date, e);
                  }
              }
          }
      });
      // Devuelve el total calculado y formateado
      return formatCurrency(total);
  }, [fixedExpenses]);

    // --- Efecto Carga Inicial y Actualización Fechas ---
    useEffect(() => {
        if (authLoading) { setIsLoading(true); return; }
        if (!user) { navigate('/login'); return; }
        fetchData(user.id);

        const handleScroll = () => setShowScrollTop(window.scrollY > 300);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [user, authLoading, navigate, fetchData]); // Dependencias correctas

    // --- Preparar eventos para FullCalendar ---
    const calendarEvents = useMemo(() => {
        return fixedExpenses
            .filter(exp => exp.is_active && exp.next_due_date)
            .map(exp => {
                const category = categories.find(c => c.id === exp.category_id);
                return {
                    id: exp.id, title: `${exp.description} (${formatCurrency(exp.amount)})`,
                    start: exp.next_due_date, allDay: true,
                    backgroundColor: category?.color || '#8a82d5', borderColor: category?.color || '#8a82d5',
                    extendedProps: { expenseData: exp }
                };
            });
    }, [fixedExpenses, categories]); // Recalcular si cambian gastos o categorías

    // --- Manejadores ---
    const handleViewChange = (newView) => setViewMode(newView);

    const handleOpenExpenseModal = useCallback((mode = 'add', expense = null) => {
        setModalMode(mode); setSelectedExpense(expense); setModalError('');
        setIsSaving(false); setIsExpenseModalOpen(true);
    }, []);
    const handleCloseExpenseModal = useCallback(() => { setIsExpenseModalOpen(false); setSelectedExpense(null); setModalError(''); }, []);

    const handleExpenseFormSubmit = useCallback(async (submittedFormData) => {
        if (!user?.id) { toast.error("Usuario no identificado."); return; }
        setModalError(''); setIsSaving(true);
        const toastId = toast.loading(modalMode === 'edit' ? 'Guardando...' : 'Creando...');
        try {
            // Validaciones básicas ya hechas en modal, pero re-parseamos
            const amount = parseFloat(submittedFormData.amount);
            let dayOfMonthValue = null;
            if (submittedFormData.frequency === 'mensual' && submittedFormData.nextDueDate) {
                try { dayOfMonthValue = new Date(submittedFormData.nextDueDate + 'T00:00:00').getUTCDate(); } catch(e){} // Usar UTC
            }
            if (isNaN(amount) || amount <= 0) throw new Error('Importe inválido.');
            // Añadir más validaciones si es necesario

            const dataToSave = {
                description: submittedFormData.description.trim(), amount: amount,
                category_id: submittedFormData.categoryId || null, account_id: submittedFormData.accountId || null,
                frequency: submittedFormData.frequency, next_due_date: submittedFormData.nextDueDate,
                day_of_month: dayOfMonthValue, notification_enabled: submittedFormData.notificationEnabled,
                is_active: submittedFormData.isActive,
            };

            let error;
            if (modalMode === 'edit' && selectedExpense?.id) {
                const { error: uError } = await supabase.from('scheduled_fixed_expenses')
                    .update({ ...dataToSave, updated_at: new Date() })
                    .eq('id', selectedExpense.id).eq('user_id', user.id); error = uError;
            } else {
                const { error: iError } = await supabase.from('scheduled_fixed_expenses')
                    .insert([{ ...dataToSave, user_id: user.id }]); error = iError;
            }
            if (error) throw error;

            toast.success('¡Gasto Fijo guardado!', { id: toastId });
            handleCloseExpenseModal();
            fetchData(user.id); // Recargar
        } catch (err) {
            console.error('Error guardando Gasto Fijo:', err);
            setModalError(`Error: ${err.message}`);
            toast.error(`Error: ${err.message}`, { id: toastId });
        } finally { setIsSaving(false); }
    }, [user, modalMode, selectedExpense, supabase, handleCloseExpenseModal, fetchData]);

    const handleToggle = useCallback(async (expenseId, field, newValue) => {
        if (!user?.id) { toast.error("Usuario no identificado."); return; }
        const originalValue = fixedExpenses.find(exp => exp.id === expenseId)?.[field];
        // Actualización optimista local
        setFixedExpenses(prev => prev.map(exp => exp.id === expenseId ? { ...exp, [field]: newValue } : exp));
        try {
            const { error } = await supabase.from('scheduled_fixed_expenses')
               .update({ [field]: newValue, updated_at: new Date() })
               .eq('id', expenseId).eq('user_id', user.id);
            if (error) throw error;
            // Éxito, no hace falta toast si la UI ya cambió
        } catch (err) {
            console.error(`Error actualizando '${field}':`, err);
            toast.error(`Error al actualizar: ${err.message}`);
            // Revertir cambio local si falla la BD
            setFixedExpenses(prev => prev.map(exp => exp.id === expenseId ? { ...exp, [field]: originalValue } : exp));
        }
    }, [user, supabase, fixedExpenses]); // Depende de fixedExpenses para revertir

    // Eliminación
    const handleDeleteExpense = (expenseId, description) => {
        if (!expenseId || !description) return;
        setExpenseToDelete({ id: expenseId, name: description });
        setIsConfirmModalOpen(true);
    };

    const confirmDeleteHandler = useCallback(async () => {
        if (!expenseToDelete || !user?.id) { toast.error("Faltan datos."); return; }
        const { id: expenseId, name: description } = expenseToDelete;
        setIsConfirmModalOpen(false);
        const toastId = toast.loading(`Eliminando "${description}"...`);
        try {
            const { error } = await supabase.from('scheduled_fixed_expenses').delete()
                .eq('id', expenseId).eq('user_id', user.id);
            if (error) throw error; // Podría fallar si hay FK dependientes?
            toast.success('Gasto Fijo eliminado.', { id: toastId });
            fetchData(user.id); // Recargar
        } catch (err) {
            console.error('Error eliminando gasto fijo:', err);
            toast.error(`Error: ${err.message}`, { id: toastId });
        } finally { setExpenseToDelete(null); }
    }, [user, expenseToDelete, supabase, fetchData]);

    const handleCalendarEventClick = useCallback((clickInfo) => {
        const expenseId = clickInfo.event.id;
        const expense = fixedExpenses.find(exp => exp.id === expenseId);
        if (expense) { handleOpenExpenseModal('edit', expense); }
    }, [fixedExpenses, handleOpenExpenseModal]);

    // Otros manejadores
    
    const handleBack = useCallback(() => navigate(-1), [navigate]);
    const scrollToTop = useCallback(() => window.scrollTo({ top: 0, behavior: 'smooth' }), []);


    // --- Renderizado ---
    // ... (JSX completo usando estados y manejadores) ...
    // Incluir el componente <FullCalendar> en la vista de calendario
    return (
        <div style={{ display: 'flex' }}>
            {/* Sidebar */}
            <Sidebar
                // Pasar estado de carga/guardado si quieres deshabilitar botones mientras ocurre algo
                isProcessing={isLoading || isSaving /* ...o el estado relevante */}
            />

            {/* Contenido Principal */}
            <div className="page-container">
                {/* Cabecera */}
                <div className="page-header fixed-expenses-header">
                    <button onClick={handleBack} id="backButton" className="btn-icon" aria-label="Volver"><i className="fas fa-arrow-left"></i></button>
                    <div className="header-title-group"> <img id="userAvatarHeader" src={avatarUrl} alt="Avatar" className="header-avatar-small" /> <h1>Gastos Fijos</h1> </div>
                    <button onClick={() => handleOpenExpenseModal('add')} id="addExpenseBtn" className="btn btn-primary btn-add"> <i className="fas fa-plus"></i> Añadir Gasto </button>
                </div>

                {/* Resumen Total */}
                <div className="total-summary"> Total Fijo Estimado Este Mes: <span id="monthlyTotalAmount">{isLoading ? 'Calculando...' : monthlyTotal}</span> </div>

                {/* Toggle de Vista */}
                <div className="view-toggle">
                    <button onClick={() => handleViewChange('list')} id="listViewBtn" className={`btn-view ${viewMode === 'list' ? 'active' : ''}`} aria-label="Vista de Lista"> <i className="fas fa-list"></i> Lista </button>
                    <button onClick={() => handleViewChange('calendar')} id="calendarViewBtn" className={`btn-view ${viewMode === 'calendar' ? 'active' : ''}`} aria-label="Vista de Calendario"> <i className="fas fa-calendar-alt"></i> Calendario </button>
                </div>

                 {/* Mensaje General de Error */}
                 {error && !isLoading && (<p className="message page-message error">{error}</p>)}

                {/* Vista Lista */}
                {viewMode === 'list' && (
                    <div id="listViewContainer">
                        <div className="table-container">
                            <table id="fixedExpensesTable" className="data-table">
                                <thead>{/* ... Encabezados ... */}</thead>
                                <tbody>
                                    {isLoading && (<tr><td colSpan="8">Cargando...</td></tr>)}
                                    {!isLoading && fixedExpenses.length === 0 && !error && (<tr><td colSpan="8"><p>No hay gastos fijos.</p></td></tr>)}
                                    {!isLoading && !error && fixedExpenses.map(exp => (
                                        <FixedExpenseRow // <<< USA COMPONENTE
                                            key={exp.id}
                                            expense={exp}
                                            category={categories.find(c => c.id === exp.category_id)} // Pasa categoría encontrada
                                            onEdit={() => handleOpenExpenseModal('edit', exp)}
                                            onDelete={() => handleDeleteExpense(exp.id, exp.description)}
                                            onToggle={handleToggle} // Pasa la función de toggle
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Vista Calendario */}
                {viewMode === 'calendar' && (
                    <div id="calendarViewContainer">
                        <div id="calendar" className="calendar-container">
                            {isLoading ? <p>Cargando...</p> : !error && ( // Mostrar calendario solo si no hay error de carga inicial
                                <FullCalendar
                                    plugins={[dayGridPlugin, interactionPlugin]}
                                    initialView="dayGridMonth" locale={esLocale}
                                    events={calendarEvents} eventClick={handleCalendarEventClick}
                                    height="auto" headerToolbar={{ /* ... */ }} buttonText={{ /* ... */ }}
                                />
                            )}
                        </div>
                    </div>
                )}

            </div> {/* Fin page-container */}

            {/* Modales */}
            <FixedExpenseModal // <<< USA COMPONENTE
                isOpen={isExpenseModalOpen} onClose={handleCloseExpenseModal} onSubmit={handleExpenseFormSubmit}
                mode={modalMode} initialData={selectedExpense}
                accounts={accounts} categories={categories} // Pasa listas para selects
                isSaving={isSaving} error={modalError}
            />
            <ConfirmationModal // <<< USA COMPONENTE
                isOpen={isConfirmModalOpen}
                onClose={() => { setIsConfirmModalOpen(false); setExpenseToDelete(null); }}
                onConfirm={confirmDeleteHandler} title="Confirmar Eliminación"
                message={`¿Seguro eliminar el gasto fijo "${expenseToDelete?.name || ''}"?`}
                confirmText="Eliminar" cancelText="Cancelar" isDanger={true}
            />

            {/* Botón Scroll-Top */}
            {showScrollTop && ( <button onClick={scrollToTop} id="scrollTopBtn" className="scroll-top-btn visible" title="Volver arriba"><i className="fas fa-arrow-up"></i></button> )}
        </div>
    );
}
export default FixedExpenses;

