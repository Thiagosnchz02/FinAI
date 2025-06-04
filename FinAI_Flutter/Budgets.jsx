/*
Archivo: src/pages/Budgets.jsx
Propósito: Componente para la página de gestión de presupuestos mensuales.
*/
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext.jsx';
import Chart from 'chart.js/auto';
import { formatCurrency } from '../utils/formatters.js';
import BudgetCard from '../components/Budgets/BudgetCard.jsx'; // Importar componente Card
import BudgetModal from '../components/Budgets/BudgetModal.jsx'; // Importar componente Modal
import toast from 'react-hot-toast'; // Importar toast
import ConfirmationModal from '../components/ConfirmationModal.jsx'; // Importar ConfirmationModal
import Sidebar from '../components/layout/Sidebar.jsx'; 
import PageHeader from '../components/layout/PageHeader.jsx';
import '../styles/Budgets.scss';

// Importa imágenes
import defaultAvatar from '../assets/avatar_predeterminado.png';
// Importar mascota si se quiere usar

function Budgets() {
    // --- Estado del Componente ---
    const { user, loading: authLoading } = useAuth();
    const [avatarUrl, setAvatarUrl] = useState(defaultAvatar);
    const [selectedPeriod, setSelectedPeriod] = useState('');
    const [budgets, setBudgets] = useState([]);
    const [categories, setCategories] = useState([]);
    const [spending, setSpending] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingInitial, setIsLoadingInitial] = useState(true);
    const [error, setError] = useState(null);
    const [previousMonthBudgets, setPreviousMonthBudgets] = useState([]);
    const [previousMonthSpending, setPreviousMonthSpending] = useState({});
    const [rolloverAmounts, setRolloverAmounts] = useState({});
    const [isRolloverEnabled, setIsRolloverEnabled] = useState(true); 
    const [evaluationVariableAmount, setEvaluationVariableAmount] = useState(null);

    // Modal Presupuesto
    const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [selectedBudget, setSelectedBudget] = useState(null); // Guarda el objeto budget completo
    const [isSaving, setIsSaving] = useState(false);
    const [modalError, setModalError] = useState(''); // Error para el modal
    const budgetDistributionChartRef = useRef(null);
    const budgetDistributionChartInstance = useRef(null);

    // Modal Confirmación Eliminar
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [budgetToDelete, setBudgetToDelete] = useState(null); // { id, categoryName }
    // UI
    const [showScrollTop, setShowScrollTop] = useState(false);

    const navigate = useNavigate();

    // --- Efectos ---
    useEffect(() => {
        const loadBaseData = async (currentUserId) => {
            setIsLoadingInitial(true);
            setError(null); // Limpiar error al iniciar carga
            //setCategories([]);
            try {
                const [profileRes, categoriesRes] = await Promise.all([
                    supabase.from('profiles').select('avatar_url, enable_budget_rollover').eq('id', currentUserId).single(),
                    supabase.from('categories')
                        // --- MODIFICACIÓN: Asegurar parent_category_id y is_archived ---
                        .select('id, name, type, icon, color, parent_category_id, is_default, is_archived') 
                        .or(`user_id.eq.${currentUserId},is_default.eq.true`)
                        .order('name')
                ]);

                if (profileRes.error && profileRes.status !== 406) throw profileRes.error;
                setAvatarUrl(profileRes.data?.avatar_url || defaultAvatar);

                if (profileRes.data && typeof profileRes.data.enable_budget_rollover === 'boolean') {
                    setIsRolloverEnabled(profileRes.data.enable_budget_rollover);
                }
                console.log("Budgets: Configuración de rollover cargada:", profileRes.data?.enable_budget_rollover);

                if (categoriesRes.error) throw categoriesRes.error;
                setCategories(categoriesRes.data || []);
                console.log("Budgets.jsx: Estado 'categories' actualizado con:", categoriesRes.data?.length || 0, "elementos.");

                if (!selectedPeriod && (categoriesRes.data || []).length > 0) {
                    const today = new Date();
                    const initialPeriod = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
                    setSelectedPeriod(initialPeriod);
                    console.log("Budgets.jsx: Periodo inicial establecido:", initialPeriod);
                } else if (!selectedPeriod && (categoriesRes.data || []).length === 0) {
                    console.log("Budgets.jsx: No hay categorías, no se establece periodo inicial aún.");
                }

            } catch (err) {
                console.error("Error en carga inicial (Budgets Base):", err);
                setError(err.message || "Error al cargar datos base.");
            } finally {
                setIsLoadingInitial(false);
            }
        };

        if (user?.id && !authLoading) { // Solo cargar si el usuario está listo y no hay carga de autenticación
            loadBaseData(user.id);
        } else if (!user && !authLoading) {
            navigate('/login');
        }
    }, [user, authLoading, navigate, supabase, setSelectedPeriod, setAvatarUrl, setCategories, setError, setIsLoadingInitial, setIsRolloverEnabled, selectedPeriod]); 
    
    const fetchDataForPeriod = useCallback(async (currentUserId, period) => {
        if (!currentUserId || !period) {
            // Si no hay periodo, limpiar todo, incluyendo datos del mes anterior
            setBudgets([]);
            setSpending({});
            setPreviousMonthBudgets([]);
            setPreviousMonthSpending({});
            setRolloverAmounts({});
            setEvaluationVariableAmount(null);
            setIsLoading(false); // Asegurar que el loading se detenga
            setError(null);
            return;
        }
        setIsLoading(true); 
        setError(null); 
        // Limpiar datos específicos del periodo antes de cargar nuevos
        setBudgets([]); 
        setSpending({});
        setPreviousMonthBudgets([]);
        setPreviousMonthSpending({});
        setRolloverAmounts({}); 
        setEvaluationVariableAmount(null);
        
        console.log(`Budgets: Cargando datos para periodo: ${period}`);
        try {
            // --- Fechas para el PERIODO ACTUAL ---
            const [currentYear, currentMonthNum] = period.split('-').map(Number); // Mes es 1-12
            const currentMonthIndex = currentMonthNum - 1; // Mes para Date es 0-11
            const currentPeriodStartDate = new Date(Date.UTC(currentYear, currentMonthIndex, 1)).toISOString().split('T')[0];
            const currentPeriodEndDate = new Date(Date.UTC(currentYear, currentMonthIndex + 1, 0)).toISOString().split('T')[0];

            // --- Fechas para el MES ANTERIOR ---
            const prevMonthDate = new Date(currentYear, currentMonthIndex, 1);
            prevMonthDate.setMonth(prevMonthDate.getMonth() - 1); // Retroceder un mes
            const prevYear = prevMonthDate.getFullYear();
            const prevMonth = prevMonthDate.getMonth(); // Mes para Date es 0-11
            const previousPeriodStartDate = new Date(Date.UTC(prevYear, prevMonth, 1)).toISOString().split('T')[0];
            const previousPeriodEndDate = new Date(Date.UTC(prevYear, prevMonth + 1, 0)).toISOString().split('T')[0];
            console.log(`Budgets: Periodo anterior calculado: ${previousPeriodStartDate} a ${previousPeriodEndDate}`);

            // --- Promesas para todas las consultas ---
            const [
                currentBudgetsRes, 
                currentSpendingRes, 
                prevMonthBudgetsRes, // Este es el objeto de respuesta completo
                prevMonthSpendingRes,
                evaluationRes
            ] = await Promise.all([
                supabase.from('budgets').select('*, categories (id, name, icon, color)')
                    .eq('user_id', currentUserId).eq('start_date', currentPeriodStartDate),
                supabase.rpc('get_spending_for_period', { 
                    user_id_param: currentUserId, start_date_param: currentPeriodStartDate, end_date_param: currentPeriodEndDate 
                }),
                supabase.from('budgets').select('category_id, amount')
                    .eq('user_id', currentUserId).eq('start_date', previousPeriodStartDate),
                supabase.rpc('get_spending_for_period', { 
                    user_id_param: currentUserId, start_date_param: previousPeriodStartDate, end_date_param: previousPeriodEndDate 
                }),
                supabase.from('evaluaciones')
                    .select('variables') // Asume que tu campo se llama 'variables'
                    .eq('user_id', currentUserId)
                    .eq('evaluation_date', currentPeriodStartDate) // Asume que evaluation_date es el primer día del mes
                    .maybeSingle()
            ]);

            // Procesar datos del periodo actual
            if (currentBudgetsRes.error) throw new Error(`Error budgets actuales: ${currentBudgetsRes.error.message}`);
            setBudgets(currentBudgetsRes.data || []);

            if (currentSpendingRes.error) throw new Error(`Error gastos actuales: ${currentSpendingRes.error.message}`);
            const currentSpendingMap = (currentSpendingRes.data || []).reduce((map, item) => {
                map[item.category_id] = Number(item.total_spent) || 0; return map;
            }, {});
            setSpending(currentSpendingMap);

            // Procesar datos del periodo anterior
            if (prevMonthBudgetsRes.error) { // Manejar error de la consulta de presupuestos anteriores
                console.error("Error obteniendo presupuestos anteriores:", prevMonthBudgetsRes.error);
                // Decide si quieres lanzar un error o continuar sin datos de rollover
                // Por ahora, continuaremos, rolloverAmounts quedará vacío.
                setPreviousMonthBudgets([]); // Asegurar que es un array vacío
            } else {
                // --- CORRECCIÓN Y LOGS AQUÍ ---
                console.log("Budgets: prevMonthBudgetsRes (respuesta completa):", prevMonthBudgetsRes);
                const tempPrevMonthBudgetsData = prevMonthBudgetsRes.data; // Acceder a la propiedad .data
                console.log("Budgets: prevMonthBudgetsRes.data (debería ser un array):", tempPrevMonthBudgetsData);

                // Asegurar que tempPrevMonthBudgets es un array antes de usar forEach
                const tempPrevMonthBudgets = Array.isArray(tempPrevMonthBudgetsData) ? tempPrevMonthBudgetsData : [];
                setPreviousMonthBudgets(tempPrevMonthBudgets);
                // --- FIN CORRECCIÓN ---

                if (prevMonthSpendingRes.error) throw new Error(`Error gastos anteriores: ${prevMonthSpendingRes.error.message}`);
                const tempPrevSpendingMap = (prevMonthSpendingRes.data || []).reduce((map, item) => {
                    map[item.category_id] = Number(item.total_spent) || 0; return map;
                }, {});
                setPreviousMonthSpending(tempPrevSpendingMap);

                const calculatedRollovers = {};
                // Ahora tempPrevMonthBudgets es garantizado un array
                tempPrevMonthBudgets.forEach(prevBudget => { // Esta es la línea 180 aprox.
                    const prevBudgetAmount = Number(prevBudget.amount) || 0;
                    const prevSpentAmount = tempPrevSpendingMap[prevBudget.category_id] || 0;
                    calculatedRollovers[prevBudget.category_id] = prevBudgetAmount - prevSpentAmount;
                });
                setRolloverAmounts(calculatedRollovers);
                console.log("Budgets: Rollover amounts calculados:", calculatedRollovers);

                if (evaluationRes.error && evaluationRes.status !== 406) { // 406 significa que no encontró fila, lo cual es ok
                console.warn("Error obteniendo evaluación del mes:", evaluationRes.error);
                setEvaluationVariableAmount(null); // No hay evaluación o error
                } else if (evaluationRes.data) {
                    setEvaluationVariableAmount(Number(evaluationRes.data.variables) || 0);
                    console.log("Budgets: Monto de 'variables' de la evaluación cargado:", evaluationRes.data.variables);
                } else {
                    setEvaluationVariableAmount(null); // No se encontró evaluación para el periodo
                    console.log("Budgets: No se encontró evaluación para el periodo", period);
                }
            }
        } catch (err) {
            console.error(`Error cargando datos para el periodo ${period} y anterior:`, err);
            setError(err.message || `Error al cargar datos del periodo.`);
            // Limpiar todos los estados relevantes en caso de error
            setBudgets([]); setSpending({});
            setPreviousMonthBudgets([]); setPreviousMonthSpending({});
            setRolloverAmounts({});
            setEvaluationVariableAmount(null);
        } finally {
            setIsLoading(false);
        }
    }, [supabase]); // Añadir nuevos setters a dependencias

    // Efecto para cargar datos cuando cambia periodo o usuario (después de carga inicial)
    useEffect(() => {
        if (user?.id && selectedPeriod && !isLoadingInitial) {
            fetchDataForPeriod(user.id, selectedPeriod);
        }
    }, [user, selectedPeriod, isLoadingInitial, fetchDataForPeriod]);

    // Efecto Scroll-top
    useEffect(() => {
        const handleScroll = () => setShowScrollTop(window.scrollY > 300);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // --- Cálculos Derivados (Resumen) ---
    const summary = useMemo(() => {
        let totalBaseBudgeted = 0;
        let totalRolloverApplied = 0; // Para saber cuánto rollover se está aplicando
        let totalSpentOnBudgetedCategories = 0;

        budgets.forEach(b => {
            const baseAmount = Number(b.amount) || 0;
            totalBaseBudgeted += baseAmount;
            
            let categoryAvailableBudget = baseAmount;
            if (isRolloverEnabled) { // <-- SOLO APLICAR ROLLOVER SI ESTÁ HABILITADO
                const rollover = rolloverAmounts[b.category_id] || 0;
                categoryAvailableBudget += rollover;
                totalRolloverApplied += rollover; // Sumar al total de rollover
            }
            
            const spentForCategory = spending[b.category_id] || 0;
            totalSpentOnBudgetedCategories += spentForCategory;
        });
        
        // El presupuesto total disponible considera el rollover solo si está habilitado
        const totalAvailableBudgeted = totalBaseBudgeted + (isRolloverEnabled ? totalRolloverApplied : 0);
        const totalRemaining = totalAvailableBudgeted - totalSpentOnBudgetedCategories;

        let remainingToBudget = null;
        let remainingToBudgetText = "No definido en Evaluación";
        if (evaluationVariableAmount !== null) { // Solo si hay un monto de evaluación
            remainingToBudget = evaluationVariableAmount - totalBaseBudgeted;
            if (remainingToBudget > 0) {
                remainingToBudgetText = `${formatCurrency(remainingToBudget)} por asignar`;
            } else if (remainingToBudget < 0) {
                remainingToBudgetText = `${formatCurrency(Math.abs(remainingToBudget))} sobre-presupuestado`;
            } else {
                remainingToBudgetText = "¡Cuadrado con Evaluación!";
            }
        }

        console.log("SUMMARY (Rollover " + (isRolloverEnabled ? "Activado" : "Desactivado") + "):", 
            { totalBaseBudgeted, totalRolloverApplied, totalAvailableBudgeted, totalSpentOnBudgetedCategories, totalRemaining }
        );

        return {
            totalBudgeted: formatCurrency(totalBaseBudgeted), // Presupuesto base del mes
            totalAvailableBudgeted: formatCurrency(totalAvailableBudgeted), // Presupuesto disponible (con rollover si está activo)
            totalRolloverApplied: formatCurrency(totalRolloverApplied), // Cuánto se arrastró (informativo)
            totalSpent: formatCurrency(totalSpentOnBudgetedCategories),
            totalRemaining: formatCurrency(totalRemaining), // Restante sobre el disponible
            remainingIsPositive: totalRemaining >= 0,
            evaluationAmountFormatted: evaluationVariableAmount !== null ? formatCurrency(evaluationVariableAmount) : null,
            remainingToBudgetText: remainingToBudgetText,
            remainingToBudgetIsPositive: remainingToBudget !== null ? remainingToBudget >= 0 : null
        };
    }, [budgets, spending, rolloverAmounts, isRolloverEnabled]);

    // --- NUEVO: useMemo para formatear categorías de GASTO para el selector del modal ---
    const formattedExpenseCategoriesForSelect = useMemo(() => {
        console.log("[Budgets.jsx useMemo formattedExpenseCategoriesForSelect] Iniciando. 'categories'.length:", categories ? categories.length : 'undefined/null');
        if (!categories || categories.length === 0) {
            return [];
        }
        // 1. Filtrar solo categorías de gasto y activas
        const activeExpenseCategories = categories.filter(
            cat => cat.type === 'gasto' && !cat.is_archived
        );

        console.log("[Budgets.jsx useMemo] activeExpenseCategories:", activeExpenseCategories.map(c => ({id: c.id, name: c.name, parent_id: c.parent_category_id, is_default: c.is_default})));

        // 2. Construir la jerarquía
        const categoriesIdsInType = new Set(activeExpenseCategories.map(cat => cat.id));

        const topLevelCategories = activeExpenseCategories.filter(
            cat => !cat.parent_category_id || !categoriesIdsInType.has(cat.parent_category_id)
        ).sort((a, b) => a.name.localeCompare(b.name));

        console.log("[Budgets.jsx useMemo] topLevelCategories (Padres de Gasto):", topLevelCategories.map(c => ({id: c.id, name: c.name, is_default: c.is_default})));
        
        const subCategories = activeExpenseCategories.filter(
            cat => cat.parent_category_id && categoriesIdsInType.has(cat.parent_category_id)
        ).sort((a, b) => a.name.localeCompare(b.name));

        console.log("[Budgets.jsx useMemo] subCategories (Hijas de Gasto):", subCategories.map(c => ({id: c.id, name: c.name, parent_id: c.parent_category_id})));

        const options = [];
        topLevelCategories.forEach(parent => {
            options.push({ 
                id: parent.id, 
                name: `${parent.name}` // Indicar si es default
            });
            const children = subCategories.filter(sub => sub.parent_category_id === parent.id);
            if (children.length > 0) {
                console.log(`[Budgets.jsx useMemo] Hijas encontradas para padre "${parent.name}":`, children.map(c => c.name));
            }
            children.forEach(child => {
                options.push({ 
                    id: child.id, 
                    name: `  ↳ ${child.name}` // Indentación con prefijo
                });
            });
        });
        console.log("Budgets: Categorías de gasto formateadas para selector:", options);
        return options;
    }, [categories]);

    // --- NUEVO: useMemo para preparar datos para el gráfico de distribución del presupuesto ---
    const budgetDistributionChartData = useMemo(() => {
        if (!budgets || budgets.length === 0) {
            return null; // No hay datos para el gráfico
        }

        const labels = [];
        const dataValues = [];
        const backgroundColors = [];

        budgets.forEach(budget => {
            // Asumimos que 'budget.categories' es el objeto categoría anidado
            // y que 'budget.amount' es el importe presupuestado
            if (budget.categories && Number(budget.amount) > 0) {
                labels.push(budget.categories.name || 'Desconocida');
                dataValues.push(Number(budget.amount));
                backgroundColors.push(budget.categories.color || '#cccccc'); // Usar color de la categoría o uno por defecto
            }
        });

        if (labels.length === 0) return null; // No hay datos válidos para graficar

        return {
            labels: labels,
            datasets: [{
                label: 'Distribución del Presupuesto',
                data: dataValues,
                backgroundColor: backgroundColors,
                borderColor: '#fff', // Opcional: borde entre segmentos
                borderWidth: 1,     // Opcional
                hoverOffset: 4
            }]
        };
    }, [budgets]); // Depende de los presupuestos del periodo actual
    // --- FIN NUEVO useMemo ---

    // --- NUEVO: useEffect para crear/actualizar el gráfico de distribución ---
    useEffect(() => {
        if (budgetDistributionChartRef.current && budgetDistributionChartData && !isLoading && !isLoadingInitial) {
            const ctx = budgetDistributionChartRef.current.getContext('2d');
            if (!ctx) return;

            if (budgetDistributionChartInstance.current) {
                budgetDistributionChartInstance.current.destroy();
            }

            const chartOptions = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right', // O 'bottom', 'left', 'top'
                        labels: { 
                            padding: 10, 
                            boxWidth: 12,
                            font: { size: 11 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) label += ': ';
                                if (context.parsed !== null) {
                                    label += formatCurrency(context.parsed);
                                    const total = context.dataset.data.reduce((acc, val) => acc + val, 0);
                                    const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
                                    label += ` (${percentage}%)`;
                                }
                                return label;
                            }
                        }
                    },
                    title: {
                        display: false // El título general ya está en la cabecera de la página
                    }
                }
            };

            budgetDistributionChartInstance.current = new Chart(ctx, {
                type: 'doughnut', // O 'pie'
                data: budgetDistributionChartData,
                options: chartOptions
            });

        } else if (budgetDistributionChartInstance.current) {
            // Si no hay datos o está cargando, destruye el gráfico
            budgetDistributionChartInstance.current.destroy();
            budgetDistributionChartInstance.current = null;
        }

        return () => {
            if (budgetDistributionChartInstance.current) {
                budgetDistributionChartInstance.current.destroy();
                budgetDistributionChartInstance.current = null;
            }
        };
    }, [budgetDistributionChartData, isLoading, isLoadingInitial]); // Redibujar si cambian los datos o el estado de carga
    // --- FIN NUEVO useEffect ---

    // --- Manejadores de Modal ---
    const handleOpenBudgetModal = useCallback((mode = 'add', budget = null) => {
        setModalMode(mode);
        setSelectedBudget(budget); // Guarda el objeto budget completo
        setModalError('');
        setIsSaving(false);
        setIsBudgetModalOpen(true);
        // El estado inicial del formulario se maneja en BudgetModal con initialData
    }, []);

    const handleCloseBudgetModal = useCallback(() => setIsBudgetModalOpen(false), []);

    const handleBudgetFormSubmit = useCallback(async (formDataFromModal) => { // Recibe datos del modal
        if (!user?.id || !selectedPeriod) {
            toast.error("Error: Usuario o periodo no identificado."); return;
        }
        // Validar datos recibidos (ya deberían estar validados en el modal, pero doble check)
        if (!formDataFromModal.categoryId) { setModalError('Selecciona una categoría.'); return; }
        const amount = parseFloat(formDataFromModal.amount);
        if (isNaN(amount) || amount <= 0) { setModalError('El importe debe ser mayor que cero.'); return; }

        setModalError(''); setIsSaving(true);
        const toastId = toast.loading('Guardando presupuesto...');

        try {
            const year = parseInt(selectedPeriod.split('-')[0]);
            const month = parseInt(selectedPeriod.split('-')[1]) - 1;
            const startDate = new Date(Date.UTC(year, month, 1)).toISOString().split('T')[0];
            const endDate = new Date(Date.UTC(year, month + 1, 0)).toISOString().split('T')[0];

            const budgetData = {
                user_id: user.id,
                category_id: formDataFromModal.categoryId,
                amount: amount,
                period: 'mensual', start_date: startDate, end_date: endDate,
            };

            let error;
            if (modalMode === 'edit' && selectedBudget?.id) { // Usa selectedBudget
                const { error: updateError } = await supabase.from('budgets')
                    .update({ amount: budgetData.amount, updated_at: new Date() })
                    .eq('id', selectedBudget.id).eq('user_id', user.id);
                error = updateError;
            } else {
                // Verificar duplicado antes de insertar
                const { data: existing, error: checkError } = await supabase.from('budgets')
                    .select('id').eq('user_id', user.id).eq('category_id', budgetData.category_id).eq('start_date', startDate).maybeSingle();
                if (checkError) throw checkError;
                if (existing) throw new Error(`Ya existe un presupuesto para esta categoría en ${selectedPeriod}.`);

                const { error: insertError } = await supabase.from('budgets').insert([budgetData]);
                error = insertError;
            }

            if (error) throw error;

            toast.success('¡Presupuesto guardado!', { id: toastId });
            handleCloseBudgetModal();
            fetchDataForPeriod(user.id, selectedPeriod); // Recargar datos

        } catch (err) {
            console.error('Error guardando presupuesto:', err);
            setModalError(`Error: ${err.message}`);
            toast.error(`Error: ${err.message}`, { id: toastId });
        } finally {
            setIsSaving(false);
        }
    }, [user, selectedPeriod, modalMode, selectedBudget, supabase, handleCloseBudgetModal, fetchDataForPeriod]);

    const handleDeleteBudget = (budgetId, categoryName) => {
        if (!budgetId || !categoryName) return;
        setBudgetToDelete({ id: budgetId, name: categoryName }); // Guarda id y nombre
        setIsConfirmModalOpen(true); // Abre modal de confirmación
    };

    const confirmDeleteHandler = useCallback(async () => {
        if (!budgetToDelete || !user?.id) {
            toast.error("No se pudo eliminar (faltan datos).");
            setIsConfirmModalOpen(false); setBudgetToDelete(null); return;
        }

        const { id: budgetId, name: categoryName } = budgetToDelete;
        setIsConfirmModalOpen(false);
        const toastId = toast.loading(`Eliminando presupuesto para "${categoryName}"...`);

        try {
            const { error } = await supabase.from('budgets')
                .delete().eq('id', budgetId).eq('user_id', user.id);
            if (error) throw error;

            toast.success('Presupuesto eliminado.', { id: toastId });
            fetchDataForPeriod(user.id, selectedPeriod); // Recargar datos

        } catch (err) {
            console.error('Error eliminando presupuesto:', err);
            toast.error(`Error: ${err.message}`, { id: toastId });
        } finally {
            setBudgetToDelete(null);
        }
    }, [user, selectedPeriod, budgetToDelete, supabase, fetchDataForPeriod]); // Incluir dependencias


    // Reutilizar handleLogout, handleBack, scrollToTop
    const handlePeriodChange = (e) => setSelectedPeriod(e.target.value);
    const handleBack = () => navigate(-1);
    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

    const handleToggleRollover = async (event) => {
        const newRolloverState = event.target.checked;
        
        // Para evitar múltiples toasts si el usuario juega con el toggle rápidamente
        const currentToastId = toast.loading('Actualizando preferencia de rollover...');
        setIsSaving(true); // Usar un estado de 'guardado' general para deshabilitar interacciones

        try {
            const { error: updateProfileError } = await supabase
                .from('profiles')
                .update({ enable_budget_rollover: newRolloverState })
                .eq('id', user.id);

            if (updateProfileError) {
                throw updateProfileError;
            }

            setIsRolloverEnabled(newRolloverState); // Actualizar estado local
            toast.success('Preferencia de rollover actualizada.', { id: currentToastId });
            
            // Opcional: Si quieres que la vista de presupuestos se recalcule inmediatamente
            // para reflejar el cambio de rollover en los 'disponibles', puedes llamar a fetchDataForPeriod.
            // Sin embargo, el useMemo para 'summary' y el que pasa props a BudgetCard ya dependen de 'isRolloverEnabled',
            // por lo que deberían re-renderizar y recalcular automáticamente.
            // Si no lo hacen, una recarga forzada podría ser:
            if (selectedPeriod) {
                 fetchDataForPeriod(user.id, selectedPeriod);
            }

        } catch (err) {
            console.error("Error actualizando preferencia de rollover:", err);
            toast.error(`Error: ${err.message}`, { id: currentToastId });
            // Considera revertir el estado del checkbox si la actualización falla
            // event.target.checked = !newRolloverState; // Esto puede ser complicado con estados controlados
        } finally {
            setIsSaving(false);
        }
    };

    // --- FUNCIÓN handleCopyFromPreviousMonth ACTUALIZADA ---
    const handleCopyFromPreviousMonth = useCallback(async () => {
        if (!user?.id || !selectedPeriod) {
            toast.error("Selecciona un periodo primero.");
            return;
        }

        const [year, monthNum] = selectedPeriod.split('-').map(Number); // Mes es 1-12
        const currentPeriodDate = new Date(year, monthNum - 1, 1); // Mes en Date es 0-11

        const prevMonthDate = new Date(currentPeriodDate);
        prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
        
        const prevYear = prevMonthDate.getFullYear();
        const prevMonth = prevMonthDate.getMonth() + 1; // Para formato YYYY-MM
        const previousPeriodYYYYMM = `${prevYear}-${prevMonth.toString().padStart(2, '0')}`;
        const previousPeriodStartDate = new Date(Date.UTC(prevYear, prevMonth - 1, 1)).toISOString().split('T')[0];

        const currentPeriodStartDate = new Date(Date.UTC(year, monthNum - 1, 1)).toISOString().split('T')[0];
        const currentPeriodEndDate = new Date(Date.UTC(year, monthNum, 0)).toISOString().split('T')[0]; // Día 0 del mes siguiente

        const initialToastId = toast.loading(`Buscando presupuestos de ${new Date(previousPeriodYYYYMM + '-02').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}...`);
        setIsSaving(true);

        try {
            const { data: prevMonthBudgets, error: prevError } = await supabase
                .from('budgets')
                .select('category_id, amount, categories (name)') // Traer nombre de categoría para el mensaje
                .eq('user_id', user.id)
                .eq('start_date', previousPeriodStartDate);

            if (prevError) throw new Error(`Error obteniendo presupuestos anteriores: ${prevError.message}`);

            if (!prevMonthBudgets || prevMonthBudgets.length === 0) {
                toast.error(`No se encontraron presupuestos en ${new Date(previousPeriodYYYYMM + '-02').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })} para copiar.`, { id: initialToastId });
                setIsSaving(false);
                return;
            }
            
            toast.dismiss(initialToastId); // Quitar el toast de "buscando"

            const { data: currentMonthBudgetsData, error: currentError } = await supabase
                .from('budgets')
                .select('id, category_id, amount') // Necesitamos id y amount para comparar/actualizar
                .eq('user_id', user.id)
                .eq('start_date', currentPeriodStartDate);
            
            if (currentError) throw new Error(`Error verificando presupuestos actuales: ${currentError.message}`);
            const currentBudgetsMap = new Map((currentMonthBudgetsData || []).map(b => [b.category_id, b]));

            const newBudgetsToInsert = [];
            const conflictingBudgets = []; // Guardará info de los que ya existen

            prevMonthBudgets.forEach(prevBudget => {
                const existingCurrentBudget = currentBudgetsMap.get(prevBudget.category_id);
                if (existingCurrentBudget) {
                    // Conflicto: la categoría ya tiene un presupuesto este mes
                    // Solo lo consideramos conflicto si el monto es diferente
                    if (parseFloat(existingCurrentBudget.amount) !== parseFloat(prevBudget.amount)) {
                        conflictingBudgets.push({
                            budgetIdToUpdate: existingCurrentBudget.id, // ID del presupuesto actual para UPDATE
                            categoryId: prevBudget.category_id,
                            categoryName: prevBudget.categories?.name || 'Categoría Desconocida',
                            previousAmount: parseFloat(prevBudget.amount),
                            currentAmount: parseFloat(existingCurrentBudget.amount)
                        });
                    }
                    // Si los montos son iguales, no hacemos nada, ya está "copiado"
                } else {
                    // Nueva: esta categoría del mes anterior no tiene presupuesto este mes
                    newBudgetsToInsert.push({
                        user_id: user.id,
                        category_id: prevBudget.category_id,
                        amount: parseFloat(prevBudget.amount),
                        period: 'mensual',
                        start_date: currentPeriodStartDate,
                        end_date: currentPeriodEndDate,
                    });
                }
            });

            let finalAction = 'add_new_only'; // Por defecto, solo añadir nuevas

            if (conflictingBudgets.length > 0) {
                // Mostrar un toast con opciones
                const userChoicePromise = new Promise((resolve) => {
                    const conflictDetails = conflictingBudgets.map(c => 
                        `\n- ${c.categoryName}: Actual ${formatCurrency(c.currentAmount)} vs Anterior ${formatCurrency(c.previousAmount)}`
                    ).join('');

                    const choiceToastId = toast.custom((t) => (
                        <div className={`custom-toast-container ${t.visible ? 'animate-enter' : 'animate-leave'}`} style={{ Width: '100%', padding: '16px', borderRadius: '8px', boxShadow: '0 3px 10px rgba(0,0,0,0.1)' }}>
                            <p style={{ fontWeight: '600', marginBottom: '8px' }}>Conflictos al copiar presupuestos:</p>
                            <p style={{ fontSize: '0.9em', marginBottom: '4px' }}>Algunas categorías ya tienen un presupuesto este mes con un importe diferente:</p>
                            <ul style={{ fontSize: '0.85em', maxHeight: '100px', overflowY: 'auto', paddingLeft: '20px', marginBottom: '12px' }}>
                                {conflictingBudgets.map(c => <li key={c.categoryId}>{c.categoryName}: Actual {formatCurrency(c.currentAmount)} vs Anterior {formatCurrency(c.previousAmount)}</li>)}
                            </ul>
                            <p style={{ fontSize: '0.9em', marginBottom: '12px' }}>Hay {newBudgetsToInsert.length} categoría(s) nueva(s) para añadir.</p>
                            <div style={{ display: 'flex', justifyContent: 'space-around', gap: '10px', width: '100%' }}>
                                <button className="btn btn-sm btn-primary green-btn" onClick={() => { resolve('overwrite_and_add'); toast.dismiss(choiceToastId); }}>Sobrescribir y Añadir</button>
                                <button className="btn btn-sm btn-primary blue-btn" onClick={() => { resolve('add_new_only'); toast.dismiss(choiceToastId); }}>Solo Añadir Nuevas</button>
                                <button className="btn btn-sm btn-danger" onClick={() => { resolve('cancel'); toast.dismiss(choiceToastId); }}>Cancelar</button>
                            </div>
                        </div>
                    ), { duration: Infinity }); // Mantener abierto hasta que se elija
                });
                finalAction = await userChoicePromise;
            }

            if (finalAction === 'cancel') {
                toast.error("Copia de presupuestos cancelada.");
                setIsSaving(false);
                return;
            }

            const operations = [];
            if (finalAction === 'overwrite_and_add') {
                conflictingBudgets.forEach(conflict => {
                    operations.push(
                        supabase.from('budgets')
                            .update({ amount: conflict.previousAmount, updated_at: new Date() })
                            .eq('id', conflict.budgetIdToUpdate)
                            .eq('user_id', user.id)
                    );
                });
            }

            if (newBudgetsToInsert.length > 0) {
                 operations.push(
                    supabase.from('budgets').insert(newBudgetsToInsert)
                 );
            }
            
            if (operations.length === 0 && finalAction !== 'cancel') {
                 toast.success('No hay cambios que aplicar o ya todo coincide.', { duration: 4000 });
                 setIsSaving(false);
                 return;
            }
            
            const operationToastId = toast.loading('Aplicando cambios...');
            const results = await Promise.allSettled(operations.map(op => op)); // Ejecutar todas las promesas

            let errorsInBatch = false;
            results.forEach(result => {
                if (result.status === 'rejected' || (result.status === 'fulfilled' && result.value.error)) {
                    errorsInBatch = true;
                    console.error("Error en operación de lote al copiar presupuestos:", result.status === 'rejected' ? result.reason : result.value.error);
                }
            });

            if (errorsInBatch) {
                toast.error('Algunos presupuestos no se pudieron copiar/actualizar.', { id: operationToastId });
            } else {
                const copiedCount = newBudgetsToInsert.length + (finalAction === 'overwrite_and_add' ? conflictingBudgets.length : 0);
                toast.success(`${copiedCount} presupuesto(s) procesado(s) exitosamente!`, { id: operationToastId });
            }
            fetchDataForPeriod(user.id, selectedPeriod);

        } catch (err) {
            console.error("Error copiando presupuestos:", err);
            toast.error(`Error al copiar: ${err.message}`, { id: initialToastId }); // Usar initialToastId si el otro ya se cerró
        } finally {
            setIsSaving(false);
        }
    }, [user, selectedPeriod, supabase, fetchDataForPeriod, categories, setIsSaving]); 

    // --- Renderizado ---
    const displayPeriod = selectedPeriod
        ? new Date(selectedPeriod + '-02').toLocaleDateString('es-ES', { month: 'long', year: 'numeric'})
        : 'Selecciona periodo';

    // Mostrar carga principal si isLoadingInitial o isLoading (si ya pasó la inicial)
    const showLoadingIndicator = isLoadingInitial || isLoading;

    const budgetPageActions = (
        <div className="header-actions"> {/* Mantener tu clase contenedora para estilos si es necesario */}
            <button 
                onClick={handleCopyFromPreviousMonth} 
                id="copyBudgetBtn" 
                className="btn btn-primary btn-sm" // Ajusta clases según tu _buttons.scss
                disabled={isLoading || isSaving || isLoadingInitial || !selectedPeriod}
                title={!selectedPeriod ? "Selecciona un periodo primero" : "Copiar presupuestos del mes anterior"}
            >
                <i className="fas fa-copy"></i> Copiar del Mes Anterior
            </button>
            <button 
                onClick={() => handleOpenBudgetModal('add')} 
                id="addBudgetBtn" 
                className="btn btn-primary btn-add" // Tus clases existentes
                disabled={isLoadingInitial || (formattedExpenseCategoriesForSelect.length === 0 && !error && !isLoadingInitial) || isSaving}
                title={isLoadingInitial || (formattedExpenseCategoriesForSelect.length === 0 && !error && !isLoadingInitial) ? "Cargando datos necesarios..." : "Añadir nuevo presupuesto"}
            >
                <i className="fas fa-plus"></i> Añadir Presupuesto
            </button>
        </div>
    );


    // --- Renderizado ---
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
                <PageHeader 
                    pageTitle="Presupuestos Mensuales"
                    headerClassName="budgets-header" // Tu clase específica si la necesitas
                    showSettingsButton={false}     // No mostrar botón de settings aquí
                    isProcessingPage={isLoadingInitial || isLoading || isSaving} // Para deshabilitar botones de PageHeader si es necesario
                    actionButton={budgetPageActions} // <-- Pasar los dos botones agrupados
                />

                {/* Controles y Resumen */}
                <div className="budget-main-controls-summary"> {/* Contenedor General */}
                    
                    {/* Título del Periodo (ocupa todo el ancho) */}
                    <h3 className="current-period-display-main">{displayPeriod}</h3>

                    <div className="budget-columns-container"> {/* Contenedor para las dos columnas */}
                        
                        {/* Columna Izquierda: Periodo e Indicador de Presupuestar */}
                        <div className="budget-column-left">
                            <div className="period-selector">
                                <label htmlFor="monthYearPicker">Periodo:</label>
                                <input
                                    type="month" id="monthYearPicker" name="monthYear"
                                    value={selectedPeriod} onChange={handlePeriodChange}
                                    disabled={isLoadingInitial || isLoading || isSaving}
                                />
                            </div>

                            {/* Indicador de Dinero por Presupuestar */}
                            {summary.evaluationAmountFormatted !== null && !isLoadingInitial && !isLoading && (
                                <div className="budget-to-assign-indicator">
                                    <h4>Plan vs. Presupuestado</h4>
                                    <div className="indicator-item">
                                        <span>Evaluación G. Variables:</span>
                                        <strong>{summary.evaluationAmountFormatted}</strong>
                                    </div>
                                    <div className="indicator-item">
                                        <span>Total Presup. Base:</span>
                                        <strong>{summary.totalBudgeted}</strong>
                                    </div>
                                    <div className={`indicator-item ${summary.remainingToBudgetIsPositive === false ? 'negative' : (summary.remainingToBudgetIsPositive === true ? 'positive' : '')}`}>
                                        <span>Por Asignar/Diferencia:</span>
                                        <strong>{summary.remainingToBudgetText}</strong>
                                    </div>
                                </div>
                            )}
                             {summary.evaluationAmountFormatted === null && !isLoadingInitial && !isLoading && (
                                <div className="budget-to-assign-indicator no-evaluation">
                                    <p><i className="fas fa-info-circle"></i> No hay una Evaluación de gastos variables para este mes como referencia.</p>
                                </div>
                            )}
                        </div>

                        {/* Columna Derecha: Rollover y Resumen Numérico */}
                        <div className="budget-column-right">
                            <div className="budget-summary-box main-summary">
                                <div><span>Presup. Base Mes:</span> <strong>{showLoadingIndicator ? '...' : summary.totalBudgeted}</strong></div>
                                {isRolloverEnabled && summary.totalRolloverApplied !== formatCurrency(0) && (
                                    <div>
                                        <span>(+/- Rollover):</span> 
                                        <strong className={ (parseFloat(summary.totalRolloverApplied?.replace(/[^\d,-]/g, '').replace(',', '.')) || 0) >= 0 ? 'positive' : 'negative'}>
                                            {showLoadingIndicator ? '...' : summary.totalRolloverApplied}
                                        </strong>
                                    </div>
                                )}
                                <div><span>Presup. Disponible:</span> <strong id="totalAvailableBudgets">{showLoadingIndicator ? '...' : summary.totalAvailableBudgeted}</strong></div>
                                <div><span>Total Gastado:</span> <strong id="totalSpent">{showLoadingIndicator ? '...' : summary.totalSpent}</strong></div>
                                <div><span>Restante (s/ Disponible):</span> <strong id="totalRemaining" className={summary.remainingIsPositive ? 'positive' : 'negative'}>{showLoadingIndicator ? '...' : summary.totalRemaining}</strong></div>
                                {!isLoadingInitial && (
                                <div className="rollover-toggle-control input-group">
                                    <input 
                                        type="checkbox" id="rolloverToggle" name="rolloverToggle"
                                        checked={isRolloverEnabled} onChange={handleToggleRollover}
                                        disabled={isSaving}
                                        style={{marginRight: '8px', width: 'auto', height: 'auto'}} 
                                    />
                                    <label htmlFor="rolloverToggle" style={{marginBottom: '0', fontWeight: 'normal', fontSize: '0.9em'}}>
                                        Activar Rollover de Presupuesto
                                    </label>
                                    <small title="Arrastra el sobrante o faltante del mes anterior a este mes." style={{marginLeft: '5px', cursor: 'help'}}>
                                        <i className="fas fa-info-circle"></i>
                                    </small>
                                </div>
                            )}
                            </div>
                        </div>
                    </div>
                </div>
                <div className='budget-overview-container'>
                    {/* Contenedor del Gráfico de Distribución */}
                        {!showLoadingIndicator && !error && budgets.length > 0 && budgetDistributionChartData && (
                        <div className="budget-distribution-chart-container">
                            <div className="chart-wrapper" style={{ position: 'relative', height: '180px', width: '100%' }}> {/* Ajusta altura */}
                               <canvas ref={budgetDistributionChartRef}></canvas>
                            </div>
                        </div>
                        )}
                        {!showLoadingIndicator && !error && (!budgets || budgets.length === 0) && (
                        <div className="budget-distribution-chart-container empty-chart">
                                <p>No hay presupuestos para mostrar gráfico.</p>
                        </div>
                    )}
                </div>
                

                {/* Lista de Presupuestos */}
                <div id="budgetList" className="budget-list-grid">
                    {showLoadingIndicator && (
                        <p id="loadingBudgetsMessage" style={{ textAlign: 'center', padding: '20px', color: '#666', gridColumn: '1 / -1' }}>Cargando...</p>
                    )}
                    {error && !showLoadingIndicator && (
                        <p style={{ textAlign: 'center', padding: '20px', color: 'red', gridColumn: '1 / -1' }}>{error}</p>
                    )}
                    {!showLoadingIndicator && !error && budgets.length === 0 && (
                        <p id="noBudgetsMessage" className="empty-list-message" style={{ gridColumn: '1 / -1' }}>No hay presupuestos definidos para {displayPeriod}.</p>
                    )}
                    {/* Renderizar tarjetas usando BudgetCard */}
                    {!showLoadingIndicator && !error && budgets.length > 0 && (
                        budgets.map(b => {
                            const categoryDetails = categories.find(c => c.id === b.category_id);
                            const currentSpentAmount = spending[b.category_id] || 0;
                            const rolloverForCard = isRolloverEnabled ? (rolloverAmounts[b.category_id] || 0) : 0;
                    
                            return (
                                <BudgetCard
                                    key={b.id}
                                    budget={b} // Presupuesto base del mes actual
                                    category={categoryDetails}
                                    spentAmount={currentSpentAmount}
                                    rolloverAmount={rolloverForCard} // <-- NUEVA PROP
                                    isRolloverFeatureEnabled={isRolloverEnabled}
                                    onEdit={() => handleOpenBudgetModal('edit', b)}
                                    onDelete={() => handleDeleteBudget(b.id, categoryDetails?.name || 'esta categoría')}
                                />
                            );
                        })
                    )}
                </div>

            </div> {/* Fin page-container */}

            {/* Modal Añadir/Editar Presupuesto (usando componente) */}
            <BudgetModal
                isOpen={isBudgetModalOpen}
                onClose={handleCloseBudgetModal}
                onSubmit={handleBudgetFormSubmit} // La lógica de submit está en Budgets.jsx
                mode={modalMode}
                // Pasar el objeto budget completo, BudgetModal extraerá lo necesario
                initialData={selectedBudget ? { ...selectedBudget, category_data: categories.find(c=>c.id === selectedBudget.category_id)} : null }
                isSaving={isSaving}
                error={modalError} // Error específico del modal
                availableCategories={formattedExpenseCategoriesForSelect} // Pasar categorías filtradas
                displayPeriod={displayPeriod} // Pasar periodo formateado
                selectedPeriod={selectedPeriod}
            />

            {/* Modal Confirmación Eliminar */}
            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => { setIsConfirmModalOpen(false); setBudgetToDelete(null); }}
                onConfirm={confirmDeleteHandler} // Llama a la lógica de borrado
                title="Confirmar Eliminación"
                message={`¿Seguro eliminar el presupuesto para "${budgetToDelete?.name || ''}" en ${displayPeriod}?`}
                confirmText="Eliminar"
                cancelText="Cancelar"
                isDanger={true}
            />

            {/* Botón Scroll-Top */}
            {showScrollTop && (
                <button onClick={scrollToTop} id="scrollTopBtn" className="scroll-top-btn visible" title="Volver arriba">
                    <i className="fas fa-arrow-up"></i>
                </button>
            )}

        </div> // Fin contenedor flex principal
    );
}

export default Budgets;