/*
Archivo: src/pages/Trips.jsx
Propósito: Componente para gestionar viajes, incluyendo una vista de lista y una de detalle.
*/
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext.jsx';
import Chart from 'chart.js/auto';
import { formatCurrency, formatDate } from '../utils/formatters.js';
import Sidebar from '../components/layout/Sidebar.jsx'; 
//import { getIconForTrip } from '../utils/iconUtils.js'; // Asegúrate que esta función está en utils
import TripCard from '../components/Trips/TripCard.jsx'; // Asume ruta src/components/Trips/
import TripExpenseRow from '../components/Trips/TripExpenseRow.jsx'; // Asume ruta src/components/Trips/
import TripModal from '../components/Trips/TripModal.jsx'; // Asume ruta src/components/Trips/
import TripExpenseModal from '../components/Trips/TripExpenseModal.jsx'; // Asume ruta src/components/Trips/
import toast from 'react-hot-toast';
import ConfirmationModal from '../components/ConfirmationModal.jsx';
import TripSummaryModal from '../components/Trips/TripSummaryModal.jsx';
import '../styles/Trips.scss';
import PageHeader from '../components/layout/PageHeader.jsx';

// Importa imágenes
import defaultAvatar from '../assets/avatar_predeterminado.png';
import emptyMascot from '../assets/monstruo_pixar.png';

