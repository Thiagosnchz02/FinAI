/*
Archivo: src/pages/Dashboard.jsx
Propósito: Componente principal del panel de control del usuario,
          integrando la carga de datos de widgets y manejo de modales.
*/
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient'; // Importa cliente Supabase

// Importa imágenes
import finAiLogo from '../assets/Logo_FinAI_Oficial.png';
import defaultAvatar from '../assets/avatar_predeterminado.png';
// Importar mascota si se usa

// --- Funciones de Utilidad --- (Mover a /utils)
const formatCurrency = (value, currency = 'EUR') => {
    if (isNaN(value) || value === null || value === undefined) return '€0.00'; // Default a 0.00
    const numberValue = Number(value);
    if (isNaN(numberValue)) return '€0.00';
    try {
        return new Intl.NumberFormat('es-ES', { style: 'currency', currency: currency, minimumFractionDigits: 2 }).format(numberValue);
    } catch (e) { return `${numberValue.toFixed(2)} ${currency}`; }
};
const formatDate = (dateString, options = { day: 'numeric', month: 'short' }) => {
  if (!dateString) return '';
  try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      // Corregir posible problema zona horaria al mostrar solo fecha
      const offset = date.getTimezoneOffset();
      const adjustedDate = new Date(date.getTime() + (offset*60*1000));
      return new Intl.DateTimeFormat('es-ES', options).format(adjustedDate);
  } catch (e) { return ''; }
};
const timeAgo = (timestamp) => {
  if (!timestamp) return '';
  const now = new Date();
  const past = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInSeconds < 60) return `hace ${diffInSeconds} seg`;
  if (diffInMinutes < 60) return `hace ${diffInMinutes} min`;
  if (diffInHours < 24) return `hace ${diffInHours} h`;
  if (diffInDays === 1) return `ayer`;
  if (diffInDays < 7) return `hace ${diffInDays} días`;
  return past.toLocaleDateString('es-ES'); // Formato fecha si es más antiguo
};
const getIconClass = (iconKeyword) => {
  // Mapeo completo de iconos (ejemplo)
  const iconMap = {
      'nomina': 'fas fa-money-check-alt', 'salario': 'fas fa-money-check-alt',
      'freelance': 'fas fa-briefcase', 'negocio': 'fas fa-store',
      'regalo recibido': 'fas fa-gift', 'otros ingresos': 'fas fa-dollar-sign',
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
      'spotify': 'fab fa-spotify', // Requiere FA Brands
      'salud': 'fas fa-heartbeat', 'medico': 'fas fa-stethoscope', 'farmacia': 'fas fa-pills',
      'gimnasio': 'fas fa-dumbbell', 'deporte': 'fas fa-running',
      'regalos': 'fas fa-gift', 'donacion': 'fas fa-hand-holding-heart',
      'educacion': 'fas fa-graduation-cap', 'cursos': 'fas fa-chalkboard-teacher',
      'mascotas': 'fas fa-paw',
      'viajes': 'fas fa-plane-departure', 'vacaciones': 'fas fa-umbrella-beach',
      'tasas': 'fas fa-gavel', 'impuestos': 'fas fa-landmark',
      'inversion': 'fas fa-chart-line',
      'otros gastos': 'fas fa-question-circle',
      'transferencia': 'fas fa-exchange-alt', // Icono para transferencias
      'default': 'fas fa-tag'
  };
  return iconMap[iconKeyword?.toLowerCase()] || (iconKeyword?.startsWith('fa') ? iconKeyword : 'fas fa-tag');
};
const getNotificationIcon = (type) => {
  switch (type) {
      case 'recordatorio_gasto_fijo': return 'fas fa-calendar-alt icon recordatorio_gasto_fijo';
      case 'presupuesto_excedido': return 'fas fa-exclamation-triangle icon presupuesto_excedido';
      case 'meta_alcanzada': return 'fas fa-trophy icon meta_alcanzada';
      default: return 'fas fa-info-circle icon';
  }
};
// --- Fin Funciones de Utilidad ---


