/*
Archivo: src/pages/FixedExpenses.jsx
Propósito: Componente para gestionar los gastos fijos recurrentes, con vista de lista y calendario.
*/
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext.jsx';
import { formatCurrency } from '../utils/formatters.js';
import PageHeader from '../components/layout/PageHeader.jsx';
import Sidebar from '../components/layout/Sidebar.jsx'; 
import '../styles/Fixed_expenses.scss';
// Icono ahora se usa en FixedExpenseRow
import FixedExpenseRow from '../components/FixedExpenses/FixedExpenseRow.jsx'; // Asume ruta /components/
import FixedExpenseModal from '../components/FixedExpenses/FixedExpenseModal.jsx'; // Asume ruta /components/
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from '@fullcalendar/core/locales/es';
import toast from 'react-hot-toast';
import ConfirmationModal from '../components/ConfirmationModal.jsx';
import FixedExpenseHistoryModal from '../components/FixedExpenses/FixedExpenseHistoryModal.jsx';

// Importa imágenes
import defaultAvatar from '../assets/avatar_predeterminado.png';
// Importar mascota si se usa

const FIXED_EXPENSE_SORT_OPTIONS = [
    { value: 'next_due_date_asc', label: 'Próx. Vencimiento (Asc)' },
    { value: 'next_due_date_desc', label: 'Próx. Vencimiento (Desc)' },
    { value: 'description_asc', label: 'Descripción (A-Z)' },
    { value: 'description_desc', label: 'Descripción (Z-A)' },
    { value: 'amount_asc', label: 'Importe (Menor a Mayor)' },
    { value: 'amount_desc', label: 'Importe (Mayor a Menor)' },
    // Podrías añadir por categoría si lo ves útil, aunque requiere buscar el nombre
];

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
    const [sortConfigFixed, setSortConfigFixed] = useState({ key: 'next_due_date', direction: 'ascending' });

    // ESTADOS MODAL DE HISTORIAL 
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [viewingHistoryForExpense, setViewingHistoryForExpense] = useState(null); // Guardará el objeto expense
    const [historyTransactions, setHistoryTransactions] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [historyError, setHistoryError] = useState('');

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
                supabase.from('accounts')
                .select('id, name, type, currency')
                .eq('user_id', currentUserId)
                .eq('is_archived', false)
                .order('name'),
                supabase.from('categories').select('id, name, icon, color, type, parent_category_id, is_default, is_archived') // Incluir icon/color para calendario
                    .or(`user_id.eq.${currentUserId},is_default.eq.true`)
                    .eq('type', 'gasto').order('name'),
                // NO es necesario el JOIN aquí si pasamos 'categories' a FixedExpenseRow
                supabase.from('scheduled_fixed_expenses').select(`*, last_payment_processed_on`)
                    .eq('user_id', currentUserId).order('next_due_date')
            ]);

            if (profileRes.error && profileRes.status !== 406) throw profileRes.error;
            setAvatarUrl(profileRes.data?.avatar_url || defaultAvatar);

            if (accountsRes.error) throw accountsRes.error; setAccounts(accountsRes.data || []);
            if (categoriesRes.error) throw categoriesRes.error; setCategories(categoriesRes.data || []);

            // ** SIN ACTUALIZACIÓN DE FECHAS AQUÍ ** - Lo hace la Edge Function
            if (expensesRes.error) throw expensesRes.error;
            const fetchedExpenses = expensesRes.data || [];
            setFixedExpenses(fetchedExpenses);
            console.log(`FixedExpenses: ${fetchedExpenses.length} gastos fijos cargados. Primer gasto (si existe):`, fetchedExpenses[0]);

        } catch (err) {
            console.error("Error cargando datos (Fixed Expenses):", err);
            setError(err.message || "Error al cargar datos.");
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    const formattedExpenseCategoriesForModal = useMemo(() => {
        console.log("[FixedExpenses.jsx useMemo] Formateando categorías de GASTO. 'categories'.length:", categories ? categories.length : 0);
        if (!categories || categories.length === 0) {
            return [];
        }
        
        // 'categories' ya está filtrado por type='gasto' en fetchData.
        // Ahora solo filtramos las activas (no archivadas) y construimos la jerarquía.
        const activeExpenseCategories = categories.filter(cat => !cat.is_archived);

        const categoryIdsInExpenseType = new Set(activeExpenseCategories.map(cat => cat.id));

        const topLevelCategories = activeExpenseCategories.filter(
            cat => !cat.parent_category_id || !categoryIdsInExpenseType.has(cat.parent_category_id)
        ).sort((a, b) => a.name.localeCompare(b.name));
        
        const subCategories = activeExpenseCategories.filter(
            cat => cat.parent_category_id && categoryIdsInExpenseType.has(cat.parent_category_id)
        ).sort((a, b) => a.name.localeCompare(b.name));

        const options = [];
        topLevelCategories.forEach(parent => {
            options.push({ 
                id: parent.id, 
                name: `${parent.name}${parent.is_default ? '' : ''}`
            });
            const children = subCategories.filter(sub => sub.parent_category_id === parent.id);
            children.forEach(child => {
                options.push({ 
                    id: child.id, 
                    name: `  ↳ ${child.name}` // Indentación con prefijo
                });
            });
        });
        console.log("[FixedExpenses.jsx useMemo] Opciones finales de GASTO para FixedExpenseModal:", options.length);
        return options;
    }, [categories]);

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

    const processedFixedExpensesForList = useMemo(() => {
        console.log("[FixedExpenses.jsx useMemo] Recalculando lista ordenada. SortConfig:", sortConfigFixed);
        let activeFilteredExpenses = fixedExpenses.filter(exp => exp.is_active);
        console.log("[FixedExpenses.jsx useMemo] Nº de gastos activos filtrados:", activeFilteredExpenses.length);

        let expensesToSort = [...activeFilteredExpenses];

        if (sortConfigFixed.key && expensesToSort.length > 1) {
            const { key, direction } = sortConfigFixed;
            console.log(`[FixedExpenses.jsx useMemo] Ordenando por: ${key}, Dirección: ${direction}`);

            // Para ver el array ANTES de ordenar (solo los primeros 5 para no llenar la consola)
            console.log("[FixedExpenses.jsx useMemo] Array ANTES de ordenar (primeros 5 descripciones):", expensesToSort.slice(0, 5).map(e => e.description));
            
            expensesToSort.sort((a, b) => {
                let primaryComparison = 0;
                let valA_log, valB_log;

                if (key === 'next_due_date') {
                    const timeA = a.next_due_date ? new Date(a.next_due_date).getTime() : null;
                    const timeB = b.next_due_date ? new Date(b.next_due_date).getTime() : null;
                    valA_log = timeA; valB_log = timeB;

                    if (timeA === null && timeB === null) primaryComparison = 0;
                    else if (timeA === null) primaryComparison = 1; 
                    else if (timeB === null) primaryComparison = -1;
                    else if (timeA < timeB) primaryComparison = -1;
                    else if (timeA > timeB) primaryComparison = 1;
                } else if (key === 'amount') {
                    valA_log = Number(a.amount) || 0;
                    valB_log = Number(b.amount) || 0;
                    if (valA_log < valB_log) primaryComparison = -1;
                    else if (valA_log > valB_log) primaryComparison = 1;
                } else { 
                    valA_log = String(a[key] || '').toLowerCase();
                    valB_log = String(b[key] || '').toLowerCase();
                    if (valA_log < valB_log) primaryComparison = -1;
                    else if (valA_log > valB_log) primaryComparison = 1;
                }
                
                if (primaryComparison !== 0) {
                    // --- CORRECCIÓN AQUÍ: Usar 'asc' ---
                    const result = direction === 'asc' ? primaryComparison : -primaryComparison;
                    // ---------------------------------
                    console.log(`[SORT DEBUG Primary] A='${a.description}'(${valA_log}) vs B='${b.description}'(${valB_log}). Dir: ${direction}. PrimaryRes: ${primaryComparison} -> Final: ${result}`);
                    return result;
                }

                if (key !== 'description') {
                    const descA = String(a.description || '').toLowerCase();
                    const descB = String(b.description || '').toLowerCase();
                    let tieBreakResult = 0;
                    if (descA < descB) tieBreakResult = -1;
                    else if (descA > descB) tieBreakResult = 1;
                    
                    // --- CORRECCIÓN AQUÍ: Usar 'asc' ---
                    const finalTieBreakResult = direction === 'asc' ? tieBreakResult : -tieBreakResult;
                    // ---------------------------------
                    // console.log(`[SORT DEBUG Tiebreak] A='${descA}' vs B='${descB}'. Dir: ${direction}. TieBreakRes: ${tieBreakResult} -> Final: ${finalTieBreakResult}`);
                    return finalTieBreakResult;
                }
                
                return 0;
            });
           console.log("[FixedExpenses.jsx useMemo] Array DESPUÉS de ordenar (primer elemento descripción):", expensesToSort.length > 0 ? expensesToSort[0].description : "Lista vacía");
        } else {
            console.log("[FixedExpenses.jsx useMemo] No se aplicó ordenación (sin clave, lista vacía o un solo elemento).");
        }
        
        return [...expensesToSort]; 
    }, [fixedExpenses, sortConfigFixed, categories]); 

    const fetchTransactionHistory = useCallback(async (expenseId) => {
        if (!expenseId || !user?.id) return;
        setIsLoadingHistory(true);
        setHistoryError('');
        setHistoryTransactions([]);
        console.log(`[FixedExpenses] Fetching history for expense ID: ${expenseId}`);
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select('id, transaction_date, description, amount, notes') // Los campos que quieras mostrar
                .eq('user_id', user.id)
                .eq('related_scheduled_expense_id', expenseId) // Filtrar por el ID del gasto fijo
                .order('transaction_date', { ascending: false }) // Más recientes primero
                .limit(10); // Mostrar, por ejemplo, las últimas 10

            if (error) throw error;
            setHistoryTransactions(data || []);
            console.log(`[FixedExpenses] History fetched:`, data);
        } catch (err) {
            console.error("Error fetching transaction history:", err);
            setHistoryError('No se pudo cargar el historial de pagos.');
        } finally {
            setIsLoadingHistory(false);
        }
    }, [supabase, user?.id]);

    const handleOpenHistoryModal = useCallback((expense) => {
        setViewingHistoryForExpense(expense); // Guardar el objeto expense completo
        fetchTransactionHistory(expense.id);
        setIsHistoryModalOpen(true);
    }, [fetchTransactionHistory]);

    const handleCloseHistoryModal = useCallback(() => {
        setIsHistoryModalOpen(false);
        setViewingHistoryForExpense(null);
        setHistoryTransactions([]);
        setHistoryError('');
    }, []);

    // --- Manejadores ---
    const handleViewChange = (newView) => setViewMode(newView);

    const handleOpenExpenseModal = useCallback((mode = 'add', expense = null) => {
        setModalMode(mode); 
        setSelectedExpense(expense); 
        setModalError('');
        setIsSaving(false); 
        setIsExpenseModalOpen(true);
    }, []);
    const handleCloseExpenseModal = useCallback(() => { setIsExpenseModalOpen(false); setSelectedExpense(null); setModalError(''); }, []);

    const handleExpenseFormSubmit = useCallback(async (submittedFormData) => {
        if (!user?.id) { toast.error("Usuario no identificado."); return; }
        setModalError(''); setIsSaving(true);
        const toastId = toast.loading(modalMode === 'edit' ? 'Guardando...' : 'Creando...');
        try {
            // Validaciones básicas ya hechas en modal, pero re-parseamos
            const amount = parseFloat(submittedFormData.amount);
            if (!submittedFormData.description.trim() || 
                isNaN(amount) || amount <= 0 || 
                !submittedFormData.categoryId || 
                !submittedFormData.accountId || // <-- ASEGURAR QUE SE VALIDA accountId
                !submittedFormData.frequency || 
                !submittedFormData.nextDueDate) {
                
                setModalError('Descripción, Importe (>0), Categoría, Cuenta de Cargo, Frecuencia y Próxima Fecha son obligatorios.'); 
                toast.dismiss(toastId); // Quitar el toast de "guardando"
                setIsSaving(false); // Resetear estado de guardado
                return;
            }
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

    const handleSortChangeFixed = (event) => {
        const valueParts = event.target.value.split('_');
        const direction = valueParts.pop(); // El último elemento es la dirección (asc o desc)
        const key = valueParts.join('_');   // El resto, unido por guion bajo, es la clave (ej. next_due_date)
        
        console.log(`[FixedExpenses.jsx] handleSortChangeFixed: Nuevo sort -> key: ${key}, direction: ${direction}`);
        setSortConfigFixed({ key, direction });
    };

    const fixedExpensePageAction = (
        <button 
            onClick={() => handleOpenExpenseModal('add')} 
            id="addExpenseBtn" 
            className="btn btn-primary btn-add" // Tus clases existentes
            // disabled se maneja por isProcessingPage en PageHeader,
            // o puedes añadir lógica específica aquí si es necesario
            // disabled={isLoading || isSaving} 
        >
            <i className="fas fa-plus"></i> Añadir Gasto
        </button>
    );

    const displayPeriodForTotal = useMemo(() => {
        if (!isLoading && fixedExpenses.length > 0 && categories.length > 0) { // Solo mostrar si hay datos para calcular
            const now = new Date();
            return now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        }
        return "este mes";
    }, [isLoading, fixedExpenses, categories]);

    return (
        <div style={{ display: 'flex' }}>
            {/* Sidebar */}
            <Sidebar
                // Pasar estado de carga/guardado si quieres deshabilitar botones mientras ocurre algo
                isProcessing={isLoading || isSaving | isLoadingHistory}
            />

            {/* Contenido Principal */}
            <div className="page-container">
                {/* Cabecera */}
                <PageHeader 
                    pageTitle="Gastos Fijos"
                    headerClassName="fixed-expenses-header" // Tu clase específica si la necesitas
                    showSettingsButton={false}             // No mostrar botón de settings aquí
                    isProcessingPage={isLoading || isSaving} // Para deshabilitar botones de PageHeader si es necesario
                    actionButton={fixedExpensePageAction}    // <-- Pasar el botón "Añadir Gasto"
                />

                {/* Resumen Total */}
                <div className="total-summary fixed-expense-total-summary"> {/* Clase específica para estilo */}
                    {/* --- TOTAL CON TOOLTIP --- */}
                    <span className="summary-title-container">
                        Total Fijo Estimado {displayPeriodForTotal}:
                        <span className="tooltip-trigger-container">
                            <i className="fas fa-info-circle tooltip-icon" tabIndex={0}></i>
                            <span className="tooltip-text">
                                Estimación del total de tus gastos fijos activos que vencen o se aplican durante el mes actual.
                            </span>
                        </span>
                    </span>
                    <strong className="summary-amount">
                        {isLoading ? 'Calculando...' : monthlyTotal}
                    </strong>
                    {/* --- FIN TOTAL CON TOOLTIP --- */}
                </div>

                {/* Toggle de Vista */}
                <div className="view-controls-bar">
                    <div className="view-mode-toggle">
                        <button onClick={() => handleViewChange('list')} id="listViewBtn" className={`btn-view ${viewMode === 'list' ? 'active' : ''}`} aria-label="Vista de Lista"> <i className="fas fa-list"></i> Lista </button>
                        <button onClick={() => handleViewChange('calendar')} id="calendarViewBtn" className={`btn-view ${viewMode === 'calendar' ? 'active' : ''}`} aria-label="Vista de Calendario"> <i className="fas fa-calendar-alt"></i> Calendario </button>
                    </div>

                    {viewMode === 'list' && ( 
                        <div className="sort-control fixed-expense-sort">
                            <label htmlFor="fixedExpenseSort">Ordenar por:</label>
                            <select 
                                id="fixedExpenseSort" 
                                value={`${sortConfigFixed.key}_${sortConfigFixed.direction}`} 
                                onChange={handleSortChangeFixed}
                                disabled={isLoading || processedFixedExpensesForList.length === 0}
                            >
                                {FIXED_EXPENSE_SORT_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                 {/* Mensaje General de Error */}
                 {error && !isLoading && (<p className="message page-message error">{error}</p>)}

                {/* Vista Lista */}
                {viewMode === 'list' && (
                    <div id="listViewContainer">
                        <div className="table-container">
                            <table id="fixedExpensesTable" className="data-table">
                                <thead>
                                    <tr>
                                        <th>Descripción</th>
                                        <th>Importe</th>
                                        <th>Categoría</th>
                                        <th>Frecuencia</th>
                                        <th>Próx. Vencimiento</th>
                                        <th>Recordatorio</th>
                                        <th>Activo</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading && (<tr><td colSpan="8" style={{textAlign: 'center'}}>Cargando...</td></tr>)}
                                    {!isLoading && processedFixedExpensesForList.length === 0 && !error && (
                                        <tr><td colSpan="8" style={{textAlign: 'center'}}>
                                            No hay gastos fijos activos que mostrar.
                                            {fixedExpenses.filter(exp => !exp.is_active).length > 0 && " (Algunos están inactivos)"}
                                        </td></tr>
                                    )}
                                    {/* Renderizar la lista usando 'processedFixedExpensesForList' */}
                                    {!isLoading && !error && processedFixedExpensesForList.map(exp => (
                                        <FixedExpenseRow
                                            key={exp.id}
                                            expense={exp}
                                            category={categories.find(c => c.id === exp.category_id)}
                                            onEdit={() => handleOpenExpenseModal('edit', exp)}
                                            onDelete={() => handleDeleteExpense(exp.id, exp.description)}
                                            onToggle={handleToggle}
                                            onViewHistory={() => handleOpenHistoryModal(exp)}
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
                isOpen={isExpenseModalOpen} 
                onClose={handleCloseExpenseModal} 
                onSubmit={handleExpenseFormSubmit}
                mode={modalMode} 
                initialData={selectedExpense}
                accounts={accounts} 
                categories={formattedExpenseCategoriesForModal} // Pasa listas para selects
                isSaving={isSaving} error={modalError}
            />
            <ConfirmationModal // <<< USA COMPONENTE
                isOpen={isConfirmModalOpen}
                onClose={() => { setIsConfirmModalOpen(false); setExpenseToDelete(null); }}
                onConfirm={confirmDeleteHandler} title="Confirmar Eliminación"
                message={`¿Seguro eliminar el gasto fijo "${expenseToDelete?.name || ''}"?`}
                confirmText="Eliminar" cancelText="Cancelar" isDanger={true}
            />

            {viewingHistoryForExpense && (
                <FixedExpenseHistoryModal
                    isOpen={isHistoryModalOpen}
                    onClose={handleCloseHistoryModal}
                    expense={viewingHistoryForExpense}
                    transactions={historyTransactions}
                    isLoading={isLoadingHistory}
                    error={historyError}
                />
            )}

            {/* Botón Scroll-Top */}
            {showScrollTop && ( <button onClick={scrollToTop} id="scrollTopBtn" className="scroll-top-btn visible" title="Volver arriba"><i className="fas fa-arrow-up"></i></button> )}
        </div>
    );
}
export default FixedExpenses;