const ALL_ACTIVE_STATUS = 'todos_activos'; // Constante para el filtro
// --- Componente Principal ---
function Trips() {
    // --- Estado ---
    const { user, loading: authLoading } = useAuth();
    const [avatarUrl, setAvatarUrl] = useState(defaultAvatar);
    const [viewMode, setViewMode] = useState('list'); // 'list' o 'detail'
    const [trips, setTrips] = useState([]); // Lista de todos los viajes
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTrip, setSelectedTrip] = useState(null); // Viaje seleccionado para detalle/modales
    const [tripExpenses, setTripExpenses] = useState([]); // Gastos del viaje seleccionado
    const [isLoadingTrips, setIsLoadingTrips] = useState(true); // Carga inicial de viajes
    const [isLoadingExpenses, setIsLoadingExpenses] = useState(false); // Carga de gastos en detalle
    const [isLoadingStaticData, setIsLoadingStaticData] = useState(true);
    const [accounts, setAccounts] = useState([]);
    const [expenseCategories, setExpenseCategories] = useState([]);
    const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
    const [itemToProcess, setItemToProcess] = useState(null); // { type: 'trip' | 'expense', id: string, name: string, action?: 'archive' | 'unarchive' }
    const [showArchivedTrips, setShowArchivedTrips] = useState(false);
    const [statusFilter, setStatusFilter] = useState(ALL_ACTIVE_STATUS); // Por defecto muestra todos los activos
    const budgetChartRef = useRef(null);
    const budgetChartInstance = useRef(null);
    const location = useLocation();
    const [initialAction, setInitialAction] = useState(null);

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
    const fetchStaticData = useCallback(async (currentUserId) => {
      setIsLoadingStaticData(true);
      console.log(`Trips: Cargando datos estáticos (perfil, cuentas, categorías) para ${currentUserId}`);
      try {
          const [profileRes, accountsRes, categoriesRes] = await Promise.all([
                supabase.from('profiles').select('avatar_url').eq('id', currentUserId).single(),
                supabase.from('accounts')
                .select('id, name, currency')
                .eq('user_id', currentUserId)
                .eq('is_archived', false)
                .order('name'),
                supabase.from('categories') // Cargar solo categorías de GASTO
                    .select('id, name, icon, color, parent_category_id') // Lo que necesites para el selector
                    .or(`user_id.eq.${currentUserId},is_default.eq.true`)
                    .eq('type', 'gasto')
                    .order('name')
            ]);

            if (!isMounted.current) return;

            if (profileRes.error && profileRes.status !== 406) throw profileRes.error;
            setAvatarUrl(profileRes.data?.avatar_url || defaultAvatar);

            if (accountsRes.error) throw new Error(`Error cargando cuentas: ${accountsRes.error.message}`);
            setAccounts(accountsRes.data || []);

            if (categoriesRes.error) throw new Error(`Error cargando categorías de gasto: ${categoriesRes.error.message}`);
            setExpenseCategories(categoriesRes.data || []);

      } catch (err) {
          console.error("Error loading profile/trips:", err);
          if (isMounted.current) setError(err.message || "Error al cargar viajes.");
      } finally {
          if (isMounted.current) setIsLoadingTrips(false);
      }
    }, [supabase]);

    const fetchTrips = useCallback(async (currentUserId) => {
        if (!isMounted.current) return;
        setIsLoadingTrips(true);
        console.log(`Trips: Cargando TODOS los viajes para ${currentUserId} (activos y archivados)`);
        try {
            const { data, error: tripsError } = await supabase
                .from('trips').select('*') // Incluir nueva columna 'status'
                .eq('user_id', currentUserId)
                .order('is_archived', { ascending: true }) // false (activos) primero
                .order('start_date', { ascending: false, nullsLast: true });

            if (tripsError) throw tripsError;
            if (isMounted.current) setTrips(data || []);

        } catch (err) {
            console.error("Error loading trips:", err);
            if (isMounted.current) setError(prevError => prevError ? `${prevError}\n${err.message}` : err.message);
        } finally {
            if (isMounted.current) setIsLoadingTrips(false);
        }
    }, [supabase, setTrips, setError, setIsLoadingTrips]); // Dependencias de useCallback

    // --- NUEVO: useMemo para formatear las categorías para el selector ---
    const formattedExpenseCategoriesForSelect = useMemo(() => {
        if (!expenseCategories || expenseCategories.length === 0) {
            return [];
        }

        // Separar categorías padre (sin parent_category_id o cuyo padre no está en la lista de gastos)
        // y subcategorías.
        const allCategoryIds = new Set(expenseCategories.map(cat => cat.id));

        const topLevelCategories = expenseCategories.filter(
            cat => !cat.parent_category_id || !allCategoryIds.has(cat.parent_category_id)
        ).sort((a, b) => a.name.localeCompare(b.name)); // Ordenar padres alfabéticamente
        
        const subCategories = expenseCategories.filter(
            cat => cat.parent_category_id && allCategoryIds.has(cat.parent_category_id)
        ).sort((a, b) => a.name.localeCompare(b.name)); // Ordenar hijas alfabéticamente

        const options = [];
        topLevelCategories.forEach(parent => {
            options.push({ 
                id: parent.id, 
                name: parent.name, 
                // Podrías añadir un prefijo si quieres diferenciar visualmente los padres en el select,
                // o usar <optgroup> en el modal. Por ahora, solo el nombre.
            });
            const children = subCategories.filter(sub => sub.parent_category_id === parent.id);
            children.forEach(child => {
                options.push({ 
                    id: child.id, 
                    name: `  ↳ ${child.name}` // Indentación simple con prefijo
                });
            });
        });
        console.log("Categorías formateadas para selector:", options);
        return options;
    }, [expenseCategories]);


    const fetchExpensesForTrip = useCallback(async (currentUserId, tripId) => {
      if (!currentUserId || !tripId) return;
      setIsLoadingExpenses(true); setTripExpenses([]); setError(null); // Limpiar error específico de gastos
      console.log(`Trips: Cargando gastos para viaje ${tripId}`);
      try {
          const { data, error: expensesError } = await supabase
              .from('trip_expenses').select('*, accounts ( name, currency ), categories ( id, name, icon, color )')
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
        if (authLoading) { setIsLoadingTrips(true); setIsLoadingStaticData(true); return; }
        if (!user) { navigate('/login'); return; }
        fetchStaticData(user.id); // Cargar datos estáticos primero o en paralelo
        fetchTrips(user.id);      // Luego o en paralelo los viajes
    }, [user, authLoading, navigate, fetchStaticData, fetchTrips]);

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

    

    const tripSummaryData = useMemo(() => {
        // Este console.log es crucial para ver por qué podría ser null
        console.log('[Trips.jsx] useMemo tripSummaryData: Recalculando. selectedTrip:', selectedTrip, 'tripExpenses:', tripExpenses);
        
        if (!selectedTrip || !tripExpenses ) { // No necesitamos que tripExpenses.length > 0 para el resumen general
            console.log('[Trips.jsx] tripSummaryData: selectedTrip o tripExpenses es null/undefined.');
            return null;
        }
        // Asegurarse que los gastos son del viaje seleccionado actualmente
        const relevantExpenses = tripExpenses.filter(exp => exp.trip_id === selectedTrip.id);

        if (selectedTrip.status !== 'finalizado' && relevantExpenses.length === 0 && tripExpenses.length > 0) {
             // Esto puede pasar si selectedTrip cambió pero tripExpenses aún no se actualizó para ese trip.
             console.warn('[Trips.jsx] tripSummaryData: selectedTrip es finalizado, pero tripExpenses podrían ser de otro viaje o estar vacíos. Esperando posible recarga de gastos.');
             // Podríamos devolver null para esperar, o un estado de carga. Por ahora, dejamos que el modal maneje summaryData null.
        }

        const budget = parseFloat(selectedTrip.budget) || 0;
        let totalSpent = 0;
        const expensesByCategory = {};

        relevantExpenses.forEach(expense => {
            const amount = parseFloat(expense.amount) || 0;
            totalSpent += amount;
            const categoryName = expense.categories?.name || 'Sin Categoría';
            const categoryColor = expense.categories?.color || '#cccccc';
            const categoryIcon = expense.categories?.icon || 'fas fa-question-circle';
            if (expensesByCategory[categoryName]) {
                expensesByCategory[categoryName].total += amount;
            } else {
                expensesByCategory[categoryName] = { total: amount, color: categoryColor, icon: categoryIcon };
            }
        });
        const difference = budget - totalSpent;
        const chartLabels = Object.keys(expensesByCategory);
        const chartDataValues = chartLabels.map(label => expensesByCategory[label].total);
        const chartBackgroundColors = chartLabels.map(label => expensesByCategory[label].color);

        return {
            tripName: selectedTrip.name, destination: selectedTrip.destination,
            startDate: formatDate(selectedTrip.start_date), endDate: formatDate(selectedTrip.end_date),
            budget, totalSpent, difference, expensesByCategory,
            chart: {
                labels: chartLabels,
                datasets: [{ data: chartDataValues, backgroundColor: chartBackgroundColors }]
            }
        };
    }, [selectedTrip, tripExpenses]); // Dependencias correctas

    // --- SEPARAR VIAJES ACTIVOS Y ARCHIVADOS ---
    const { filteredActiveTrips, archivedTrips } = useMemo(() => {
        const active = trips.filter(trip => !trip.is_archived);
        const archived = trips.filter(trip => trip.is_archived);

        let currentlyVisibleActive = [];
        if (statusFilter === ALL_ACTIVE_STATUS) {
            currentlyVisibleActive = active.filter(trip => trip.status === 'planificado' || trip.status === 'en curso');
        } else { // 'planificado', 'en curso', o 'finalizado'
            currentlyVisibleActive = active.filter(trip => trip.status === statusFilter);
        }
        
        // Ordenar los viajes activos filtrados por fecha de inicio descendente
        currentlyVisibleActive.sort((a, b) => {
            if (!a.start_date && !b.start_date) return 0;
            if (!a.start_date) return 1; // nulls/undefined al final
            if (!b.start_date) return -1; // nulls/undefined al final
            return new Date(b.start_date) - new Date(a.start_date);
        });


        console.log("USEMEMO Trips: Filtered Active:", currentlyVisibleActive.length, "Archived:", archived.length, "Filter:", statusFilter);
        return { filteredActiveTrips: currentlyVisibleActive, archivedTrips: archived };
    }, [trips, statusFilter]); // Depende de todos los viajes y del filtro de estado

    // Resumen Footer Lista
    const listSummary = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        let nextDate = null;
        let totalBudgeted = 0;
        let totalSaved = 0;

        const relevantTripsForSummary = trips.filter(trip => 
            !trip.is_archived && (trip.status === 'planificado' || trip.status === 'en curso')
        );

        relevantTripsForSummary.forEach(trip => {
            const isFutureOrActive = !trip.end_date || trip.end_date >= today;
            if (isFutureOrActive) {
                totalBudgeted += parseFloat(trip.budget) || 0;
                totalSaved += parseFloat(trip.saved_amount) || 0;
                if (trip.start_date && trip.start_date >= today) {
                    if (!nextDate || trip.start_date < nextDate) nextDate = trip.start_date;
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
        if (!selectedTrip) return { 
            budget: 0, spent: 0, remaining: 0, 
            formattedBudget: formatCurrency(0), formattedSpent: formatCurrency(0), formattedRemaining: formatCurrency(0), 
            remainingIsPositive: true 
        };
        
        const budgetNum = parseFloat(selectedTrip.budget) || 0;
        // Asegúrate que tripExpenses sean solo del selectedTrip
        const relevantTripExpenses = tripExpenses.filter(exp => exp.trip_id === selectedTrip.id);
        const totalSpentNum = relevantTripExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
        const remainingNum = budgetNum - totalSpentNum;
        
        return {
            budget: budgetNum, // Valor numérico
            spent: totalSpentNum, // Valor numérico
            remaining: remainingNum, // Valor numérico
            formattedBudget: formatCurrency(budgetNum),
            formattedSpent: formatCurrency(totalSpentNum),
            formattedRemaining: formatCurrency(remainingNum),
            remainingIsPositive: remainingNum >= 0
        };
    }, [selectedTrip, tripExpenses]); // Dependencias

    // --- useEffect para crear/actualizar el gráfico de presupuesto ---
    useEffect(() => {
        if (viewMode === 'detail' && selectedTrip && budgetChartRef.current && detailSummary) {
            const ctx = budgetChartRef.current.getContext('2d');
            if (!ctx) return;

            if (budgetChartInstance.current) {
                budgetChartInstance.current.destroy();
            }

            const { budget, spent, remaining, remainingIsPositive } = detailSummary;
            const dataValues = [];
            const backgroundColors = [];
            const labels = [];

            if (budget <= 0 && spent <=0) { // No hay presupuesto ni gastos
                 // Podrías mostrar un gráfico vacío o un mensaje
                 // Por ahora, si no hay datos, no creamos el gráfico o lo limpiamos
                if (budgetChartInstance.current) budgetChartInstance.current.destroy();
                budgetChartInstance.current = null; // Asegurar que se limpia
                return;
            }


            if (spent > 0) {
                dataValues.push(spent);
                backgroundColors.push('rgba(255, 99, 132, 0.7)'); // Rojo para gastado (ejemplo)
                labels.push('Gastado');
            }

            if (remainingIsPositive && remaining > 0) {
                dataValues.push(remaining);
                backgroundColors.push('rgba(75, 192, 192, 0.7)'); // Verde/Azul para restante (ejemplo)
                labels.push('Restante del Presupuesto');
            } else if (!remainingIsPositive && remaining < 0) {
                // Si hay sobrecoste, el 'spent' ya incluye el total.
                // Podríamos no añadir nada más o una sección de "sobrecoste" si se quiere visualizar diferente.
                // Por ahora, el 'spent' será mayor que el 'budget' visualmente.
            }
            
            // Si no hay gastos pero sí presupuesto, mostrar todo el presupuesto como "disponible"
            if (spent === 0 && budget > 0) {
                dataValues.push(budget);
                backgroundColors.push('rgba(54, 162, 235, 0.7)'); // Azul para presupuesto total disponible
                labels.push('Presupuesto Disponible');
            }


            const chartData = {
                labels: labels,
                datasets: [{
                    data: dataValues,
                    backgroundColor: backgroundColors,
                    borderColor: '#fff', // Borde blanco entre segmentos
                    borderWidth: 2,
                    hoverOffset: 4
                }]
            };

            const chartOptions = {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%', // Para hacerlo tipo Doughnut
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { padding: 15, boxWidth: 12 }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) label += ': ';
                                if (context.parsed !== null) label += formatCurrency(context.parsed);
                                return label;
                            }
                        }
                    },
                    title: { // Título opcional del gráfico
                        display: true,
                        text: `Presupuesto: ${detailSummary.formattedBudget}`,
                        padding: { top: 10, bottom: 10 },
                        font: { size: 14, weight: '600' }
                    }
                }
            };

            budgetChartInstance.current = new Chart(ctx, {
                type: 'doughnut',
                data: chartData,
                options: chartOptions
            });
        } else if (budgetChartInstance.current) {
            // Limpiar gráfico si no estamos en detalle o no hay datos
            budgetChartInstance.current.destroy();
            budgetChartInstance.current = null;
        }

        return () => {
            if (budgetChartInstance.current) {
                budgetChartInstance.current.destroy();
                budgetChartInstance.current = null;
            }
        };
    }, [viewMode, selectedTrip, detailSummary]);

    // --- Manejadores Vistas y Modales ---
    const handleViewTripDetail = useCallback((trip) => {
       console.log('[Trips.jsx] handleViewTripDetail: Seleccionando viaje para detalle:', trip?.name);
        setSelectedTrip(trip); 
        setViewMode('detail'); 
        window.scrollTo(0, 0);
    }, [setSelectedTrip, setViewMode]);

    const handleViewTripList = useCallback(() => {
      setSelectedTrip(null); setTripExpenses([]); setViewMode('list'); setError(null); // Limpiar error al cambiar vista
    }, []);

    const handleOpenTripModal = useCallback((mode = 'add', trip = null) => {
      setTripModalMode(mode); setEditingTrip(trip); setModalTripError('');
      setIsSavingTrip(false); setIsTripModalOpen(true);
    }, []);

    const handleCloseTripModal = useCallback(() => setIsTripModalOpen(false), []);

    const handleOpenExpenseModal = useCallback(async (mode = 'add', expense = null, tripContext = null) => {
        const targetTripForModal = tripContext || selectedTrip;
        console.log('[Trips.jsx] handleOpenExpenseModal: Intentando abrir para:', targetTripForModal?.name, 'Status:', targetTripForModal?.status, 'Modo:', mode);

        if (!targetTripForModal?.id) {
        toast.error("Por favor, selecciona un viaje para esta acción.");
        return;
        }

        // Si el viaje está finalizado, no permitir añadir/editar gastos.
        if (targetTripForModal.status === 'finalizado') {
            if (mode === 'add' ) {
                toast.error("No se pueden añadir gastos a un viaje finalizado.");
                return;
            } else if (mode === 'edit') {
                toast.error("No se pueden editar gastos de un viaje finalizado.");
                return;
            }
        }
        
        // Si el tripContext es diferente al selectedTrip actual, actualízalo.
        if (tripContext && selectedTrip?.id !== tripContext.id) {
        setSelectedTrip(tripContext);
        }
        
        setExpenseModalMode(mode); 
        setEditingExpense(expense); 
        setModalExpenseError(''); 
        setIsSavingExpense(false); // Asumo que tienes setIsSavingExpense
        setIsExpenseModalOpen(true);
         console.log('[Trips.jsx] handleOpenExpenseModal: Modal de gasto abierto. Trip ID para modal:', (tripContext || selectedTrip)?.id);
    }, [selectedTrip, setSelectedTrip, setExpenseModalMode, setEditingExpense, setModalExpenseError, setIsSavingExpense, setIsExpenseModalOpen]); // Añade todas las dependencias de estado y setters

    const handleCloseExpenseModal = useCallback(() => setIsExpenseModalOpen(false), []);

    // --- Manejadores CRUD ---

    // Viajes
    const handleTripFormSubmit = useCallback(async (submittedFormData) => {
        if (!user?.id) { toast.error("Error: Usuario no identificado."); return; }
        // Validación básica ya hecha en el modal
        setIsSavingTrip(true); 
        setModalTripError('');
        const toastId = toast.loading(tripModalMode === 'edit' ? 'Actualizando viaje...' : 'Creando viaje...');
        try {
            const dataToSave = {
                name: submittedFormData.name, 
                destination: submittedFormData.destination || null,
                start_date: submittedFormData.start_date || null, 
                end_date: submittedFormData.end_date || null,
                budget: parseFloat(submittedFormData.budget) || 0,
                saved_amount: parseFloat(submittedFormData.saved_amount) || 0,
                notes: submittedFormData.notes || null,
                status: submittedFormData.status || 'planificado'
            };

            let supabaseError;
            let savedTripData = null;

            let error;
            if (tripModalMode === 'edit' && editingTrip?.id) {
                const { data, error } = await supabase.from('trips')
                    .update({ ...dataToSave, updated_at: new Date() })
                    .eq('id', editingTrip.id)
                    .eq('user_id', user.id)
                    .select() // Devuelve los datos actualizados
                    .single(); // Asumimos que actualiza un solo registro
                supabaseError = error;
                if (!error && data) {
                    savedTripData = data;
                }
            } else { // Modo 'add'
                const { data, error } = await supabase.from('trips')
                    .insert([{ ...dataToSave, user_id: user.id, is_archived: false }]) // Nuevos viajes no están archivados
                    .select() // Devuelve el registro insertado
                    .single(); // Asumimos que se inserta un solo registro
                supabaseError = error;
                if (!error && data) {
                    savedTripData = data;
                }
            }
            
            if (supabaseError) throw supabaseError;

            toast.success('¡Viaje guardado!', { id: toastId });
            handleCloseTripModal();
            fetchTrips(user.id); 

            // --- NUEVA LÓGICA PARA SUGERIR META DE AHORRO ---
            if (tripModalMode !== 'edit' && savedTripData && 
                (parseFloat(savedTripData.budget) || 0) > 0 && 
                savedTripData.start_date) {
                
                console.log("Nuevo viaje creado con presupuesto y fecha de inicio:", savedTripData);

                // Usar toast.custom para un mensaje con botones
                // El ID del toast es importante para poder cerrarlo programáticamente
                const suggestionToastId = toast.custom((t) => (
                    <div 
                        className={`custom-toast-container ${t.visible ? 'animate-enter' : 'animate-leave'}`}
                        // Puedes añadir estilos inline o clases para este contenedor
                        style={{
                         background: 'white', // Este estilo inline ganará sobre el SCSS
                         color: '#333',      // Este también
                         padding: '16px',
                         borderRadius: '8px',
                         boxShadow: '0 3px 10px rgba(0,0,0,0.1), 0 3px 3px rgba(0,0,0,0.05)',
                         display: 'flex',
                         flexDirection: 'column',
                         alignItems: 'center',
                         gap: '10px',
                         border: '1px solid'
                     }}
                    >
                        <p className="toast-title">
                            ¡Viaje "{savedTripData.name}" creado!
                        </p>
                        <p className="toast-body">
                            Tiene un presupuesto de {formatCurrency(savedTripData.budget)} y comienza el {formatDate(savedTripData.start_date)}.
                        </p>
                        <p className="toast-question">
                            ¿Quieres crear una meta de ahorro para este viaje?
                        </p>
                        <div className="toast-actions"> {/* Contenedor de acciones */}
                            <button
                                className="btn btn-sm green-btn" // Usa tus clases de botón
                                onClick={() => {
                                    toast.dismiss(suggestionToastId);
                                    navigate('/goals', { 
                                        state: { 
                                            action: 'createFromTrip',
                                            tripName: savedTripData.name,
                                            tripBudget: savedTripData.budget,
                                            tripStartDate: savedTripData.start_date,
                                            // tripRelatedAccountId: savedTripData.related_account_id || null 
                                        }
                                    });
                                }}
                            >
                                Sí, crear meta
                            </button>
                            <button
                                className="btn btn-sm btn-secondary" // Usa tus clases de botón
                                onClick={() => toast.dismiss(suggestionToastId)}
                            >
                                No, gracias
                            </button>
                        </div>
                    </div>
                ), {
                    duration: 20000, // Duración del toast en ms (15 segundos) o hasta que se interactúe
                    position: 'top-center', // Posición del toast
                });
            }

        } catch (err) {
            console.error('Error saving trip:', err);
            setModalTripError(`Error: ${err.message}`);
            toast.error(`Error: ${err.message}`, { id: toastId });
        } finally { setIsSavingTrip(false); }
      }, [user, tripModalMode, editingTrip, supabase, handleCloseTripModal, fetchTrips, navigate, setModalTripError, setIsSavingTrip]);

    // Gastos Viaje
    const handleExpenseFormSubmit = useCallback(async (submittedFormData) => {
      if (!user?.id || !selectedTrip?.id) { toast.error("Error inesperado."); return; }
      if (!submittedFormData.accountId) { // Validar que la cuenta fue seleccionada
        setModalExpenseError("Por favor, selecciona una cuenta de origen para el gasto.");
        return;
      }
      if (!submittedFormData.categoryId) {
        setModalExpenseError("Por favor, selecciona una categoría para el gasto.");
        return;
      }
      // Validación básica ya hecha en el modal
      setIsSavingExpense(true); 
      setModalExpenseError('');
      const toastId = toast.loading(expenseModalMode === 'edit' ? 'Actualizando gasto...' : 'Añadiendo gasto...');
      try {
        const expenseAmount = parseFloat(submittedFormData.amount);
        const expenseDataForTripTable = { // Datos para la tabla trip_expenses
            description: submittedFormData.description,
            amount: expenseAmount,
            expense_date: submittedFormData.expense_date,
            category_id: submittedFormData.categoryId, // Sigue siendo texto por ahora
            notes: submittedFormData.notes || null,
            account_id: submittedFormData.accountId, // Guardar la cuenta
            // user_id y trip_id se añaden abajo
        };

        //let dbError;
        //let transactionId = null; // Para guardar el ID de la transacción si se edita

        if (expenseModalMode === 'edit' && editingExpense?.id) {
            // MODO EDICIÓN
            // 1. Actualizar el registro en trip_expenses
            const { error: updateTripExpenseError } = await supabase.from('trip_expenses')
                .update({ ...expenseDataForTripTable, updated_at: new Date() })
                .eq('id', editingExpense.id)
                .eq('user_id', user.id)
                .eq('trip_id', selectedTrip.id);
            
            if (updateTripExpenseError) throw updateTripExpenseError;

            const { error: updateTransactionError } = await supabase
                    .from('transactions')
                    .update({
                        account_id: submittedFormData.accountId,
                        category_id: submittedFormData.categoryId,
                        description: `Viaje: ${selectedTrip.name || 'Viaje'} - ${submittedFormData.description}`,
                        amount: -Math.abs(expenseAmount), // Asegurar que sigue siendo negativo
                        transaction_date: submittedFormData.expense_date,
                        notes: submittedFormData.notes || null,
                        updated_at: new Date(), // Actualizar también el timestamp de la transacción
                        // El 'type' (gasto) y 'related_trip_id' no deberían cambiar al editar el gasto.
                    })
                    .eq('related_trip_expense_id', editingExpense.id) // <-- CLAVE para encontrar la transacción correcta
                    .eq('user_id', user.id); // Seguridad adicional

                if (updateTransactionError) {
                    // Si falla la actualización de la transacción, ¿qué hacemos?
                    // Podríamos mostrar un warning, pero el trip_expense ya se actualizó.
                    // Es una situación delicada. Por ahora, logueamos y continuamos.
                    console.warn("Error actualizando la transacción principal asociada al gasto del viaje:", updateTransactionError);
                    toast.error("Gasto del viaje actualizado, pero hubo un problema actualizando la transacción principal. Revísala manualmente.", { duration: 6000 });
                }
        } else {
            // MODO AÑADIR
            // 1. Insertar en trip_expenses
            const { data: newTripExpense, error: insertTripExpenseError } = await supabase.from('trip_expenses')
                .insert([{ 
                    ...expenseDataForTripTable, 
                    user_id: user.id, 
                    trip_id: selectedTrip.id 
                }])
                .select('id') // Para obtener el ID del nuevo gasto
                .single(); // Asumimos que se inserta uno solo

            if (insertTripExpenseError) throw insertTripExpenseError;
            if (!newTripExpense) throw new Error("No se pudo obtener el nuevo gasto de viaje creado.");

            // 2. Crear la transacción real en la tabla 'transactions'
            const transactionData = {
                user_id: user.id,
                account_id: submittedFormData.accountId,
                category_id: submittedFormData.categoryId, // Si cambias 'category' a un selector de ID
                description: `Viaje: ${selectedTrip.name || 'Viaje'} - ${submittedFormData.description}`,
                amount: -Math.abs(expenseAmount), // Los gastos son negativos
                transaction_date: submittedFormData.expense_date,
                type: 'gasto',
                notes: submittedFormData.notes || null,
                related_trip_id: selectedTrip.id, // Enlazar la transacción al viaje
                related_trip_expense_id: newTripExpense.id, // Opcional: enlazar al gasto específico del viaje
                // Si tu tabla 'transactions' no tiene 'related_trip_id', necesitarás añadirla.
            };
            const { error: insertTransactionError } = await supabase
                .from('transactions')
                .insert([transactionData]);

            if (insertTransactionError) {
                // Si falla la transacción, ¿deberíamos borrar el trip_expense? (Rollback manual)
                console.error("Error insertando transacción, intentando borrar trip_expense:", newTripExpense.id);
                await supabase.from('trip_expenses').delete().eq('id', newTripExpense.id);
                throw new Error(`Error al crear la transacción: ${insertTransactionError.message}. Gasto del viaje no guardado.`);
            }
        }
        
        toast.success('¡Gasto del viaje guardado!', { id: toastId });
        handleCloseExpenseModal();
        fetchExpensesForTrip(user.id, selectedTrip.id); // Recargar gastos del viaje
        // Considera también recargar saldos de cuentas si es necesario mostrarlo en esta página

      } catch (err) {
          console.error('Error saving trip expense:', err);
          setModalExpenseError(`Error: ${err.message}`);
          toast.error(`Error: ${err.message}`, { id: toastId });
      } finally { setIsSavingExpense(false); }
      }, [user, selectedTrip, expenseModalMode, editingExpense, supabase, handleCloseExpenseModal, fetchExpensesForTrip]);

    const handleDeleteTripExpense = (expenseId, expenseDescription) => {
        if (!expenseId) {
            console.error("handleDeleteTripExpense: Se intentó eliminar un gasto sin ID.");
            toast.error("No se puede eliminar el gasto, falta información.");
            return;
        }
        // Usar "este gasto" como un nombre por defecto más claro si la descripción está vacía o es nula
        const displayName = expenseDescription?.trim() || "este gasto"; 
        
        const newItem = { 
            type: 'expense', 
            id: expenseId, 
            name: displayName, 
            action: 'delete' // Añadir la acción para que confirmProcessItemHandler sepa qué hacer
        };
        console.log("handleDeleteTripExpense: Configurando itemToProcess:", newItem);
        setItemToProcess(newItem);
        setIsConfirmModalOpen(true);
    };

    // --- MANEJADORES PARA ARCHIVAR/DESARCHIVAR VIAJES ---
    const handleArchiveTrip = (trip) => {
        // No permitir archivar si tiene gastos y no está finalizado? O permitir siempre?
        // Por ahora, permitimos archivar.
        setItemToProcess({ type: 'trip', id: trip.id, name: trip.name, action: 'archive' });
        setIsConfirmModalOpen(true);
    };

    const handleUnarchiveTrip = (trip) => {
        setItemToProcess({ type: 'trip', id: trip.id, name: trip.name, action: 'unarchive' });
        setIsConfirmModalOpen(true);
    };

      // --- NUEVOS MANEJADORES PARA EL MODAL DE RESUMEN ---
    const handleOpenSummaryModal = useCallback(async (tripToSummarize) => {
        console.log('[Trips.jsx] handleOpenSummaryModal: Intentando abrir para trip:', tripToSummarize?.name, 'Status:', tripToSummarize?.status);

        if (!tripToSummarize || tripToSummarize.status !== 'finalizado') {
            console.error("[Trips.jsx] handleOpenSummaryModal: Condición no cumplida. Viaje:", tripToSummarize);
            toast.error("El resumen solo está disponible para viajes finalizados.");
            return;
        }

        setSelectedTrip(tripToSummarize); // Establece el viaje seleccionado

        // Forzar la carga de gastos para este viaje específico si no están ya cargados para él
        // o si tripExpenses está vacío.
        if (!tripExpenses.length || tripExpenses[0].trip_id !== tripToSummarize.id) {
            console.log(`[Trips.jsx] handleOpenSummaryModal: Gastos no son del viaje actual o están vacíos. Recargando para ${tripToSummarize.id}`);
            await fetchExpensesForTrip(user.id, tripToSummarize.id);
        } else {
             console.log(`[Trips.jsx] handleOpenSummaryModal: Gastos ya parecen ser del viaje actual para ${tripToSummarize.id}`);
        }
        
        // Ahora que selectedTrip está (o debería estar) actualizado y los gastos (re)cargados,
        // tripSummaryData se recalculará. Abrimos el modal.
        setIsSummaryModalOpen(true);
        console.log("[Trips.jsx] handleOpenSummaryModal: isSummaryModalOpen -> true para:", tripToSummarize.name);

    }, [user?.id, setSelectedTrip, fetchExpensesForTrip, tripExpenses, setIsSummaryModalOpen]); // Dependencias

    const handleCloseSummaryModal = useCallback(() => {
        setIsSummaryModalOpen(false);
    }, [setIsSummaryModalOpen]);

    // --- NUEVO useEffect PARA MANEJAR LA ACCIÓN INICIAL DESDE LA NAVEGACIÓN ---
    useEffect(() => {
        console.log("[Trips.jsx] useEffect location.state listener: location.state actual:", location.state);
        if (location.state?.tripIdToOpen && location.state?.action) {
            const { tripIdToOpen, action } = location.state;
            console.log(`[Trips.jsx] Acción recibida por navegación: ${action} para tripId: ${tripIdToOpen}`);
            
            // Guardar la acción para procesarla después de que los datos se carguen
            setInitialAction({ tripId: tripIdToOpen, action });

            // Limpiar el estado de la navegación para que no se vuelva a ejecutar en re-renders
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, navigate, setInitialAction]);

    // --- NUEVO useEffect PARA PROCESAR LA ACCIÓN INICIAL CUANDO LOS DATOS ESTÉN LISTOS ---
    useEffect(() => {
    console.log("[Trips.jsx] useEffect initialAction listener: initialAction:", initialAction, "isLoadingTrips:", isLoadingTrips, "trips.length:", trips ? trips.length : 'undefined/null');

        // Si no hay acción pendiente, no hacer nada.
        if (!initialAction) {
            return; 
        }

        // Si los datos de viajes aún están cargando, no hacer nada y esperar.
        // El efecto se volverá a ejecutar cuando isLoadingTrips o trips cambien.
        if (isLoadingTrips) {
            console.log("[Trips.jsx] useEffect initialAction: Hay initialAction pero los viajes aún están cargando (isLoadingTrips). Esperando...");
            return;
        }

        // En este punto, initialAction existe y isLoadingTrips es false.
        // Ahora verificamos si tenemos viajes en la lista.
        if (trips && trips.length > 0) {
            const tripToProcess = trips.find(t => t.id === initialAction.tripId);
            console.log("[Trips.jsx] useEffect initialAction: Datos de viajes listos. Buscando tripToProcess. Encontrado:", tripToProcess);

            if (tripToProcess) {
                console.log(`[Trips.jsx] Procesando acción inicial para viaje: ${tripToProcess.name}. Cambiando a vista de detalle y seteando selectedTrip.`);
                setSelectedTrip(tripToProcess); 
                setViewMode('detail');      

                if (initialAction.action === 'viewSummary' && tripToProcess.status === 'finalizado') {
                    console.log("[Trips.jsx] Acción es 'viewSummary' y viaje está finalizado. Llamando a handleOpenSummaryModal.");
                    setTimeout(() => { // setTimeout para permitir que la UI se actualice a 'detail'
                        handleOpenSummaryModal(tripToProcess);
                    }, 100); // Ajusta este delay si es necesario, o considera un estado de "abrir modal pendiente"
                } else if (initialAction.action === 'viewSummary' && tripToProcess.status !== 'finalizado') {
                    console.warn(`[Trips.jsx] Se intentó ver resumen para viaje ${tripToProcess.name} pero su estado es ${tripToProcess.status}`);
                    toast.info(`El viaje "${tripToProcess.name}" aún no ha finalizado. Mostrando detalles.`);
                }
                // Aquí podrías añadir más acciones, ej: 'addExpenseDirectly'
            } else {
                console.warn(`[Trips.jsx] Viaje con ID ${initialAction.tripId} no encontrado en la lista de viajes cargada (allTrips).`);
                toast.error("No se pudo encontrar el viaje especificado en la notificación (ID no coincide).");
            }
        } else { // initialAction existe, isLoadingTrips es false, pero trips está vacío.
            console.warn(`[Trips.jsx] useEffect initialAction: Hay initialAction, carga de viajes finalizada, pero la lista de viajes está vacía. No se encontró el viaje ID: ${initialAction.tripId}`);
            toast.error("No se encontró el viaje de la notificación (lista de viajes vacía).");
        }

        // Limpiar la acción después de procesarla o determinar que no se puede procesar.
        setInitialAction(null);

    // Las dependencias son cruciales. Cuando 'trips' cambie (de vacío a poblado) o 'isLoadingTrips' cambie,
    // y si 'initialAction' tiene un valor, este efecto se re-evaluará.
    // 'user' se añade porque fetchExpensesForTrip (llamado indirectamente por handleOpenSummaryModal) lo usa.
    }, [initialAction, trips, isLoadingTrips, user, setSelectedTrip, setViewMode, handleOpenSummaryModal, setInitialAction, navigate, toast]);  

      // Handler Confirmación General
    const confirmProcessItemHandler = useCallback(async () => {
        console.log("[confirmProcessItemHandler] Iniciando. itemToProcess:", JSON.parse(JSON.stringify(itemToProcess || {})));
        if (!itemToProcess || !user?.id) { toast.error("Error interno al procesar."); return; }

        const { type, id, name, action } = itemToProcess; // action puede ser 'archive', 'unarchive', o 'delete' (para gastos)
        setIsConfirmModalOpen(false);
        
        let toastMessageLoading = '';
        if (type === 'trip') {
            toastMessageLoading = action === 'archive' ? `Archivando viaje "${name}"...` : `Desarchivando viaje "${name}"...`;
        } else if (type === 'expense' && action === 'delete') {
            toastMessageLoading = `Eliminando gasto "${name}"...`;
        } else {
            toast.error("Acción desconocida."); setItemToProcess(null); return;
        }
        const toastId = toast.loading(toastMessageLoading);

        try {
            let primaryError;
            if (type === 'trip' && (action === 'archive' || action === 'unarchive')) {
                const updateData = action === 'archive' 
                    ? { is_archived: true, archived_at: new Date() }
                    : { is_archived: false, archived_at: null };
                
                const { error: tripProcessError } = await supabase.from('trips')
                    .update(updateData)
                    .eq('user_id', user.id).eq('id', id);
                primaryError = tripProcessError;

            } else if (type === 'expense' && action === 'delete') {
                // Eliminar transacción principal asociada
                const { error: txDelError } = await supabase.from('transactions')
                    .delete().eq('related_trip_expense_id', id).eq('user_id', user.id);
                if (txDelError) console.warn("Advertencia: No se pudo eliminar la transacción principal asociada al gasto del viaje:", txDelError);
                
                // Eliminar el trip_expense
                const { error: expenseDelError } = await supabase.from('trip_expenses').delete()
                    .eq('user_id', user.id).eq('id', id);
                primaryError = expenseDelError;
            }

            if (primaryError) throw primaryError;

            let successMessage = '';
            if (type === 'trip') {
                successMessage = `Viaje "${name}" ${action === 'archive' ? 'archivado' : 'desarchivado'}.`;
            } else if (type === 'expense' && action === 'delete') {
                successMessage = `Gasto "${name}" eliminado.`;
            }
            toast.success(successMessage, { id: toastId });
            
            // Recargar datos
            if (type === 'trip') {
                fetchTrips(user.id); // Recargar lista de viajes
                if (selectedTrip?.id === id && action === 'archive') {
                    // Si el viaje archivado era el seleccionado, podríamos volver a la lista
                    // o simplemente dejar que se oculte si la vista de detalle no muestra archivados.
                    // Por ahora, si se archiva el viaje actual, volvemos a la lista.
                    handleViewTripList(); 
                }
            } else if (selectedTrip?.id) {
                fetchExpensesForTrip(user.id, selectedTrip.id);
            }

        } catch (err) {
            console.error(`Error procesando ${type} (${action}):`, err);
            toast.error(`Error: ${err.message}`, { id: toastId });
        } finally {
            setItemToProcess(null);
        }
    }, [user, itemToProcess, supabase, fetchTrips, fetchExpensesForTrip, selectedTrip, handleViewTripList, setIsConfirmModalOpen, setItemToProcess]);

    const handleBack = useCallback(() => {
      if (viewMode === 'detail') handleViewTripList();
      else navigate(-1);
    }, [viewMode, navigate, handleViewTripList]);
    const scrollToTop = useCallback(() => window.scrollTo({ top: 0, behavior: 'smooth' }), []);

    const currentPageTitle = useMemo(() => {
        return viewMode === 'list' ? 'Mis Viajes' : (selectedTrip?.name || 'Detalle Viaje');
    }, [viewMode, selectedTrip]);

    const currentActionButton = useMemo(() => {
        if (viewMode === 'list') {
            return (
                <button 
                    onClick={() => handleOpenTripModal('add')} 
                    id="addTripBtn" 
                    className="btn btn-primary btn-add orange-btn" 
                    disabled={isLoadingTrips || isSavingTrip} // Usar los estados relevantes
                >
                    <i className="fas fa-plus"></i> Añadir Viaje
                </button>
            );
        } else if (viewMode === 'detail' && selectedTrip) {
            if (selectedTrip.status !== 'finalizado') {
                return (
                    <button 
                        onClick={() => handleOpenExpenseModal('add', null, selectedTrip)} 
                        id="addTripExpenseBtnDetail" 
                        className="btn btn-primary btn-add btn-sm" 
                        disabled={isSavingExpense || isLoadingStaticData}
                    >
                        <i className="fas fa-plus"></i> Añadir Gasto
                    </button>
                );
            } else {
                return (
                    <button 
                        onClick={() => handleOpenSummaryModal(selectedTrip)} 
                        id="viewTripSummaryBtnDetail" 
                        className="btn btn-info btn-sm" 
                        disabled={isLoadingExpenses || isSavingExpense}
                    >
                        <i className="fas fa-chart-pie"></i> Ver Resumen
                    </button>
                );
            }
        } else if (viewMode === 'detail' && !selectedTrip) {
            // Espaciador si estamos en modo detalle pero no hay viaje seleccionado (ej. cargando)
            return <div style={{ width: '120px' /* o el ancho de tus botones */ }}></div>;
        }
        return null; // No mostrar botón de acción si no es list ni detail con viaje
    }, [viewMode, selectedTrip, isLoadingTrips, isSavingTrip, isSavingExpense, isLoadingStaticData, isLoadingExpenses, handleOpenTripModal, handleOpenExpenseModal, handleOpenSummaryModal]);

    // --- Renderizado ---
    return (
        <div style={{ display: 'flex' }}>

            {/* --- Sidebar --- */}
            <Sidebar
            // Pasar estado de carga/guardado si quieres deshabilitar botones mientras ocurre algo
            // Ajusta 'isLoading' y 'isSaving' a los estados de carga/guardado más relevantes
            isProcessing={isLoadingTrips || isLoadingStaticData || isSavingTrip || isSavingExpense}
        />
            

            {/* --- Contenido Principal --- */}
            <div className="page-container">
                {/* --- Cabecera --- */}
                <PageHeader 
                    pageTitle={currentPageTitle}
                    headerClassName="trips-header" // Tu clase específica
                    showSettingsButton={false}
                    // El botón de volver de PageHeader usará navigate(-1).
                    // Si necesitas una lógica más compleja para volver de 'detail' a 'list',
                    // podrías necesitar un onBack prop en PageHeader o manejarlo fuera.
                    // showBackButton={viewMode === 'list'} // Ocultar botón de PageHeader si estás en detalle y manejas la vuelta tú
                    isProcessingPage={isLoadingTrips || isSavingTrip || isSavingExpense || isLoadingStaticData || isLoadingExpenses}
                    actionButton={currentActionButton}
                />
                <div style={{ textAlign: 'center', marginBottom: '1rem', paddingRight: 'var(--page-padding, 20px)' }}> {/* Añadido padding para alinear con filtros si los tienes */}
                    <button 
                        onClick={() => setShowArchivedTrips(prev => !prev)} 
                        className="btn btn-secondary btn-sm"
                    >
                        {showArchivedTrips ? 'Ocultar Viajes Archivados' : 'Mostrar Viajes Archivados'}
                    </button>
                </div>

              {/* Mensaje General (Error de carga, etc.) */}
              {error && !isLoadingTrips && !isLoadingExpenses && ( // Mostrar solo si no hay carga activa
                  <p className={`message page-message error`}>{error}</p>
              )}

                {/* --- Vista Lista --- */}
                {viewMode === 'list' && (
                    <div id="tripsListView" className="view active">
                        {/* --- NUEVO: BOTONES DE FILTRO DE ESTADO --- */}
                        {!showArchivedTrips && ( // Solo mostrar filtros de estado si NO estamos viendo los archivados
                            <div className="status-filters-container">
                                <button 
                                    onClick={() => setStatusFilter(ALL_ACTIVE_STATUS)}
                                    className={`btn btn-filter ${statusFilter === ALL_ACTIVE_STATUS ? 'active' : ''}`}
                                >
                                    Activos
                                </button>
                                <button 
                                    onClick={() => setStatusFilter('planificado')}
                                    className={`btn btn-filter ${statusFilter === 'planificado' ? 'active' : ''}`}
                                >
                                    Planificados
                                </button>
                                <button 
                                    onClick={() => setStatusFilter('en curso')}
                                    className={`btn btn-filter ${statusFilter === 'en curso' ? 'active' : ''}`}
                                >
                                    En Curso
                                </button>
                                <button 
                                    onClick={() => setStatusFilter('finalizado')}
                                    className={`btn btn-filter ${statusFilter === 'finalizado' ? 'active' : ''}`}
                                >
                                    Finalizados
                                </button>
                            </div>
                        )}
                    <div id="tripListContainer" className="trip-list"> {/* Asegúrate que esta clase no interfiera con el centrado */}
                        {isLoadingTrips && <p style={{ textAlign: 'center', width: '100%' }}>Cargando viajes...</p>}
                        
                        {/* Mostrar viajes activos filtrados */}
                        {!isLoadingTrips && !showArchivedTrips && filteredActiveTrips.length > 0 && (
                            filteredActiveTrips.map(trip => (
                                <TripCard
                                    key={trip.id} trip={trip}
                                    onViewDetail={handleViewTripDetail}
                                    onEdit={() => handleOpenTripModal('edit', trip)}
                                    onArchive={() => handleArchiveTrip(trip)} // O la prop que uses para archivar
                                    onAddExpense={handleOpenExpenseModal}
                                    onViewSummary={handleOpenSummaryModal}
                                />
                            ))
                        )}

                        {/* Mensaje si no hay viajes activos que coincidan con el filtro */}
                        {!isLoadingTrips && !showArchivedTrips && filteredActiveTrips.length === 0 && !error && (
                            <div id="noActiveFilteredTripsMessage" className="empty-list-message">
                                <img src={emptyMascot} alt="Mascota FinAi Viajera" className="empty-mascot" />
                                <p>No hay viajes que coincidan con el filtro "{statusFilter.replace('_', ' ')}".</p>
                                
                                {/* --- CONTENEDOR PARA LOS BOTONES CENTRADOS Y LADO A LADO --- */}
                                <div className="empty-list-actions"> 
                                    {statusFilter !== ALL_ACTIVE_STATUS && (
                                        <button 
                                            onClick={() => setStatusFilter(ALL_ACTIVE_STATUS)} 
                                            className="btn blue-btn" // Usa tus clases de botón
                                        >
                                            Mostrar todos los activos
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => handleOpenTripModal('add')} 
                                        className="btn btn-primary orange-btn" // Usa tus clases de botón
                                        // Ajuste de estilo si solo este botón es visible
                                        style={{ marginLeft: statusFilter === ALL_ACTIVE_STATUS ? '0' : undefined }}
                                    >
                                        <i className="fas fa-plus"></i> Registrar Nuevo Viaje
                                    </button>
                                </div>
                                {/* --- FIN CONTENEDOR DE BOTONES --- */}
                            </div>
                        )}
                        
                        {/* Sección Viajes Archivados */}
                        {showArchivedTrips && (
                            <>
                                <h2 className="content-section-header" style={{marginTop: '2rem', gridColumn: '1 / -1'}}>Viajes Archivados</h2>
                                {isLoadingTrips && <p style={{ textAlign: 'center', width: '100%' }}>Cargando...</p>}
                                {!isLoadingTrips && archivedTrips.length === 0 && (
                                    <p className="empty-list-message small-empty" style={{gridColumn: '1 / -1'}}>No tienes viajes archivados.</p>
                                )}
                                {/* El div .trip-list aquí es para las tarjetas archivadas */}
                                <div id="archivedTripListContainer" className="trip-list archived"> 
                                    {archivedTrips.map(trip => (
                                        <TripCard
                                            key={trip.id} trip={trip}
                                            onViewDetail={handleViewTripDetail}
                                            onUnarchive={() => handleUnarchiveTrip(trip)}
                                            onViewSummary={handleOpenSummaryModal} 
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                        </div>
                        {/* --- FIN SECCIÓN VIAJES ARCHIVADOS --- */}
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
                         {/* --- NUEVO: Contenedor para el Gráfico de Presupuesto --- */}
                            {(detailSummary.budget > 0 || detailSummary.spent > 0) && ( // Solo mostrar si hay presupuesto o gastos
                                <div className="trip-budget-chart-container">
                                    {/* <h4>Progreso del Presupuesto</h4> // Título opcional, ya lo tiene el gráfico */}
                                    <div className="chart-wrapper" style={{ position: 'relative', height: '250px', width: '100%', maxWidth: '350px', margin: '0 auto' }}>
                                        <canvas ref={budgetChartRef}></canvas>
                                    </div>
                                </div>
                            )}
                         {/* --- NUEVO: MOSTRAR NOTAS DEL VIAJE --- */}
                            {selectedTrip.notes && (
                                <div className="trip-detail-notes">
                                    <h4>Notas del Viaje:</h4>
                                    <p>{selectedTrip.notes}</p>
                                </div>
                            )}
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
                                                key={exp.id} 
                                                expense={exp}
                                                actionsDisabled={selectedTrip?.status === 'finalizado'}
                                                onEdit={() => handleOpenExpenseModal('edit', exp, selectedTrip)} // Pasar selectedTrip como contexto
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
              isOpen={isExpenseModalOpen} 
              onClose={handleCloseExpenseModal} 
              onSubmit={handleExpenseFormSubmit}
              mode={expenseModalMode} 
              initialData={editingExpense} 
              tripId={selectedTrip?.id} // Pasa tripId si existe
              accounts={accounts} // <-- PASAR CUENTAS
              expenseCategories={formattedExpenseCategoriesForSelect}
              isSaving={isSavingExpense} 
              error={modalExpenseError}
          />
            <TripSummaryModal
                isOpen={isSummaryModalOpen} 
                onClose={handleCloseSummaryModal} 
                summaryData={tripSummaryData} 
          />

          <ConfirmationModal
                    isOpen={isConfirmModalOpen}
                    onClose={() => { setIsConfirmModalOpen(false); setItemToProcess(null); }}
                    onConfirm={confirmProcessItemHandler} // Usa el nuevo handler
                    title={
                        itemToProcess?.type === 'trip' ? 
                        (itemToProcess.action === 'archive' ? "Confirmar Archivado de Viaje" : "Confirmar Desarchivado de Viaje") :
                        "Confirmar Eliminación de Gasto" // Para gastos, sigue siendo eliminación
                    }
                    message={
                        itemToProcess?.type === 'trip' ? 
                        (itemToProcess.action === 'archive' 
                            ? `¿Seguro que quieres archivar el viaje "${itemToProcess?.name || ''}"? No podrás añadirle gastos pero seguirá en tu historial.`
                            : `¿Seguro que quieres desarchivar el viaje "${itemToProcess?.name || ''}"? Volverá a estar activo.`)
                        : `¿Seguro que quieres eliminar el gasto "${itemToProcess?.name || ''}"? Esta acción también eliminará la transacción asociada.`
                    }
                    confirmText={
                        itemToProcess?.type === 'trip' ? 
                        (itemToProcess.action === 'archive' ? "Archivar Viaje" : "Desarchivar Viaje") :
                        "Eliminar Gasto"
                    }
                    cancelText="Cancelar"
                    isDanger={itemToProcess?.type === 'trip' ? itemToProcess.action === 'archive' : true} // Peligro para archivar y eliminar gasto
                />

          {/* Botón Scroll-Top */}
          {showScrollTop && ( <button onClick={scrollToTop} id="scrollTopBtn" className="scroll-top-btn visible" title="Volver arriba"> <i className="fas fa-arrow-up"></i> </button> )}
      </div>
  );
}

export default Trips;