function Dashboard() {
    // --- Estado del Componente ---
    const [userId, setUserId] = useState(null);
    const [userName, setUserName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState(defaultAvatar);
    const [isLoading, setIsLoading] = useState(true); // Carga general inicial
    const [error, setError] = useState(null);

    // Estado para cada widget/panel (simplificado)
    const [summaryData, setSummaryData] = useState({ totalBalance: 'Calculando...', variableRemaining: 'Calculando...', variablePercentage: 0, progressBarColor: '#eee' });
    const [budgetSummary, setBudgetSummary] = useState({ loading: true, items: [] });
    const [upcomingPayments, setUpcomingPayments] = useState({ loading: true, items: [] });
    const [goalsProgress, setGoalsProgress] = useState({ loading: true, items: [], hasMore: false });
    const [recentActivity, setRecentActivity] = useState({ loading: true, items: [] });
    const [debtsSummary, setDebtsSummary] = useState({ loading: true, items: [], hasMore: false });
    const [loansSummary, setLoansSummary] = useState({ loading: true, items: [], hasMore: false });
    const [nextTripSummary, setNextTripSummary] = useState({ loading: true, trip: null });
    const [evaluationSummary, setEvaluationSummary] = useState({ loading: true, items: [] });
    const [accountsSummary, setAccountsSummary] = useState({ loading: true, items: [], hasMore: false });

    // Estado Notificaciones
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
    const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

    // Estado Modales
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [isTripExpenseModalOpen, setIsTripExpenseModalOpen] = useState(false);
    const [transactionModalMode, setTransactionModalMode] = useState('add'); // 'add' o 'edit'
    const [tripExpenseModalMode, setTripExpenseModalMode] = useState('add'); // 'add' o 'edit'
    const [selectedTransactionId, setSelectedTransactionId] = useState(null);
    const [selectedTripExpenseId, setSelectedTripExpenseId] = useState(null);
    const [transactionFormData, setTransactionFormData] = useState({ type: 'gasto', amount: '', date: '', description: '', accountId: '', categoryId: '', notes: '', destinationAccountId: '' });
    const [tripExpenseFormData, setTripExpenseFormData] = useState({ tripId: '', description: '', amount: '', date: '', category: '', notes: '' });
    const [modalIsSaving, setModalIsSaving] = useState(false);
    const [modalError, setModalError] = useState('');

    // Datos para dropdowns de modales
    const [accounts, setAccounts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [trips, setTrips] = useState([]); // Viajes para modal gasto viaje

    // UI
    const [showScrollTop, setShowScrollTop] = useState(false);

    const navigate = useNavigate();

    // --- Funciones de Carga de Datos ---
    // Usamos useCallback para evitar recrear funciones en cada render si no cambian sus dependencias
    const fetchProfileAndBaseData = useCallback(async (currentUserId) => {
        try {
            const [profileRes, accountsRes, categoriesRes, tripsRes] = await Promise.all([
                supabase.from('profiles').select('avatar_url, full_name').eq('id', currentUserId).single(),
                supabase.from('accounts').select('id, name').eq('user_id', currentUserId).order('name'),
                supabase.from('categories').select('id, name, type').or(`user_id.eq.${currentUserId},is_default.eq.true`).order('name'),
                supabase.from('trips').select('id, name').eq('user_id', currentUserId).order('start_date', { ascending: false }) // Cargar viajes para modal
            ]);

            if (profileRes.error && profileRes.status !== 406) throw profileRes.error;
            setAvatarUrl(profileRes.data?.avatar_url || defaultAvatar);
            setUserName(profileRes.data?.full_name?.split(' ')[0] || '');

            if (accountsRes.error) throw accountsRes.error;
            setAccounts(accountsRes.data || []);

            if (categoriesRes.error) throw categoriesRes.error;
            setCategories(categoriesRes.data || []);

            if (tripsRes.error) throw tripsRes.error;
            setTrips(tripsRes.data || []);

            return true; // Indicar éxito
        } catch (err) {
            console.error("Error cargando datos base (profile/acc/cat/trips):", err);
            setError("Error al cargar datos básicos."); // Poner error general
            return false; // Indicar fallo
        }
    }, []); // Sin dependencias, solo se crea una vez

    // --- Carga de Widgets (Ejemplos, implementar todos) ---
    const fetchSummaryData = useCallback(async (userId) => {
      // Actualiza el estado para indicar que la carga de este widget ha comenzado
      setSummaryData(prev => ({ ...prev, loading: true, error: false })); // Añadir error: false
      try {
          console.log("Fetching Summary Data...");

          // --- Paso 1: Obtener la asignación para gastos variables del mes actual ---
          const now = new Date();
          const year = now.getFullYear();
          const month = now.getMonth(); // 0-11
          // Fechas en formato YYYY-MM-DD
          const firstDayOfMonth = new Date(year, month, 1).toISOString().split('T')[0];
          const lastDayOfMonth = new Date(year, month + 1, 0).toISOString().split('T')[0];

          const { data: evaluationData, error: evaluationError } = await supabase
              .from('evaluaciones')
              .select('variables') // Seleccionar la columna de asignación variable
              .eq('user_id', userId)
              .gte('evaluation_date', firstDayOfMonth) // Fecha >= primer día del mes
              .lte('evaluation_date', lastDayOfMonth)  // Fecha <= último día del mes
              .maybeSingle(); // Puede que no haya evaluación para el mes

          if (evaluationError) throw new Error(`Error obteniendo evaluación: ${evaluationError.message}`);
          const variableAllocation = Number(evaluationData?.variables) || 0; // Asignación, o 0 si no hay
          console.log("Asignación Variable para el mes:", variableAllocation);

          // --- Paso 2: Obtener IDs de categorías variables de tipo gasto ---
          const { data: variableCategories, error: categoriesError } = await supabase
              .from('categories')
              .select('id')
              .eq('type', 'gasto')    // Solo categorías de gasto
              .is('is_variable', true); // Solo las marcadas como variables
              // NOTA: Aquí no filtramos por user_id porque asumimos que 'is_variable'
              // se define tanto para default como para custom. Si solo aplica a custom,
              // añade .eq('user_id', userId)

          if (categoriesError) throw new Error(`Error obteniendo categorías variables: ${categoriesError.message}`);

          const variableCategoryIds = variableCategories ? variableCategories.map(cat => cat.id) : [];
          console.log("IDs de Categorías Variables de Gasto:", variableCategoryIds);

          // --- Paso 3: Sumar transacciones de gasto del mes actual para esas categorías ---
          let totalVariableSpending = 0;
          if (variableCategoryIds.length > 0) {
              const { data: transactions, error: transactionsError } = await supabase
                  .from('transactions')
                  .select('amount')
                  .eq('user_id', userId)
                  .eq('type', 'gasto') // Asegurar que solo sumamos gastos
                  .gte('transaction_date', firstDayOfMonth)
                  .lte('transaction_date', lastDayOfMonth)
                  .in('category_id', variableCategoryIds); // Filtrar por las categorías variables

              if (transactionsError) throw new Error(`Error obteniendo gastos variables: ${transactionsError.message}`);

              totalVariableSpending = (transactions || []).reduce((sum, tx) => sum + Math.abs(Number(tx.amount) || 0), 0);
              console.log("Suma de Gastos Variables del mes:", totalVariableSpending);
          } else {
              console.log("No se encontraron categorías marcadas como variables o no hay IDs.");
          }

          // --- Paso 4: Calcular restante y determinar color ---
          const remainingVariableAmount = variableAllocation - totalVariableSpending;
          const percentageSpent = (variableAllocation > 0)
              ? Math.min(100, Math.max(0, (totalVariableSpending / variableAllocation) * 100))
              : (totalVariableSpending > 0 ? 100 : 0); // Si no hay presupuesto pero sí gasto, 100%

          let progressBarColor = 'var(--accent-green)'; // Verde por defecto
          if (percentageSpent >= 95) progressBarColor = 'var(--accent-red)'; // Rojo
          else if (percentageSpent >= 75) progressBarColor = 'var(--accent-orange)'; // Naranja

          console.log("Restante Variable:", remainingVariableAmount);
          console.log("Porcentaje Gastado:", percentageSpent);

          // --- Paso 5: Actualizar el estado ---
          setSummaryData({
              loading: false,
              error: false, // Indicar que no hubo error
              // totalBalance: '€---.--', // El saldo total general vendría de otra función o cálculo
              variableRemaining: formatCurrency(remainingVariableAmount), // Formatear el restante
              variablePercentage: percentageSpent,
              progressBarColor: progressBarColor
          });

      } catch (err) {
          console.error("Error en fetchSummaryData:", err);
          // Actualizar estado para indicar error en este widget específico
          setSummaryData({ loading: false, error: true, totalBalance: 'Error', variableRemaining: 'Error', variablePercentage: 0, progressBarColor: 'var(--accent-red)' });
      }
    }, [supabase]);

    const fetchBudgetData = useCallback(async (userId) => {
      // Indicar que este widget específico está cargando
      setBudgetSummary({ loading: true, items: [], error: false });
      try {
          console.log("Fetching Budget Data for Dashboard Widget...");

          // 1. Obtener fechas del mes actual
          const now = new Date();
          const year = now.getFullYear();
          const month = now.getMonth(); // 0-11
          const firstDayOfMonth = new Date(year, month, 1).toISOString().split('T')[0];
          const lastDayOfMonth = new Date(year, month + 1, 0).toISOString().split('T')[0];
          console.log(`Periodo actual: ${firstDayOfMonth} a ${lastDayOfMonth}`);

          // 2. Obtener presupuestos del mes actual con nombre e icono de categoría
          const { data: budgets, error: budgetsError } = await supabase
              .from('budgets')
              .select(`
                  id,
                  category_id,
                  amount,
                  categories ( name, icon )
              `)
              .eq('user_id', userId)
              .eq('start_date', firstDayOfMonth); // Asumiendo que start_date identifica el mes

          if (budgetsError) throw new Error(`Error cargando presupuestos: ${budgetsError.message}`);
          console.log("Presupuestos del mes:", budgets);

          if (!budgets || budgets.length === 0) {
              // Si no hay presupuestos, no hay nada que mostrar
              setBudgetSummary({ loading: false, items: [], error: false });
              return;
          }

          // 3. Obtener IDs de las categorías presupuestadas
          const budgetedCategoryIds = budgets.map(b => b.category_id);

          // 4. Obtener gastos del mes actual PARA ESAS CATEGORÍAS
          const { data: transactions, error: transactionsError } = await supabase
              .from('transactions')
              .select('category_id, amount')
              .eq('user_id', userId)
              .eq('type', 'gasto') // Solo gastos
              .gte('transaction_date', firstDayOfMonth)
              .lte('transaction_date', lastDayOfMonth)
              .in('category_id', budgetedCategoryIds); // Solo de categorías presupuestadas

          if (transactionsError) throw new Error(`Error cargando gastos: ${transactionsError.message}`);
          console.log("Transacciones de gasto relevantes:", transactions);

          // 5. Calcular gasto por categoría presupuestada
          const spendingMap = {};
          (transactions || []).forEach(tx => {
              spendingMap[tx.category_id] = (spendingMap[tx.category_id] || 0) + Math.abs(Number(tx.amount) || 0);
          });
          console.log("Gasto calculado por categoría:", spendingMap);

          // 6. Procesar datos para el estado del widget (limitar a 3-5 items para el dashboard)
          const summaryItems = budgets.slice(0, 5).map(b => { // Mostrar máximo 5
              const categoryName = b.categories?.name || 'Desconocido';
              const categoryIcon = getIconClass(b.categories?.icon); // Usar función auxiliar
              const budgetAmount = Number(b.amount) || 0;
              const spentAmount = spendingMap[b.category_id] || 0;
              const percentage = budgetAmount > 0 ? Math.min(100, Math.max(0, (spentAmount / budgetAmount) * 100)) : 0;

              let progressBarColor = 'var(--accent-green)'; // Verde por defecto
              if (percentage >= 95) progressBarColor = 'var(--accent-red)'; // Rojo
              else if (percentage >= 75) progressBarColor = 'var(--accent-orange)'; // Naranja

              return {
                  id: b.id,
                  name: categoryName,
                  icon: categoryIcon,
                  spent: spentAmount,
                  budget: budgetAmount,
                  percentage: percentage,
                  color: progressBarColor,
              };
          });

          // 7. Actualizar estado del widget
          setBudgetSummary({ loading: false, items: summaryItems, error: false });

      } catch (err) {
          console.error("Error Budget Widget:", err);
          setBudgetSummary({ loading: false, items: [], error: true });
      }
    }, [supabase]);

    const fetchUpcomingPayments = useCallback(async (userId) => {
      // Indicar que este widget está cargando
      setUpcomingPayments({ loading: true, items: [], error: false });
      try {
          console.log("Fetching Upcoming Payments...");

          // 1. Obtener fecha de hoy en formato YYYY-MM-DD
          const today = new Date().toISOString().split('T')[0];

          // 2. Consultar los próximos gastos fijos activos
          const { data, error } = await supabase
              .from('scheduled_fixed_expenses') // Asegúrate que el nombre de la tabla sea correcto
              .select(`
                  id,
                  description,
                  amount,
                  next_due_date,
                  categories ( icon )
              `) // Seleccionar campos necesarios, incluyendo icono de categoría
              .eq('user_id', userId)
              .eq('is_active', true) // Solo los activos
              .gte('next_due_date', today) // Vencimiento desde hoy en adelante
              .order('next_due_date', { ascending: true }) // Más próximos primero
              .limit(4); // Limitar a los próximos 4 (o el número que prefieras)

          if (error) throw new Error(`Error cargando próximos pagos: ${error.message}`);
          console.log("Próximos pagos:", data);

          // 3. Procesar datos para el estado
          const upcomingItems = (data || []).map(p => ({
              id: p.id,
              description: p.description,
              amount: p.amount,
              date: p.next_due_date, // Guardar fecha original para posible ordenación
              formattedDate: formatDate(p.next_due_date), // Formatear para mostrar
              icon: getIconClass(p.categories?.icon) // Obtener clase de icono
          }));

          // 4. Actualizar estado del widget
          setUpcomingPayments({ loading: false, items: upcomingItems, error: false });

      } catch (err) {
          console.error("Error Upcoming Payments Widget:", err);
          setUpcomingPayments({ loading: false, items: [], error: true });
      }
    }, [supabase]);

    const fetchGoalsProgress = useCallback(async (userId) => {
      // Indicar que este widget está cargando
      setGoalsProgress({ loading: true, items: [], hasMore: false, error: false });
      try {
          console.log("Fetching Goals Progress...");

          // 1. Obtener las próximas 2 metas activas (o las primeras si no hay fecha)
          //    ordenadas por fecha objetivo más cercana.
          const { data: goalsData, error: goalsError } = await supabase
             .from('goals')
             .select('id, name, current_amount, target_amount, icon, target_date') // Incluir target_date para ordenar
             .eq('user_id', userId)
             // Opcional: Excluir metas ya alcanzadas si no quieres mostrarlas en el resumen
             .lt('current_amount', supabase.sql('target_amount')) // current < target
             // O filtrar por un estado si tienes una columna 'status'
             // .neq('status', 'alcanzada')
             .order('target_date', { ascending: true, nullsLast: true }) // Más próximas primero, sin fecha al final
             .limit(5); // Mostrar máximo 5 en el dashboard

          if (goalsError) throw new Error(`Error cargando metas: ${goalsError.message}`);
          console.log("Metas para widget:", goalsData);

          // 2. Consultar el número total de metas activas para saber si mostrar "Ver todas"
          const { count: totalGoalsCount, error: countError } = await supabase
              .from('goals')
              .select('*', { count: 'exact', head: true }) // Solo contar
              .eq('user_id', userId);
              // Añadir filtro de estado si es necesario (ej: .neq('status', 'alcanzada'))

          if (countError) console.warn("Error contando total de metas:", countError.message); // No crítico

          const hasMoreGoals = totalGoalsCount > (goalsData?.length || 0);

          // 3. Procesar datos para el estado
          const progressItems = (goalsData || []).map(g => {
              const targetAmount = Number(g.target_amount) || 0;
              const currentAmount = Number(g.current_amount) || 0;
              // Calcular porcentaje, asegurando que no sea > 100% o < 0%
              const percentage = targetAmount > 0
                  ? Math.max(0, Math.min((currentAmount / targetAmount) * 100, 100))
                  : (currentAmount > 0 ? 100 : 0); // 100% si no hay objetivo pero sí ahorro
              const isComplete = currentAmount >= targetAmount && targetAmount > 0; // Considerar completa si alcanza o supera

              // Determinar color de la barra
              let progressBarColor = 'var(--accent-blue)'; // Azul por defecto para progreso
              if (isComplete) progressBarColor = 'var(--accent-green)'; // Verde completado
              else if (percentage >= 75) progressBarColor = 'var(--accent-orange)'; // Naranja/amarillo cerca

              return {
                  id: g.id,
                  name: g.name,
                  current: currentAmount,
                  target: targetAmount,
                  percentage: percentage,
                  icon: getIconClass(g.icon), // Usar función auxiliar
                  color: progressBarColor,
              };
          });

          // 4. Actualizar estado del widget
          setGoalsProgress({
              loading: false,
              items: progressItems,
              hasMore: hasMoreGoals, // Indicar si hay más metas que las mostradas
              error: false
          });

      } catch (err) {
          console.error("Error Goals Progress Widget:", err);
          setGoalsProgress({ loading: false, items: [], hasMore: false, error: true });
      }
    }, [supabase]);

    const fetchRecentActivity = useCallback(async (userId) => {
      // Indica carga para este widget específico
      setRecentActivity({ loading: true, items: [], error: false });
      try {
          console.log("Fetching Recent Activity...");
          // Consulta a Supabase para obtener las últimas 5 transacciones
          const { data, error } = await supabase
             .from('transactions')
             // Selecciona los campos necesarios, incluyendo el icono de la categoría asociada
             .select('id, description, type, amount, transaction_date, categories(icon)')
             .eq('user_id', userId)
             .order('transaction_date', { ascending: false }) // Más recientes primero por fecha
             .order('created_at', { ascending: false }) // Desempate por fecha de creación
             .limit(5); // Limitar a 5 resultados

          if (error) throw error; // Lanza error si la consulta falla

          // Actualiza el estado con los datos obtenidos (o un array vacío si no hay)
          // La transformación/formateo de estos datos (fechas, moneda, iconos)
          // se hará directamente en la parte del JSX que renderiza la lista.
          setRecentActivity({ loading: false, items: data || [], error: false });

      } catch (err) {
          console.error("Error Recent Activity Widget:", err);
          // Actualiza el estado para indicar error
          setRecentActivity({ loading: false, items: [], error: true });
      }
    }, [supabase]);

    const fetchDebtsSummary = useCallback(async (userId) => {
      // Indicar que este widget está cargando
      setDebtsSummary({ loading: true, items: [], hasMore: false, error: false });
      try {
          console.log("Fetching Debts Summary...");

          // 1. Obtener las primeras 3 deudas activas (no pagadas)
          const { data: activeDebts, error: debtsError } = await supabase
              .from('debts')
              // Seleccionar campos necesarios para la lista y el progreso
              .select('id, creditor, current_balance, initial_amount')
              .eq('user_id', userId)
              .neq('status', 'Pagada') // Deudas activas (Pendiente o Parcial)
              .order('due_date', { ascending: true, nullsLast: true }) // Ordenar por fecha opcionalmente
              .limit(3); // Mostrar máximo 3 deudas en el resumen

          if (debtsError) throw new Error(`Error cargando deudas: ${debtsError.message}`);
          console.log("Deudas activas para widget:", activeDebts);

          // 2. Contar el total de deudas activas para el enlace "Ver todas"
          const { count: totalActiveCount, error: countError } = await supabase
              .from('debts')
              .select('*', { count: 'exact', head: true }) // Solo contar
              .eq('user_id', userId)
              .neq('status', 'Pagada');

          if (countError) console.warn("Error contando total de deudas activas:", countError.message); // No crítico

          const hasMoreDebts = totalActiveCount > (activeDebts?.length || 0);

          // 3. Procesar datos para el estado
          const summaryItems = (activeDebts || []).map(debt => {
              const initialAmount = Number(debt.initial_amount) || 0;
              const currentBalance = Number(debt.current_balance) || 0;
              // Calcular porcentaje PAGADO
              const paidAmount = initialAmount - currentBalance;
              const safePaidAmount = Math.max(0, paidAmount); // Asegurar no negativo
              const percentagePaid = initialAmount > 0
                  ? Math.min(100, Math.max(0, (safePaidAmount / initialAmount) * 100))
                  : 0; // 0% si no había importe inicial

              // Determinar color barra (rojo por defecto, naranja casi pagada)
              let progressBarColor = 'var(--accent-red)';
              if (percentagePaid >= 95) progressBarColor = 'var(--accent-orange)';
              // Podríamos añadir verde si permitimos mostrar pagadas aquí, pero el filtro lo evita

              return {
                  id: debt.id,
                  name: debt.creditor, // Usamos creditor como nombre en el resumen
                  balance: currentBalance, // Saldo pendiente
                  percentage: percentagePaid, // Porcentaje pagado
                  icon: 'fas fa-file-invoice-dollar', // Icono genérico deuda
                  color: progressBarColor,
              };
          });

          // 4. Actualizar estado del widget
          setDebtsSummary({
              loading: false,
              items: summaryItems,
              hasMore: hasMoreDebts,
              error: false
          });

      } catch (err) {
          console.error("Error Debts Summary Widget:", err);
          setDebtsSummary({ loading: false, items: [], hasMore: false, error: true });
      }
    }, [supabase]);

    const fetchLoansSummary = useCallback(async (userId) => {
      // Indicar que este widget está cargando
      setLoansSummary({ loading: true, items: [], hasMore: false, error: false });
      try {
          console.log("Fetching Loans Summary...");

          // 1. Obtener los primeros 3 préstamos activos (no cobrados)
          const { data: activeLoans, error: loansError } = await supabase
              .from('loans') // Asegúrate que el nombre de la tabla es correcto
              // Seleccionar campos necesarios para la lista y el progreso
              .select('id, debtor, current_balance, initial_amount')
              .eq('user_id', userId)
              .neq('status', 'Cobrado') // Préstamos activos (Pendiente o Parcialmente Cobrado)
              .order('due_date', { ascending: true, nullsLast: true }) // Ordenar opcionalmente
              .limit(3); // Mostrar máximo 3 préstamos en el resumen

          if (loansError) throw new Error(`Error cargando préstamos: ${loansError.message}`);
          console.log("Préstamos activos para widget:", activeLoans);

          // 2. Contar el total de préstamos activos para el enlace "Ver todos"
          const { count: totalActiveCount, error: countError } = await supabase
              .from('loans')
              .select('*', { count: 'exact', head: true }) // Solo contar
              .eq('user_id', userId)
              .neq('status', 'Cobrado');

          if (countError) console.warn("Error contando total de préstamos activos:", countError.message); // No crítico

          const hasMoreLoans = totalActiveCount > (activeLoans?.length || 0);

          // 3. Procesar datos para el estado
          const summaryItems = (activeLoans || []).map(loan => {
              const initialAmount = Number(loan.initial_amount) || 0;
              const currentBalance = Number(loan.current_balance) || 0;
              // Calcular porcentaje COBRADO para la barra de progreso
              const collectedAmount = initialAmount - currentBalance;
              const safeCollectedAmount = Math.max(0, collectedAmount); // Asegurar no negativo
              const percentageCollected = initialAmount > 0
                  ? Math.min(100, Math.max(0, (safeCollectedAmount / initialAmount) * 100))
                  : (initialAmount === 0 && currentBalance === 0 ? 100 : 0); // 100% si empezó y terminó en 0, 0% si no

              // Determinar color barra (verde por defecto para cobro)
              let progressBarColor = 'var(--accent-green)';
              // Podrías añadir lógica de color si quieres

              return {
                  id: loan.id,
                  name: loan.debtor, // Usamos deudor como nombre
                  balance: currentBalance, // Saldo pendiente por cobrar
                  percentage: percentageCollected, // Porcentaje cobrado
                  icon: 'fas fa-hand-holding-usd', // Icono genérico préstamo
                  color: progressBarColor,
              };
          });

          // 4. Actualizar estado del widget
          setLoansSummary({
              loading: false,
              items: summaryItems,
              hasMore: hasMoreLoans,
              error: false
          });

      } catch (err) {
          console.error("Error Loans Summary Widget:", err);
          setLoansSummary({ loading: false, items: [], hasMore: false, error: true });
      }
    }, [supabase]);

    const fetchNextTripSummary = useCallback(async (userId) => {
      // Indicar que este widget está cargando
      setNextTripSummary({ loading: true, trip: null, error: false });
      try {
          console.log("Fetching Next Trip Summary...");

          // 1. Obtener fecha de hoy en formato YYYY-MM-DD
          const today = new Date().toISOString().split('T')[0];

          // 2. Buscar el próximo viaje (fecha inicio >= hoy, ordenado por fecha inicio asc)
          const { data: nextTripData, error: tripError } = await supabase
              .from('trips')
              // Seleccionar los campos necesarios para el resumen
              .select('id, name, destination, start_date, end_date, budget, saved_amount')
              .eq('user_id', userId)
              .gte('start_date', today) // Fecha inicio desde hoy en adelante
              .order('start_date', { ascending: true }) // El más cercano primero
              .limit(1) // Solo queremos el próximo
              .maybeSingle(); // Para manejar si no hay ninguno (devuelve null en data sin error)

          if (tripError) throw new Error(`Error buscando próximo viaje: ${tripError.message}`);
          console.log("Próximo viaje encontrado:", nextTripData);

          if (!nextTripData) {
              // No hay viajes próximos, actualizar estado y salir
              setNextTripSummary({ loading: false, trip: null, error: false });
              return;
          }

          // 3. Calcular progreso de ahorro
          const budget = Number(nextTripData.budget) || 0;
          const saved = Number(nextTripData.saved_amount) || 0;
          const percentage = budget > 0
              ? Math.min(100, Math.max(0, (saved / budget) * 100))
              : (saved > 0 ? 100 : 0); // 100% si no hay presupuesto pero se ahorró? O 0%? Mejor 0%

          // Determinar color barra progreso
          let progressBarColor = 'var(--accent-purple)'; // Morado ahorro por defecto
           if (percentage >= 100) progressBarColor = 'var(--accent-green)'; // Verde completado
           else if (percentage >= 75) progressBarColor = 'var(--accent-orange)'; // Naranja avanzado

          // 4. Preparar el objeto de viaje procesado para el estado
          const processedTrip = {
              id: nextTripData.id,
              name: nextTripData.name || 'Próximo Viaje',
              destination: nextTripData.destination,
              startDate: nextTripData.start_date,
              endDate: nextTripData.end_date,
              saved: saved,
              budget: budget,
              percentage: percentage,
              color: progressBarColor,
              // Formatear fechas para mostrar directamente si se desea
              formattedStartDate: formatDate(nextTripData.start_date),
              formattedEndDate: formatDate(nextTripData.end_date),
              formattedSaved: formatCurrency(saved),
              formattedBudget: formatCurrency(budget),
              icon: getIconClass('viajes') // O usar un icono específico si lo tienes en la tabla trips
          };

          // 5. Actualizar estado del widget
          setNextTripSummary({
              loading: false,
              trip: processedTrip, // Guardar el objeto procesado
              error: false
          });

      } catch (err) {
          console.error("Error Next Trip Summary Widget:", err);
          setNextTripSummary({ loading: false, trip: null, error: true });
      }
    }, [supabase]);

    const fetchEvaluationSummary = useCallback(async (userId) => {
      // Indicar que este widget está cargando
      setEvaluationSummary({ loading: true, items: [], error: false });
      try {
          console.log("Fetching Evaluation Summary...");

          // 1. Obtener fechas del mes actual
          const now = new Date();
          const year = now.getFullYear();
          const month = now.getMonth(); // 0-11
          const firstDayOfMonth = new Date(year, month, 1).toISOString().split('T')[0];
          const lastDayOfMonth = new Date(year, month + 1, 0).toISOString().split('T')[0];
          console.log(`Buscando evaluación para periodo: ${firstDayOfMonth} a ${lastDayOfMonth}`);

          // 2. Buscar la evaluación para el mes actual
          const { data: evaluationData, error: evaluationError } = await supabase
              .from('evaluaciones') // Asegúrate que el nombre de la tabla es correcto
              // Seleccionar las columnas relevantes que quieres mostrar en el resumen
              .select('ingreso, ahorro_mes, fijos, variables, colchon, inversion, viajes, extra')
              .eq('user_id', userId)
              .gte('evaluation_date', firstDayOfMonth) // Asume que evaluation_date identifica el mes
              .lte('evaluation_date', lastDayOfMonth)
              .maybeSingle(); // Solo debería haber una por mes

          if (evaluationError) throw new Error(`Error obteniendo evaluación: ${evaluationError.message}`);
          console.log("Evaluación encontrada:", evaluationData);

          if (!evaluationData) {
              // No hay planificación para este mes
              setEvaluationSummary({ loading: false, items: [], error: false, noData: true }); // Añadir flag noData
              return;
          }

          // 3. Mapear los datos a un formato de lista para mostrar (ajusta según necesites)
          const planItems = [
              { label: 'Ingresos Plan.', amount: evaluationData.ingreso, icon: 'fa-arrow-down' },
              { label: 'G. Fijos', amount: evaluationData.fijos, icon: 'fa-file-invoice-dollar' },
              { label: 'G. Variables', amount: evaluationData.variables, icon: 'fa-shopping-cart' },
              { label: 'Ahorro Mes', amount: evaluationData.ahorro_mes, icon: 'fa-piggy-bank' },
              { label: 'Ahorro Colchón', amount: evaluationData.colchon, icon: 'fa-shield-alt' },
              { label: 'Inversión', amount: evaluationData.inversion, icon: 'fa-chart-line' },
              { label: 'Viajes', amount: evaluationData.viajes, icon: 'fa-plane-departure' },
              { label: 'Extra', amount: evaluationData.extra, icon: 'fa-question-circle' }
          ]
          // Filtrar para mostrar solo los que tienen importe > 0 (excepto ingresos y extra que pueden ser 0 o negativos)
          .filter(item =>
              item.label === 'Ingresos Plan.' || item.label === 'Extra' || (Number(item.amount) || 0) > 0
          )
          // Limitar cuántos mostrar en el dashboard (opcional)
          .slice(0, 4) // Mostrar máximo 4 items en el resumen
          .map(item => ({
              ...item,
              // Añadir clase de icono completa y formatear cantidad
              icon: `fas ${item.icon}`,
              formattedAmount: formatCurrency(Number(item.amount) || 0),
              // Determinar clase de estilo (income/expense)
              amountClass: item.label === 'Ingresos Plan.' ? 'income' : 'expense'
          }));

          console.log("Items procesados para widget evaluación:", planItems);

          // 4. Actualizar estado del widget
          setEvaluationSummary({
              loading: false,
              items: planItems,
              error: false,
              noData: planItems.length === 0 // Marcar noData si después de filtrar no queda nada
          });

      } catch (err) {
          console.error("Error Evaluation Summary Widget:", err);
          setEvaluationSummary({ loading: false, items: [], error: true });
      }
    }, [supabase]);

    const fetchAccountsSummary = useCallback(async (userId) => {
      // Indicar que este widget está cargando
      setAccountsSummary({ loading: true, items: [], hasMore: false, error: false });
      try {
          console.log("Fetching Accounts Summary...");

          // 1. Obtener las primeras 3 cuentas (excluyendo crédito)
          const { data: accountsData, error: accountsError } = await supabase
              .from('accounts')
              // Seleccionar campos necesarios para el resumen
              .select('id, name, type, currency') // No seleccionamos balance aquí
              .eq('user_id', userId)
              .neq('type', 'tarjeta_credito') // Excluir tarjetas de crédito del resumen
              .order('name', { ascending: true }) // Ordenar alfabéticamente
              .limit(3); // Mostrar máximo 3 en el resumen

          if (accountsError) throw new Error(`Error cargando cuentas: ${accountsError.message}`);
          console.log("Cuentas para widget:", accountsData);

          if (!accountsData || accountsData.length === 0) {
              // No hay cuentas (aparte de crédito)
              setAccountsSummary({ loading: false, items: [], hasMore: false, error: false, noData: true });
              return;
          }

          // 2. Contar el total de cuentas (excluyendo crédito) para "Ver todas"
          const { count: totalAccountsCount, error: countError } = await supabase
              .from('accounts')
              .select('*', { count: 'exact', head: true }) // Solo contar
              .eq('user_id', userId)
              .neq('type', 'tarjeta_credito');

          if (countError) console.warn("Error contando total de cuentas:", countError.message); // No crítico

          const hasMoreAccounts = totalAccountsCount > (accountsData?.length || 0);

          // 3. **SIMULACIÓN/PLACEHOLDER CÁLCULO DE SALDO**
          //    Aquí es donde deberías implementar la lógica optimizada para obtener
          //    el saldo de ESTAS cuentas (ej. llamando a una función RPC de Supabase).
          //    Por ahora, asignaremos un saldo simulado o 'N/A'.
          const summaryItemsPromises = accountsData.map(async (acc) => {
               // *** INICIO SIMULACIÓN ***
               console.warn(`Saldo para cuenta ${acc.name} (${acc.id}) NO calculado - usando placeholder.`);
               // const calculatedBalance = await fetchAccountBalanceRPC(acc.id); // Llamada a función RPC (ideal)
               const simulatedBalance = Math.random() * 5000 - 1000; // Saldo aleatorio para demo
               const calculatedBalance = simulatedBalance; // Usar simulación
               // const calculatedBalance = null; // O usar null para mostrar 'N/A'
               // *** FIN SIMULACIÓN ***

               const balanceText = (calculatedBalance !== null)
                  ? formatCurrency(calculatedBalance, acc.currency || 'EUR')
                  : 'N/A';
               let balanceClass = 'neutral';
               if (calculatedBalance !== null) {
                   if (calculatedBalance > 0) balanceClass = 'income';
                   else if (calculatedBalance < 0) balanceClass = 'expense';
               }

               return {
                   id: acc.id,
                   name: acc.name || 'Sin Nombre',
                   icon: getIconForAccountType(acc.type), // Usar función auxiliar
                   balance: balanceText, // Saldo formateado o N/A
                   balanceClass: balanceClass, // Clase para color
               };
          });

          const summaryItems = await Promise.all(summaryItemsPromises); // Esperar a que todas las simulaciones/cálculos terminen


          // 4. Actualizar estado del widget
          setAccountsSummary({
              loading: false,
              items: summaryItems,
              hasMore: hasMoreAccounts,
              error: false
          });

      } catch (err) {
          console.error("Error Accounts Summary Widget:", err);
          setAccountsSummary({ loading: false, items: [], hasMore: false, error: true });
      }
    }, [supabase]);

    const fetchNotificationCount = useCallback(async (userId) => {
      try {
          // Consulta a Supabase para CONTAR notificaciones
          const { count, error } = await supabase
             .from('notifications')
             // head: true es eficiente, solo trae el conteo
             .select('*', { count: 'exact', head: true })
             .eq('user_id', userId) // Del usuario actual
             .eq('is_read', false); // Que no estén leídas

          if (error) throw error; // Lanza error si falla la consulta

          // Actualiza el estado 'unreadCount' con el resultado
          setUnreadCount(count || 0); // Usa 0 si count es null

      } catch (err) {
          console.error("Error Notification Count:", err);
          // Opcional: podrías poner setUnreadCount(0) aquí si falla
      }
  }, [supabase]);

    // --- Efecto Principal de Carga ---
    useEffect(() => {
        const loadAllData = async () => {
            setIsLoading(true); // Carga general
            setError(null);
            try {
                const simulatedUserId = 'USER_ID_PLACEHOLDER'; // Reemplazar con AuthContext
                if (!simulatedUserId) { navigate('/login'); return; }
                setUserId(simulatedUserId);

                const baseDataOk = await fetchProfileAndBaseData(simulatedUserId);
                if (!baseDataOk) return;

                // Llamar a todas las cargas de widgets
                await Promise.allSettled([
                    fetchSummaryData(simulatedUserId),
                    fetchBudgetData(simulatedUserId),
                    fetchUpcomingPayments(simulatedUserId),
                    fetchGoalsProgress(simulatedUserId),
                    fetchRecentActivity(simulatedUserId),
                    fetchDebtsSummary(simulatedUserId),
                    fetchLoansSummary(simulatedUserId),
                    fetchNextTripSummary(simulatedUserId),
                    fetchEvaluationSummary(simulatedUserId),
                    fetchAccountsSummary(simulatedUserId),
                    fetchNotificationCount(simulatedUserId)
                ]);
                console.log("Carga completa de widgets (allSettled).");

            } catch (err) { setError(err.message || "Error cargando el dashboard."); }
            finally { setIsLoading(false); } // Fin carga general
        };
        loadAllData();
        // Scroll-top listener
        const handleScroll = () => setShowScrollTop(window.scrollY > 300);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [navigate, fetchProfileAndBaseData, fetchSummaryData, fetchBudgetData, fetchUpcomingPayments, fetchGoalsProgress, fetchRecentActivity, fetchDebtsSummary, fetchLoansSummary, fetchNextTripSummary, fetchEvaluationSummary, fetchAccountsSummary, fetchNotificationCount]); // Dependencias


    // --- Manejadores de Modales y Notificaciones ---
    const toggleNotificationPanel = () => setIsNotificationPanelOpen(!isNotificationPanelOpen);

    const fetchAndDisplayNotifications = useCallback(async () => {
        if (!userId) return;
        setIsLoadingNotifications(true);
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(15);
            if (error) throw error;
            setNotifications(data || []);
        } catch (err) { console.error("Error fetching notifications:", err); setNotifications([]); }
        finally { setIsLoadingNotifications(false); }
    }, [userId]);

    // Cargar notificaciones al abrir el panel
    useEffect(() => {
        if (isNotificationPanelOpen) {
            fetchAndDisplayNotifications();
        }
    }, [isNotificationPanelOpen, fetchAndDisplayNotifications]);

     const handleMarkAllRead = async () => {
         if (!userId) return;
         try {
             const { error } = await supabase.from('notifications')
                .update({ is_read: true })
                .eq('user_id', userId)
                .eq('is_read', false);
             if (error) throw error;
             setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
             setUnreadCount(0);
         } catch (err) { console.error("Error marking all read:", err); /* Mostrar error UI? */ }
     };

     const handleNotificationClick = async (notificationId) => {
         const notification = notifications.find(n => n.id === notificationId);
         if (notification && !notification.is_read) {
             try {
                 await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
                 setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
                 setUnreadCount(prev => Math.max(0, prev - 1));
             } catch (err) { console.error("Error marking single notification read:", err); }
         }
         // Lógica de redirección (ejemplo)
         // if (notification?.related_entity_type === 'goals') navigate(`/goals#goal-${notification.related_entity_id}`);
         setIsNotificationPanelOpen(false); // Cerrar panel al hacer clic
     };


    // --- Manejadores Modales ---
    const handleOpenTransactionModal = (type = 'gasto') => {
        setTransactionModalMode('add');
        setSelectedTransactionId(null);
        setTransactionFormData({ // Resetear con tipo por defecto
             type: type, amount: '', date: new Date().toISOString().split('T')[0], description: '',
             accountId: '', categoryId: '', notes: '', destinationAccountId: ''
        });
        setModalError('');
        setIsTransactionModalOpen(true);
    };
    const handleCloseTransactionModal = () => setIsTransactionModalOpen(false);

    const handleOpenTripExpenseModal = () => {
         setTripExpenseModalMode('add');
         setSelectedTripExpenseId(null);
         setTripExpenseFormData({ // Resetear
             tripId: '', description: '', amount: '', date: new Date().toISOString().split('T')[0],
             category: '', notes: ''
         });
         setModalError('');
         setIsTripExpenseModalOpen(true);
    };
    const handleCloseTripExpenseModal = () => setIsTripExpenseModalOpen(false);

    // Handlers para cambios en formularios de modales (simplificado)
    const handleTransactionFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        setTransactionFormData(prev => ({ ...prev, [name]: type === 'radio' ? value : value }));
        if (name === 'transactionType') updateModalUI(value); // Actualizar UI si cambia tipo
        if (modalError) setModalError('');
    };
    const handleTripExpenseFormChange = (e) => {
        setTripExpenseFormData({ ...tripExpenseFormData, [e.target.name]: e.target.value });
        if (modalError) setModalError('');
    };

    // Actualizar UI del modal de transacción según el tipo
    const updateModalUI = (selectedType) => {
        // Esta lógica ahora podría estar dentro del componente TransactionModal
        // o manejarse con renderizado condicional en el JSX de este componente.
        console.log("Actualizar UI modal para tipo:", selectedType);
        // Ejemplo: Mostrar/ocultar campo cuenta destino y categoría
    };

    // Submit modal transacción
    const handleTransactionSubmit = useCallback(async (event) => {
      event.preventDefault(); // Prevenir envío HTML
      if (!userId) {
          setModalError("Error: Usuario no identificado.");
          return;
      }

      setModalError(''); // Limpiar error previo
      setModalIsSaving(true); // Activar estado de carga

      console.log("Guardando transacción...", transactionFormData);

      // --- Obtener datos comunes del estado ---
      const { type, amount: amountStr, date, description, accountId, categoryId, notes, destinationAccountId } = transactionFormData;
      const amount = Math.abs(parseFloat(amountStr) || 0); // Asegurar positivo y número

      // --- Validaciones Comunes ---
      if (isNaN(amount) || amount <= 0) { setModalError('El importe debe ser mayor que cero.'); setModalIsSaving(false); return; }
      if (!date) { setModalError('La fecha es obligatoria.'); setModalIsSaving(false); return; }
      if (!description?.trim()) { setModalError('La descripción es obligatoria.'); setModalIsSaving(false); return; }
      if (!accountId) { setModalError('Debes seleccionar una cuenta.'); setModalIsSaving(false); return; }


      try {
          let result = null; // Para almacenar el resultado de Supabase

          // --- Lógica según Tipo ---
          if (type === 'transferencia') {
              console.log("Procesando TRANSFERENCIA...");
              // Validación específica de transferencia
              if (!destinationAccountId) { throw new Error('Debes seleccionar cuenta destino para transferencias.'); }
              if (accountId === destinationAccountId) { throw new Error('La cuenta origen y destino no pueden ser la misma.'); }

              // *** IMPORTANTE: DEFINE TUS IDs DE CATEGORÍA PARA TRANSFERENCIAS ***
              const TRANSFER_CATEGORY_ID_OUT = '2d55034c-0587-4d9c-9d93-5284d6880c76'; // Reemplaza con tu UUID real
              const TRANSFER_CATEGORY_ID_IN = '7547fdfa-f7b2-44f4-af01-f937bfcc5be3';   // Reemplaza con tu UUID real
              if (TRANSFER_CATEGORY_ID_OUT === '2d55034c-0587-4d9c-9d93-5284d6880c76' || TRANSFER_CATEGORY_ID_IN === '7547fdfa-f7b2-44f4-af01-f937bfcc5be3') {
                   console.error("IDs de categoría de transferencia no definidos!");
                   throw new Error("Error de configuración interno (IDs transferencia).");
              }
              // ********************************************************************

              const sourceAccountName = accounts.find(a => a.id === accountId)?.name || 'otra cuenta';
              const destAccountName = accounts.find(a => a.id === destinationAccountId)?.name || 'otra cuenta';

              const gastoTransferencia = {
                  user_id: userId,
                  account_id: accountId, // Origen
                  category_id: TRANSFER_CATEGORY_ID_OUT,
                  type: 'gasto',
                  description: `Transferencia a ${destAccountName}: ${description.trim()}`,
                  amount: -amount, // Negativo
                  transaction_date: date,
                  notes: notes?.trim() || null
              };
              const ingresoTransferencia = {
                  user_id: userId,
                  account_id: destinationAccountId, // Destino
                  category_id: TRANSFER_CATEGORY_ID_IN,
                  type: 'ingreso',
                  description: `Transferencia desde ${sourceAccountName}: ${description.trim()}`,
                  amount: amount, // Positivo
                  transaction_date: date,
                  notes: notes?.trim() || null
              };

              console.log("Insertando transferencia (2 registros):", gastoTransferencia, ingresoTransferencia);
              // Insertar ambas transacciones
              result = await supabase.from('transactions').insert([gastoTransferencia, ingresoTransferencia]);

          } else { // Gasto o Ingreso normal
              console.log(`Procesando ${type.toUpperCase()}...`);
              const category_id = categoryId || null; // Permitir categoría nula
              const signedAmount = type === 'gasto' ? -amount : amount;

              // Puedes añadir validación de categoría si es obligatoria para Gasto/Ingreso aquí
              if (!category_id) throw new Error('La categoría es obligatoria para gastos/ingresos.');

              const transactionData = {
                  user_id: userId,
                  account_id: accountId,
                  category_id: category_id,
                  type: type,
                  description: description.trim(),
                  amount: signedAmount,
                  transaction_date: date,
                  notes: notes?.trim() || null
              };

              // Comprobar si estamos editando (no debería ocurrir desde dashboard, pero por si acaso)
              if (transactionModalMode === 'edit' && selectedTransactionId) {
                  console.warn("Editando transacción desde modal del Dashboard?");
                  delete transactionData.user_id; // No enviar user_id en update
                   result = await supabase.from('transactions')
                      .update(transactionData)
                      .eq('id', selectedTransactionId)
                      .eq('user_id', userId); // Seguridad RLS
              } else {
                  // Insertar transacción única
                  console.log("Insertando transacción única:", transactionData);
                  result = await supabase.from('transactions').insert([transactionData]);
              }
          }

          // Verificar error del resultado de Supabase
          if (result.error) throw result.error;

          // Éxito
          console.log('Transacción guardada:', type, (transactionModalMode === 'edit' ? '(Editado)' : '(Creado)'));
          handleCloseTransactionModal(); // Cerrar modal

          // Recargar widgets afectados (Actividad Reciente y Resumen Saldo/Gasto Variable)
          fetchRecentActivity(userId);
          fetchSummaryData(userId);
          // Opcional: Recargar otros widgets si son afectados (ej. Cuentas, Presupuestos)
           fetchAccountsSummary(userId);
           fetchBudgetData(userId);

      } catch (error) {
          console.error(`Error guardando ${type}:`, error);
          setModalError(`Error: ${error.message}`);
      } finally {
          setModalIsSaving(false); // Quitar estado de carga
      }
  }, [userId, transactionFormData, accounts, supabase, navigate, fetchRecentActivity, fetchSummaryData, transactionModalMode, selectedTransactionId]);

    // Submit modal gasto viaje
    const handleTripExpenseSubmit = useCallback(async (event) => {
      event.preventDefault(); // Prevenir envío HTML
      if (!userId) {
          setModalError("Error: Usuario no identificado.");
          return;
      }
      // Asumimos que solo se puede AÑADIR desde el dashboard, no editar.
      // Si se necesitara editar, habría que manejar 'tripExpenseModalMode' y 'selectedTripExpenseId'.

      setModalError(''); // Limpiar error previo
      setModalIsSaving(true); // Activar estado de carga

      console.log("Guardando gasto de viaje...", tripExpenseFormData);

      // --- Obtener datos del estado ---
      const { tripId, description, amount: amountStr, date, category, notes } = tripExpenseFormData;
      const amount = parseFloat(amountStr) || 0; // Convertir a número

      // --- Validaciones ---
      if (!tripId) { setModalError('Debes seleccionar un viaje.'); setModalIsSaving(false); return; }
      if (!description?.trim()) { setModalError('La descripción es obligatoria.'); setModalIsSaving(false); return; }
      if (isNaN(amount) || amount <= 0) { setModalError('El importe debe ser mayor que cero.'); setModalIsSaving(false); return; }
      if (!date) { setModalError('La fecha es obligatoria.'); setModalIsSaving(false); return; }

      try {
          // --- Preparar datos para Supabase ---
          const expenseData = {
              user_id: userId,
              trip_id: tripId,
              description: description.trim(),
              amount: amount, // Guardar como positivo (o negativo si tu tabla lo requiere)
              expense_date: date,
              category: category?.trim() || null, // Categoría como texto simple
              notes: notes?.trim() || null
          };

          console.log("Insertando gasto de viaje:", expenseData);

          // --- Llamada a Supabase (INSERT) ---
          const { error } = await supabase
              .from('trip_expenses') // Asegúrate que el nombre de la tabla es correcto
              .insert([expenseData]);

          if (error) {
              // Manejar errores específicos si es necesario (ej. FK violation)
              throw error;
          }

          // --- Éxito ---
          console.log('Gasto de viaje guardado con éxito');
          alert('Gasto de viaje añadido.'); // Puedes usar un toast/snackbar más adelante
          handleCloseTripExpenseModal(); // Cerrar modal

          // Recargar widgets afectados
          fetchRecentActivity(userId); // Actualizar actividad reciente
          fetchNextTripSummary(userId); // Actualizar resumen del próximo viaje (podría haber cambiado el gasto)
          // Considera si necesitas actualizar fetchSummaryData si afecta al gasto variable

      } catch (error) {
          console.error('Error guardando gasto del viaje:', error);
          setModalError(`Error: ${error.message}`);
      } finally {
          setModalIsSaving(false); // Quitar estado de carga
      }
    }, [userId, tripExpenseFormData, supabase, navigate, fetchRecentActivity, fetchNextTripSummary, fetchSummaryData]);


    // Reutilizar handleLogout, scrollToTop
    const handleLogout = () => console.log('Logout pendiente');
    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    const handleProfileClick = () => navigate('/profile');
    const handleHamburgerClick = () => console.log("Toggle sidebar (pendiente)");


    // --- Renderizado ---
    if (isLoading && !userId) { // Muestra carga solo si aún no hay user ID (primera carga)
        return <div>Cargando aplicación...</div>; // O un spinner más elaborado
    }
    if (error) {
        return <div>Error: {error}</div>; // Mostrar error general si falla carga inicial
    }

    return (
        <div className="dashboard-container"> {/* Ajustar si sidebar se saca */}
            <aside className="sidebar">
                 <div className="sidebar-logo"> <img src={finAiLogo} alt="FinAi Logo Small" /> </div>
                 <nav className="sidebar-nav">
                     <Link to="/dashboard" className="nav-button active" title="Dashboard"><i className="fas fa-home"></i> <span>Dashboard</span></Link>
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
                     <Link to="/goals" className="nav-button" title="Metas"><i className="fas fa-bullseye"></i> <span>Metas</span></Link>
                 </nav>
                 <button className="nav-button logout-button" onClick={handleLogout} title="Cerrar Sesión"><i className="fas fa-sign-out-alt"></i> <span>Salir</span></button>
             </aside>

            {/* --- Contenido Principal --- */}
            <main className="main-content">
                {/* --- Cabecera Principal (Reutilizable <Header />) --- */}
                <header className="main-header">
                     <div className="header-left"> 
                        <button onClick={handleHamburgerClick} className="btn-icon hamburger-btn" aria-label="Abrir menú"><i className="fas fa-bars"></i></button> 
                        <div className="header-title"> <span id="pageTitle">Dashboard</span> 
                        </div> 
                      </div> 
                      <div className="header-right"> 
                        <button onClick={toggleNotificationPanel} className="btn-icon notification-btn" aria-label="Notificaciones"> <i className="fas fa-bell"></i> {unreadCount > 0 && <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>} </button> 
                        <button onClick={handleProfileClick} className="btn-icon profile-btn" aria-label="Mi Perfil"> <img src={avatarUrl} alt="Avatar" className="header-avatar-small" /> </button> 
                      </div>
                 </header>

                {/* --- Panel Notificaciones (Componente <NotificationPanel />) --- */}
                {isNotificationPanelOpen && (
                    <div id="notificationPanel" className="notification-panel active"> {/* Añadir active */}
                        <div className="notification-panel-header">
                            <h4>Notificaciones</h4>
                            <button onClick={handleMarkAllRead} id="markAllReadBtn" className="btn-link-small" title="Marcar todas como leídas">Marcar todas leídas</button>
                        </div>
                        <div id="notificationList" className="notification-list">
                            {isLoadingNotifications && <p className="panel-loading">Cargando...</p>}
                            {!isLoadingNotifications && notifications.length === 0 && <p className="panel-empty">No tienes notificaciones.</p>}
                            {!isLoadingNotifications && notifications.map(n => (
                                <div key={n.id} className={`notification-item ${!n.is_read ? 'unread' : ''}`} onClick={() => handleNotificationClick(n.id)}>
                                    <span className={getNotificationIcon(n.type)}></span>
                                    <div className="content">
                                        <p className="message">{n.message || ''}</p>
                                        <span className="timestamp">{timeAgo(n.created_at)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- Grid del Dashboard --- */}
                <section id="dashboardGrid" className="dashboard-grid">
                    {/* Panel Resumen y Acciones (Componente <SummaryPanel />) */}
                    <div className="panel summary-panel">
                         <h3>¡Hola{userName ? `, ${userName}` : ''}!</h3>
                         {summaryData.loading ? <p>Cargando...</p> : summaryData.error ? <p>Error</p> : <>
                             <p className="summary-amount">{summaryData.variableRemaining}</p>
                             <div className="progress-bar-container" style={{ marginTop: '5px', marginBottom: '15px' }}>
                                 <div className="progress-bar" style={{ width: `${summaryData.variablePercentage}%`, backgroundColor: summaryData.progressBarColor, height: '10px', borderRadius: '5px' }}></div>
                                 <small style={{display: 'block', textAlign: 'center', marginTop: '4px'}}>Gasto Variable Restante</small>
                             </div>
                         </>}
                         <div className="panel quick-actions-panel">
                             <h3>Acciones Rápidas</h3>
                             <div className="quick-actions-buttons">
                                 <button onClick={() => handleOpenTransactionModal('gasto')} className="btn btn-action red-btn"><i className="fas fa-minus"></i> Gasto</button>
                                 <button onClick={() => handleOpenTransactionModal('ingreso')} className="btn btn-action green-btn"><i className="fas fa-plus"></i> Ingreso</button>
                             </div>
                         </div>
                     </div>

                    {/* Renderizar los demás paneles (idealmente como componentes) */}
                    {/* Ejemplo BudgetSummaryPanel */}
                    <div className="panel budget-summary-panel">
                         <h3>Presupuestos Este Mes <Link to="/budgets" className="panel-link"><i className="fas fa-arrow-right"></i></Link></h3>
                         <div id="budgetSummaryList">
                             {budgetSummary.loading && <p className="panel-loading">Cargando...</p>}
                             {budgetSummary.error && <p className="panel-loading error-text">Error</p>}
                             {!budgetSummary.loading && !budgetSummary.error && budgetSummary.items.length === 0 && <p className="panel-loading no-data">Sin datos</p>}
                             {!budgetSummary.loading && !budgetSummary.error && budgetSummary.items.map(item => (
                                 <div key={item.id} className="budget-item"> {/* Renderizar item */}
                                     <span className="budget-icon"><i className={getIconClass(item.icon)}></i></span>
                                     <div className="budget-info">
                                        <span className="budget-name">{item.name}</span>
                                        <div className="progress-bar-container mini">
                                            <div className="progress-bar mini" style={{ width: `${item.percentage}%`, backgroundColor: item.color }}></div>
                                        </div>
                                     </div>
                                     <span className="budget-amount">{formatCurrency(item.spent)} / {formatCurrency(item.budget)}</span>
                                 </div>
                             ))}
                             {/* Enlace "Ver todos" si hay más */}
                         </div>
                    </div>
                    <div className="panel upcoming-payments-panel">
                        <h3>Próximos Pagos <Link to="/fixed-expenses" className="panel-link"><i className="fas fa-arrow-right"></i></Link></h3>
                        <div id="upcomingPaymentsList">
                            {upcomingPayments.loading && <p className="panel-loading">Cargando...</p>}
                            {upcomingPayments.error && <p className="panel-loading error-text">Error al cargar</p>}
                            {!upcomingPayments.loading && !upcomingPayments.error && upcomingPayments.items.length === 0 && <p className="panel-loading no-data">Sin pagos próximos</p>}
                            {!upcomingPayments.loading && !upcomingPayments.error && upcomingPayments.items.map(p => (
                                <div key={p.id} className="payment-item">
                                    <span className="payment-icon"><i className={p.icon}></i></span>
                                    <span className="payment-desc">{p.description}</span>
                                    <span className="payment-date">{p.formattedDate}</span>
                                    <span className="payment-amount">{formatCurrency(p.amount)}</span>
                                </div>
                            ))}
                            {/* Enlace ver todos */}
                        </div>
                    </div>
                    {/* Panel Progreso Metas */}
                    <div className="panel goals-progress-panel">
                        <h3>Progreso Metas <Link to="/goals" className="panel-link"><i className="fas fa-arrow-right"></i></Link></h3>
                        <div id="goalsProgressList">
                            {goalsProgress.loading && <p className="panel-loading">Cargando...</p>}
                            {goalsProgress.error && <p className="panel-loading error-text">Error al cargar</p>}
                            {!goalsProgress.loading && !goalsProgress.error && goalsProgress.items.length === 0 && <p className="panel-loading no-data">Sin metas activas</p>}
                            {!goalsProgress.loading && !goalsProgress.error && goalsProgress.items.map(g => (
                                <div key={g.id} className="goal-item" title={`${g.percentage.toFixed(1)}% Completado`}>
                                    <span className="goal-icon"><i className={g.icon}></i></span>
                                    <div className="goal-info"> <span className="goal-name">{g.name}</span> <div className="progress-bar-container mini"> <div className="progress-bar mini" style={{ width: `${g.percentage}%`, backgroundColor: g.color }}></div> </div> </div>
                                    <span className="goal-amount">{formatCurrency(g.current)} / {formatCurrency(g.target)}</span>
                                </div>
                            ))}
                            {goalsProgress.hasMore && <Link to="/goals" className="panel-link more-link">Ver todas...</Link>}
                        </div>
                    </div>
                    {/* Panel Resumen Deudas */}
                    <div className="panel debts-summary-panel">
                        <h3>Deudas <Link to="/debts" className="panel-link" aria-label="Ver Deudas"><i className="fas fa-arrow-right"></i></Link></h3>
                        <div id="debtsSummaryContent">
                            {debtsSummary.loading && <p className="panel-loading">Cargando...</p>}
                            {debtsSummary.error && <p className="panel-loading error-text">Error al cargar</p>}
                            {!debtsSummary.loading && !debtsSummary.error && debtsSummary.items.length === 0 && <p className="panel-loading no-data">Sin deudas activas</p>}
                            {!debtsSummary.loading && !debtsSummary.error && debtsSummary.items.map(debt => (
                                <div key={debt.id} className="debt-item goal-item" title={`${debt.percentage.toFixed(1)}% Pagado`}> {/* Reutilizar estilo goal-item? */}
                                    <span className="goal-icon"><i className={debt.icon}></i></span>
                                    <div className="goal-info"> <span className="goal-name">{debt.name}</span> <div className="progress-bar-container mini"> <div className="progress-bar mini" style={{ width: `${debt.percentage}%`, backgroundColor: debt.color }}></div> </div> </div>
                                    <span className="goal-amount expense">{formatCurrency(debt.balance)}</span> {/* Mostrar pendiente */}
                                </div>
                            ))}
                            {debtsSummary.hasMore && <Link to="/debts" className="panel-link more-link">Ver todas...</Link>}
                        </div>
                    </div>
                    {/* Panel Resumen Préstamos */}
                    <div className="panel loans-summary-panel">
                        <h3>Préstamos <Link to="/loans" className="panel-link" aria-label="Ver Préstamos"><i className="fas fa-arrow-right"></i></Link></h3>
                        <div id="loansSummaryContent">
                            {loansSummary.loading && <p className="panel-loading">Cargando...</p>}
                            {loansSummary.error && <p className="panel-loading error-text">Error al cargar</p>}
                            {!loansSummary.loading && !loansSummary.error && loansSummary.items.length === 0 && <p className="panel-loading no-data">Sin préstamos activos</p>}
                            {!loansSummary.loading && !loansSummary.error && loansSummary.items.map(loan => (
                                <div key={loan.id} className="loan-item goal-item" title={`${loan.percentage.toFixed(1)}% Cobrado`}> {/* Reutilizar estilo goal-item? */}
                                    <span className="goal-icon"><i className={loan.icon}></i></span>
                                    <div className="goal-info"> <span className="goal-name">{loan.name}</span> <div className="progress-bar-container mini"> <div className="progress-bar mini" style={{ width: `${loan.percentage}%`, backgroundColor: loan.color }}></div> </div> </div>
                                    <span className="goal-amount income">{formatCurrency(loan.balance)}</span> {/* Mostrar pendiente por cobrar */}
                                </div>
                            ))}
                            {loansSummary.hasMore && <Link to="/loans" className="panel-link more-link">Ver todos...</Link>}
                        </div>
                    </div>
                    {/* Panel Próximo Viaje */}
                    <div className="panel trips-summary-panel">
                        <h3>Próximo Viaje <Link to="/trips" className="panel-link" aria-label="Ver Viajes"><i className="fas fa-arrow-right"></i></Link></h3>
                        <div id="nextTripSummaryContent">
                            {nextTripSummary.loading && <p className="panel-loading">Buscando...</p>}
                            {nextTripSummary.error && <p className="panel-loading error-text">Error al cargar</p>}
                            {!nextTripSummary.loading && !nextTripSummary.error && !nextTripSummary.trip && <p className="panel-loading no-data">Sin viajes próximos</p>}
                            {!nextTripSummary.loading && !nextTripSummary.error && nextTripSummary.trip && (
                                <div className="trip-summary-item" title={`${nextTripSummary.trip.percentage.toFixed(1)}% Ahorrado`}>
                                    <span className="trip-summary-icon"><i className={nextTripSummary.trip.icon}></i></span>
                                    <div className="trip-summary-info">
                                        <span className="trip-summary-name">{nextTripSummary.trip.name}</span>
                                        {nextTripSummary.trip.destination && <span className="trip-summary-destination">{nextTripSummary.trip.destination}</span>}
                                        <span className="trip-summary-dates">{nextTripSummary.trip.formattedStartDate} - {nextTripSummary.trip.formattedEndDate}</span>
                                        <div className="progress-bar-container mini"> <div className="progress-bar mini" style={{ width: `${nextTripSummary.trip.percentage}%`, backgroundColor: nextTripSummary.trip.color }}></div> </div>
                                    </div>
                                    <span className="trip-summary-amount">{nextTripSummary.trip.formattedSaved} / {nextTripSummary.trip.formattedBudget}</span>
                                </div>
                            )}
                             {/* Enlace ver todos (condicional si hay más viajes futuros?) */}
                             {/* <Link to="/trips" className="panel-link more-link">Ver todos...</Link> */}
                        </div>
                    </div>
                    {/* Panel Planificación Mensual */}
                    <div className="panel evaluation-summary-panel">
                        <h3>Planificación Mes <Link to="/evaluations" className="panel-link" aria-label="Ver Planificación"><i className="fas fa-arrow-right"></i></Link></h3>
                        <div id="evaluationSummaryContent">
                             {evaluationSummary.loading && <p className="panel-loading">Cargando...</p>}
                             {evaluationSummary.error && <p className="panel-loading error-text">Error</p>}
                             {evaluationSummary.noData && !evaluationSummary.loading && !evaluationSummary.error && <p className="panel-loading no-data">Sin planificar</p>}
                             {!evaluationSummary.loading && !evaluationSummary.error && !evaluationSummary.noData && evaluationSummary.items.map((item, index) => (
                                 <div key={index} className="evaluation-item">
                                     <span className="evaluation-icon"><i className={item.icon}></i></span>
                                     <span className="evaluation-label">{item.label}</span>
                                     <span className={`evaluation-amount ${item.amountClass}`}>{item.formattedAmount}</span>
                                 </div>
                             ))}
                             {/* Enlace ver/editar */}
                        </div>
                    </div>
                    {/* Panel Resumen Cuentas */}
                    <div className="panel accounts-summary-panel">
                        <h3>Resumen Cuentas <Link to="/accounts" className="panel-link" aria-label="Ver Cuentas"><i className="fas fa-arrow-right"></i></Link></h3>
                        <div id="accountsSummaryContent">
                            {accountsSummary.loading && <p className="panel-loading">Cargando...</p>}
                            {accountsSummary.error && <p className="panel-loading error-text">Error</p>}
                            {accountsSummary.noData && !accountsSummary.loading && !accountsSummary.error && <p className="panel-loading no-data">Sin cuentas</p>}
                            {!accountsSummary.loading && !accountsSummary.error && !accountsSummary.noData && accountsSummary.items.map(acc => (
                                <div key={acc.id} className="account-summary-item">
                                    <span className="account-summary-icon"><i className={acc.icon}></i></span>
                                    <span className="account-summary-name">{acc.name}</span>
                                    <span className={`account-summary-balance ${acc.balanceClass}`}>{acc.balance}</span>
                                </div>
                            ))}
                            {accountsSummary.hasMore && <Link to="/accounts" className="panel-link more-link">Ver todas...</Link>}
                        </div>
                    </div>
                     <div className="panel recent-activity-panel">
                         <h3>Actividad Reciente <Link to="/transactions" className="panel-link"><i className="fas fa-arrow-right"></i></Link></h3>
                         <div id="recentActivityList">
                             {recentActivity.loading && <p className="panel-loading">Cargando...</p>}
                             {recentActivity.error && <p className="panel-loading error-text">Error</p>}
                             {!recentActivity.loading && !recentActivity.error && recentActivity.items.length === 0 && <p className="panel-loading no-data">Sin actividad</p>}
                             {!recentActivity.loading && !recentActivity.error && recentActivity.items.map(tx => {
                                  const amountClass = tx.type === 'ingreso' ? 'income' : 'expense';
                                  const amountSign = tx.type === 'ingreso' ? '+' : '-';
                                  return (
                                     <div key={tx.id} className="activity-item">
                                         <span className={`activity-icon ${amountClass}`}><i className={getIconClass(tx.categories?.icon)}></i></span>
                                         <span className="activity-desc">{tx.description}</span>
                                         <span className="activity-date">{formatDate(tx.transaction_date)}</span>
                                         <span className={`activity-amount ${amountClass}`}>{amountSign}{formatCurrency(Math.abs(tx.amount))}</span>
                                     </div>
                                  );
                             })}
                             {/* Enlace "Ver todas" si hay más */}
                         </div>
                     </div>
                </section> {/* Fin dashboard-grid */}
            </main> {/* Fin main-content */}
            {isTransactionModalOpen && (
                <div id="transactionModal" className="modal-overlay active" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget) handleCloseTransactionModal(); }}>
                    <div className="modal-content">
                        <h2 id="modalTitleTransaction">{transactionModalMode === 'add' ? 'Añadir Transacción' : 'Editar Transacción'}</h2>
                        <form id="transactionForm" onSubmit={handleTransactionSubmit}>
                            <input type="hidden" id="transactionId" name="transactionId" value={selectedTransactionId || ''} readOnly/>
                            <div className="input-group">
                                <label>Tipo</label>
                                <div className="radio-group type-toggle">
                                    <label className={`type-button expense-btn ${transactionFormData.type === 'gasto' ? 'active' : ''}`}> <input type="radio" name="type" value="gasto" checked={transactionFormData.type === 'gasto'} onChange={handleTransactionFormChange} disabled={modalIsSaving}/> Gasto </label>
                                    <label className={`type-button income-btn ${transactionFormData.type === 'ingreso' ? 'active' : ''}`}> <input type="radio" name="type" value="ingreso" checked={transactionFormData.type === 'ingreso'} onChange={handleTransactionFormChange} disabled={modalIsSaving}/> Ingreso </label>
                                    <label className={`type-button transfer-btn ${transactionFormData.type === 'transferencia' ? 'active' : ''}`}> <input type="radio" name="type" value="transferencia" checked={transactionFormData.type === 'transferencia'} onChange={handleTransactionFormChange} disabled={modalIsSaving}/> Transferencia </label>
                                </div>
                            </div>
                            <div className="input-group"> <label htmlFor="transactionAmount">Importe</label> <input type="number" id="transactionAmount" name="amount" required step="0.01" value={transactionFormData.amount} onChange={handleTransactionFormChange} disabled={modalIsSaving}/> </div>
                            <div className="input-group"> <label htmlFor="transactionDate">Fecha</label> <input type="date" id="transactionDate" name="date" required value={transactionFormData.date} onChange={handleTransactionFormChange} disabled={modalIsSaving}/> </div>
                            <div className="input-group"> <label htmlFor="transactionDescription">Descripción</label> <input type="text" id="transactionDescription" name="description" required value={transactionFormData.description} onChange={handleTransactionFormChange} disabled={modalIsSaving}/> </div>
                            <div className="input-group" id="accountSourceGroup"> <label htmlFor="transactionAccount" id="transactionAccountLabel">{transactionFormData.type === 'transferencia' ? 'Cuenta Origen' : 'Cuenta'}</label> <select id="transactionAccount" name="accountId" required value={transactionFormData.accountId} onChange={handleTransactionFormChange} disabled={modalIsSaving}><option value="" disabled>Selecciona...</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select> </div>
                            {/* Mostrar cuenta destino solo si tipo es transferencia */}
                            {transactionFormData.type === 'transferencia' && (
                                <div className="input-group" id="accountDestinationGroup">
                                    <label htmlFor="transactionAccountDestination">Cuenta Destino</label>
                                    <select id="transactionAccountDestination" name="destinationAccountId" required={transactionFormData.type === 'transferencia'} value={transactionFormData.destinationAccountId} onChange={handleTransactionFormChange} disabled={modalIsSaving}>
                                        <option value="" disabled>Selecciona...</option>
                                        {/* Filtrar para no mostrar la cuenta origen */}
                                        {accounts.filter(a => a.id !== transactionFormData.accountId).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
                                    </select>
                                </div>
                            )}
                            {/* Mostrar categoría solo si NO es transferencia */}
                            {transactionFormData.type !== 'transferencia' && (
                                <div className="input-group" id="categoryGroup">
                                    <label htmlFor="transactionCategory">Categoría</label>
                                    <select id="transactionCategory" name="categoryId" value={transactionFormData.categoryId} onChange={handleTransactionFormChange} disabled={modalIsSaving}>
                                        <option value="">(Sin categoría)</option>
                                        {/* Filtrar categorías según el tipo seleccionado */}
                                        {categories.filter(c => c.type === transactionFormData.type).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            )}
                            <div className="input-group"> <label htmlFor="transactionNotes">Notas</label> <textarea id="transactionNotes" name="notes" rows={2} value={transactionFormData.notes} onChange={handleTransactionFormChange} disabled={modalIsSaving}></textarea> </div>
                            {modalError && <p className="error-message">{modalError}</p>}
                            <div className="modal-actions">
                                <button type="button" onClick={handleCloseTransactionModal} className="btn btn-secondary" disabled={modalIsSaving}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" disabled={modalIsSaving}>{modalIsSaving ? 'Guardando...' : 'Guardar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
             {isTripExpenseModalOpen && (
                 <div id="tripExpenseModal" className="modal-overlay active" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget) handleCloseTripExpenseModal(); }}>
                     <div className="modal-content">
                         <h2 id="modalTitleTripExpense">{tripExpenseModalMode === 'add' ? 'Añadir Gasto Viaje' : 'Editar Gasto Viaje'}</h2>
                         <form id="tripExpenseForm" onSubmit={handleTripExpenseSubmit}>
                             <input type="hidden" id="tripExpenseId" name="tripExpenseId" value={selectedTripExpenseId || ''} readOnly/>
                             <div className="input-group" id="tripSelectorGroup">
                                 <label htmlFor="quickExpenseTripSelect">Viaje</label>
                                 <select id="quickExpenseTripSelect" name="tripId" required value={tripExpenseFormData.tripId} onChange={handleTripExpenseFormChange} disabled={modalIsSaving}>
                                     <option value="" disabled>Selecciona...</option>
                                     {trips.map(trip => <option key={trip.id} value={trip.id}>{trip.name}</option>)}
                                 </select>
                             </div>
                             <div className="input-group"> <label htmlFor="tripExpenseDescription">Descripción</label> <input type="text" id="tripExpenseDescription" name="description" required value={tripExpenseFormData.description} onChange={handleTripExpenseFormChange} disabled={modalIsSaving}/> </div>
                             <div className="input-group"> <label htmlFor="tripExpenseAmount">Importe (€)</label> <input type="number" id="tripExpenseAmount" name="amount" required step="0.01" min="0.01" value={tripExpenseFormData.amount} onChange={handleTripExpenseFormChange} disabled={modalIsSaving}/> </div>
                             <div className="input-group"> <label htmlFor="tripExpenseDate">Fecha</label> <input type="date" id="tripExpenseDate" name="date" required value={tripExpenseFormData.date} onChange={handleTripExpenseFormChange} disabled={modalIsSaving}/> </div>
                             <div className="input-group"> <label htmlFor="tripExpenseCategory">Categoría (Texto)</label> <input type="text" id="tripExpenseCategory" name="category" value={tripExpenseFormData.category} onChange={handleTripExpenseFormChange} disabled={modalIsSaving}/> </div>
                             <div className="input-group"> <label htmlFor="tripExpenseNotes">Notas</label> <textarea id="tripExpenseNotes" name="notes" rows={2} value={tripExpenseFormData.notes} onChange={handleTripExpenseFormChange} disabled={modalIsSaving}></textarea> </div>
                             {modalError && <p className="error-message">{modalError}</p>}
                             <div className="modal-actions">
                                 <button type="button" onClick={handleCloseTripExpenseModal} className="btn btn-secondary" disabled={modalIsSaving}>Cancelar</button>
                                 <button type="submit" className="btn btn-primary" disabled={modalIsSaving}>{modalIsSaving ? 'Guardando...' : 'Guardar Gasto'}</button>
                             </div>
                         </form>
                     </div>
                 </div>
             )}
            {/* --- Botón Scroll-Top --- */}
            {showScrollTop && (
                <button onClick={scrollToTop} id="scrollTopBtn" className="scroll-top-btn visible" title="Volver arriba">
                    <i className="fas fa-arrow-up"></i>
                </button>
            )}

        </div> // Fin dashboard-container
    );
}

export default Dashboard;
