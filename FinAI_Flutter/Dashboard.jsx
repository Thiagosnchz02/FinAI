/*
Archivo: src/pages/Dashboard.jsx
Propósito: Panel de control principal, orquesta la carga y muestra de widgets.
          (Versión FINAL Refactorizada)
*/
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext.jsx';
import toast from 'react-hot-toast';
import '../styles/Dashboard.scss';
import { formatCurrency, formatDate } from '../utils/formatters.js'; // <-- Asegúrate que están aquí
import { getIconClass} from '../utils/iconUtils.js';

// Importar Layouts
import Sidebar from '../components/layout/Sidebar.jsx'; // Ajusta ruta
import MainHeader from '../components/layout/MainHeader.jsx'; // Ajusta ruta
import NotificationPanel from '../components/layout/NotificationPanel.jsx'; // Ajusta ruta
import PhoneVerificationModal from '../components/Auth/PhoneVerificationModal.jsx'; 

// Importar Widgets del Dashboard
import SummaryPanel from '../components/dashboard/SummaryPanel.jsx';
import BudgetWidget from '../components/dashboard/BudgetWidget.jsx';
import UpcomingPaymentsWidget from '../components/dashboard/UpcomingPaymentsWidget.jsx';
import GoalsWidget from '../components/dashboard/GoalsWidget.jsx';
import RecentActivityWidget from '../components/dashboard/RecentActivityWidget.jsx';
import DebtsWidget from '../components/dashboard/DebtsWidget.jsx';
import LoansWidget from '../components/dashboard/LoansWidget.jsx';
import TripWidget from '../components/dashboard/TripWidget.jsx';
import EvaluationWidget from '../components/dashboard/EvaluationWidget.jsx';
import AccountsWidget from '../components/dashboard/AccountsWidget.jsx';
// Importar Modales si se abren desde aquí (Acciones Rápidas)
import TransactionModal from '../components/Transactions/TransactionModal.jsx'; // Asume ruta /components/
import TripExpenseModal from '../components/Trips/TripExpenseModal.jsx'; // Asume ruta /components/Trips/

import defaultAvatar from '../assets/avatar_predeterminado.png';


function Dashboard() {
    // --- Estado del Componente ---
    const { user, userProfile, loading: authLoading, refreshUserProfile } = useAuth();
    const [avatarUrl, setAvatarUrl] = useState(defaultAvatar);
    const [userName, setUserName] = useState('');
    const [isLoading, setIsLoading] = useState(true); // Carga general inicial
    const [error, setError] = useState(null); // Error general de carga

    // Estados de datos para cada Widget
    const [summaryData, setSummaryData] = useState({ loading: true, error: false, variableRemaining: 'N/A', variablePercentage: 0, progressBarColor: '#eee' });
    const [budgetSummary, setBudgetSummary] = useState({ loading: true, error: false, items: [] });
    const [upcomingPayments, setUpcomingPayments] = useState({ loading: true, error: false, items: [] });
    const [goalsProgress, setGoalsProgress] = useState({ loading: true, error: false, items: [], hasMore: false });
    const [recentActivity, setRecentActivity] = useState({ loading: true, error: false, items: [] });
    const [debtsSummary, setDebtsSummary] = useState({ loading: true, error: false, items: [], hasMore: false });
    const [loansSummary, setLoansSummary] = useState({ loading: true, error: false, items: [], hasMore: false });
    const [nextTripSummary, setNextTripSummary] = useState({ loading: true, error: false, trip: null });
    const [evaluationSummary, setEvaluationSummary] = useState({ loading: true, error: false, items: [], noData: false });
    const [accountsSummary, setAccountsSummary] = useState({ loading: true, error: false, items: [], hasMore: false, noData: false });



    // Estado Notificaciones
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
    const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

    // Estados Modales (para acciones rápidas)
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [isTripExpenseModalOpen, setIsTripExpenseModalOpen] = useState(false);
    // 'add' por defecto, el tipo se pasa al abrir
    const [transactionModalProps, setTransactionModalProps] = useState({ mode: 'add', initialData: null, type: 'gasto' });
    const [tripExpenseModalProps, setTripExpenseModalProps] = useState({ mode: 'add', initialData: null });
    const [modalIsSaving, setModalIsSaving] = useState(false); // Guardado para modales de acción rápida
    const [modalError, setModalError] = useState('');
    const [showPhoneVerifyModal, setShowPhoneVerifyModal] = useState(false);
    const [pendingPhoneToVerifyForModal, setPendingPhoneToVerifyForModal] = useState(null);

    // Datos para Dropdowns en Modales
    const [accounts, setAccounts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [trips, setTrips] = useState([]);

    // UI
    const [showScrollTop, setShowScrollTop] = useState(false);

    const navigate = useNavigate();
    const isMounted = useRef(true);

    // --- Carga de Datos ---
    // Funciones individuales para cargar datos de cada widget
    // (Estas funciones podrían ser más complejas o usar RPCs)
    const fetchProfile = useCallback(async (currentUserId) => {
        try {
             const { data, error } = await supabase.from('profiles').select('avatar_url, full_name').eq('id', currentUserId).single();
             if (error && error.status !== 406) throw error;
              if (isMounted.current) {
                 setAvatarUrl(data?.avatar_url || defaultAvatar);
                 setUserName(data?.full_name?.split(' ')[0] || '');
              }
        } catch (err) { console.error("Error fetchProfile:", err); /* Opcional: setError */ }
    }, [supabase]);

     const fetchAccountsAndCategories = useCallback(async (currentUserId) => {
        try {
            const [accountsRes, categoriesRes, tripsRes] = await Promise.all([
                 supabase.from('accounts')
                 .select('id, name, currency, type')
                 .eq('user_id', currentUserId)
                 .eq('is_archived', false)
                 .order('name'),
                 supabase.from('categories')
                    .select('id, name, type, icon, color, parent_category_id, is_default, is_archived') 
                    .or(`user_id.eq.${currentUserId},is_default.eq.true`)
                    .order('name'),
                 supabase.from('trips')
                 .select('id, name')
                 .eq('user_id', currentUserId)
                 .eq('is_archived', false) // También filtrar viajes activos
                 .neq('status', 'finalizado')
                 .order('start_date', { ascending: false })
             ]);
             if (accountsRes.error) throw accountsRes.error;
             if (categoriesRes.error) throw categoriesRes.error;
             if (tripsRes.error) throw tripsRes.error;
              if (isMounted.current) {
                  setAccounts(accountsRes.data || []);
                  setCategories(categoriesRes.data || []);
                  setTrips(tripsRes.data || []);
                  console.log("Dashboard: Categorías cargadas con parent_category_id:", categoriesRes.data); // Log para verificar
              }
        } catch (err) { 
            console.error("Error fetchAccountsAndCategories:", err);
            if (isMounted.current) setError("Error al cargar datos esenciales para formularios.");}
    }, [supabase, setAccounts, setCategories, setTrips]);

    const fetchRecentActivity = useCallback(async (userId) => {
        setRecentActivity({ loading: true, items: [], error: false });
        try {
            const { data, error } = await supabase.from('transactions')
             .select('*, categories(icon, name)') // Pedir icono/nombre categoría
             .eq('user_id', userId).order('transaction_date', { ascending: false }).limit(5);
            if (error) throw error;
             if (isMounted.current) setRecentActivity({ loading: false, items: data || [], error: false });
        } catch (err) { console.error("Error Recent Activity:", err); if (isMounted.current) setRecentActivity({ loading: false, items: [], error: true }); }
    }, [supabase]);

    // --- Carga de Widgets (Ejemplos, implementar todos) ---
    const fetchSummaryData = useCallback(async (userId) => {
        setSummaryData(prev => ({ ...prev, loading: true, error: false }));
        try {
            console.log("Fetching Summary Data...");
            const now = new Date(); const year = now.getFullYear(); const month = now.getMonth();
            const firstDayOfMonth = new Date(Date.UTC(year, month, 1)).toISOString().split('T')[0];
            const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).toISOString().split('T')[0];
   
            const { data: evalData, error: evalError } = await supabase.from('evaluaciones').select('variables')
                .eq('user_id', userId).gte('evaluation_date', firstDayOfMonth).lte('evaluation_date', lastDayOfMonth).maybeSingle();
            if (evalError) throw new Error(`Evaluación: ${evalError.message}`);
            const variableAllocation = Number(evalData?.variables) || 0;
   
            const { data: varCategories, error: catError } = await supabase.from('categories').select('id')
                .eq('type', 'gasto').is('is_variable', true); // Podrías añadir .or(`user_id.eq.${userId},is_default.eq.true`) si aplica
            if (catError) throw new Error(`Categorías Var: ${catError.message}`);
            const varCategoryIds = varCategories ? varCategories.map(c => c.id) : [];
   
            let totalVariableSpending = 0;
            if (varCategoryIds.length > 0) {
                const { data: txData, error: txError } = await supabase.from('transactions').select('amount')
                    .eq('user_id', userId).eq('type', 'gasto').gte('transaction_date', firstDayOfMonth)
                    .lte('transaction_date', lastDayOfMonth).in('category_id', varCategoryIds);
                if (txError) throw new Error(`Transacciones Var: ${txError.message}`);
                totalVariableSpending = (txData || []).reduce((sum, tx) => sum + Math.abs(Number(tx.amount) || 0), 0);
            }
   
            const remaining = variableAllocation - totalVariableSpending;
            const percentage = variableAllocation > 0 ? Math.min(100, Math.max(0, (totalVariableSpending / variableAllocation) * 100)) : (totalVariableSpending > 0 ? 100 : 0);
            let color = 'var(--accent-green)';
            if (percentage >= 95) color = 'var(--accent-red)'; else if (percentage >= 75) color = 'var(--accent-orange)';
   
            if (isMounted.current) { // Comprobar si sigue montado
                setSummaryData({ loading: false, error: false, variableRemaining: formatCurrency(remaining), variablePercentage: percentage, progressBarColor: color });
            }
        } catch (err) {
            console.error("Error fetchSummaryData:", err);
            if (isMounted.current) setSummaryData(prev => ({ ...prev, loading: false, error: true, variableRemaining: 'Error' }));
            toast.error(`Error Resumen G. Variable: ${err.message}`);
        }
    }, [supabase]); // Dependencia de supabase

    const fetchBudgetData = useCallback(async (userId) => {
        setBudgetSummary({ loading: true, items: [], error: false });
        try {
            console.log("Fetching Budget Data...");
            const now = new Date(); const year = now.getFullYear(); const month = now.getMonth();
            const firstDayOfMonth = new Date(Date.UTC(year, month, 1)).toISOString().split('T')[0];
            const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).toISOString().split('T')[0];
   
            const { data: budgets, error: bError } = await supabase.from('budgets').select(`id, category_id, amount, categories ( name, icon, color )`)
                .eq('user_id', userId).eq('start_date', firstDayOfMonth);
            if (bError) throw new Error(`Presupuestos: ${bError.message}`);
   
            if (!budgets || budgets.length === 0) { if (isMounted.current) setBudgetSummary({ loading: false, items: [], error: false }); return; }
   
            const catIds = budgets.map(b => b.category_id);
            const { data: txs, error: tError } = await supabase.from('transactions').select('category_id, amount')
                .eq('user_id', userId).eq('type', 'gasto').gte('transaction_date', firstDayOfMonth)
                .lte('transaction_date', lastDayOfMonth).in('category_id', catIds);
            if (tError) throw new Error(`Transacciones Presup.: ${tError.message}`);
   
            const spendingMap = {}; (txs || []).forEach(tx => { spendingMap[tx.category_id] = (spendingMap[tx.category_id] || 0) + Math.abs(Number(tx.amount) || 0); });
   
            const summaryItems = budgets.slice(0, 5).map(b => {
                const categoryName = b.categories?.name || 'Desconocido';
                const categoryIcon = b.categories?.icon; // Ya tenemos el icono/nombre
                const budgetAmount = Number(b.amount) || 0;
                const spentAmount = spendingMap[b.category_id] || 0;
                const percentage = budgetAmount > 0 ? Math.min(100, Math.max(0, (spentAmount / budgetAmount) * 100)) : 0;
                let color = 'var(--accent-green)'; if (percentage >= 95) color = 'var(--accent-red)'; else if (percentage >= 75) color = 'var(--accent-orange)';
                return { id: b.id, name: categoryName, icon: categoryIcon, spent: spentAmount, budget: budgetAmount, percentage: percentage, color: color };
            });
   
            if (isMounted.current) setBudgetSummary({ loading: false, items: summaryItems, error: false });
        } catch (err) { console.error("Error Budget Widget:", err); if (isMounted.current) setBudgetSummary({ loading: false, items: [], error: true }); toast.error(`Error Presupuestos: ${err.message}`); }
    }, [supabase]);

    const fetchUpcomingPayments = useCallback(async (userId) => {
        setUpcomingPayments({ loading: true, items: [], error: false });
        try {
            console.log("Fetching Upcoming Payments...");
            const today = new Date().toISOString().split('T')[0];
            const { data, error } = await supabase.from('scheduled_fixed_expenses')
                .select(`id, description, amount, next_due_date, categories ( icon )`)
                .eq('user_id', userId).eq('is_active', true).gte('next_due_date', today)
                .order('next_due_date', { ascending: true }).limit(4);
            if (error) throw new Error(`Pagos Próximos: ${error.message}`);
   
            const upcomingItems = (data || []).map(p => ({
                id: p.id, description: p.description, amount: p.amount,
                date: p.next_due_date, formattedDate: formatDate(p.next_due_date),
                icon: p.categories?.icon // Obtenemos el icono directamente
            }));
            if (isMounted.current) setUpcomingPayments({ loading: false, items: upcomingItems, error: false });
        } catch (err) { console.error("Error Upcoming Payments:", err); if (isMounted.current) setUpcomingPayments({ loading: false, items: [], error: true }); toast.error(`Error Pagos Próximos: ${err.message}`); }
    }, [supabase]);

    const fetchGoalsProgress = useCallback(async (userId) => {
        setGoalsProgress({ loading: true, items: [], hasMore: false, error: false });
        try {
             console.log("Fetching Goals Progress...");
             const { data: goalsData, error: goalsError } = await supabase.from('goals').select('id, name, current_amount, target_amount, icon, target_date')
                .eq('user_id', userId)
                //.lt('current_amount', supabase.sql('target_amount'))
                .gt('target_amount', 0)
                .order('target_date', { ascending: true, nullsLast: true }).limit(5);
             if (goalsError) throw goalsError;
   
             const { count: totalGoalsCount, error: countError } = await supabase.from('goals').select('*', { count: 'exact', head: true })
                  .eq('user_id', userId)
                  //.lt('current_amount', supabase.sql('target_amount'));
                  .gt('target_amount', 0)
             if (countError) console.warn("Error counting goals:", countError.message);
   
             const hasMoreGoals = (totalGoalsCount || 0) > (goalsData?.length || 0);
             const progressItems = (goalsData || []).map(g => {
                   const targetAmount = Number(g.target_amount) || 0; const currentAmount = Number(g.current_amount) || 0;
                   const percentage = targetAmount > 0 ? Math.max(0, Math.min((currentAmount / targetAmount) * 100, 100)) : (currentAmount > 0 ? 100 : 0);
                   const isComplete = currentAmount >= targetAmount && targetAmount > 0;
                   let color = 'var(--accent-blue)'; if (isComplete) color = 'var(--accent-green)'; else if (percentage >= 75) color = 'var(--accent-orange)';
                   return { id: g.id, name: g.name, current: currentAmount, target: targetAmount, percentage: percentage, icon: g.icon, color: color }; // Pasamos icon directo
               });
              if (isMounted.current) setGoalsProgress({ loading: false, items: progressItems, hasMore: hasMoreGoals, error: false });
        } catch (err) { console.error("Error Goals Widget:", err); if (isMounted.current) setGoalsProgress({ loading: false, items: [], hasMore: false, error: true }); toast.error(`Error Metas: ${err.message}`); }
    }, [supabase]);

    const fetchDebtsSummary = useCallback(async (userId) => {
        setDebtsSummary({ loading: true, items: [], hasMore: false, error: false });
        try {
              console.log("Fetching Debts Summary...");
              const { data: activeDebts, error: debtsError } = await supabase.from('debts').select('id, creditor, current_balance, initial_amount')
                 .eq('user_id', userId).neq('status', 'Pagada').order('due_date', { ascending: true, nullsLast: true }).limit(3);
              if (debtsError) throw debtsError;
              const { count: totalActiveCount, error: countError } = await supabase.from('debts').select('*', { count: 'exact', head: true })
                  .eq('user_id', userId).neq('status', 'Pagada');
              if (countError) console.warn("Error counting debts:", countError.message);
              const hasMoreDebts = (totalActiveCount || 0) > (activeDebts?.length || 0);
              const summaryItems = (activeDebts || []).map(debt => {
                   const initial = Number(debt.initial_amount) || 0; const current = Number(debt.current_balance) || 0;
                   const paid = initial - current; const safePaid = Math.max(0, paid);
                   const percentage = initial > 0 ? Math.min(100, Math.max(0, (safePaid / initial) * 100)) : 0;
                   let color = 'var(--accent-red)'; if (percentage >= 95) color = 'var(--accent-orange)';
                   return { id: debt.id, name: debt.creditor, balance: current, percentage: percentage, icon: 'fas fa-file-invoice-dollar', color: color };
               });
              if (isMounted.current) setDebtsSummary({ loading: false, items: summaryItems, hasMore: hasMoreDebts, error: false });
        } catch (err) { console.error("Error Debts Widget:", err); if (isMounted.current) setDebtsSummary({ loading: false, items: [], hasMore: false, error: true }); toast.error(`Error Deudas: ${err.message}`); }
    }, [supabase]);

    const fetchLoansSummary = useCallback(async (userId) => {
        setLoansSummary({ loading: true, items: [], hasMore: false, error: false });
         try {
              console.log("Fetching Loans Summary...");
              const { data: activeLoans, error: loansError } = await supabase.from('loans').select('id, debtor, current_balance, initial_amount')
                 .eq('user_id', userId).neq('status', 'Cobrado').order('due_date', { ascending: true, nullsLast: true }).limit(3);
              if (loansError) throw loansError;
               const { count: totalActiveCount, error: countError } = await supabase.from('loans').select('*', { count: 'exact', head: true })
                  .eq('user_id', userId).neq('status', 'Cobrado');
              if (countError) console.warn("Error counting loans:", countError.message);
              const hasMoreLoans = (totalActiveCount || 0) > (activeLoans?.length || 0);
              const summaryItems = (activeLoans || []).map(loan => {
                  const initial = Number(loan.initial_amount) || 0; const current = Number(loan.current_balance) || 0;
                  const collected = initial - current; const safeCollected = Math.max(0, collected);
                  const percentage = initial > 0 ? Math.min(100, Math.max(0, (safeCollected / initial) * 100)) : (initial === 0 ? 100 : 0);
                  let color = 'var(--accent-green)';
                  return { id: loan.id, name: loan.debtor, balance: current, percentage: percentage, icon: 'fas fa-hand-holding-usd', color: color };
              });
              if (isMounted.current) setLoansSummary({ loading: false, items: summaryItems, hasMore: hasMoreLoans, error: false });
         } catch (err) { console.error("Error Loans Widget:", err); if (isMounted.current) setLoansSummary({ loading: false, items: [], hasMore: false, error: true }); toast.error(`Error Préstamos: ${err.message}`); }
    }, [supabase]);

    const fetchNextTripSummary = useCallback(async (userId) => {
        setNextTripSummary({ loading: true, trip: null, error: false });
         try {
              console.log("Fetching Next Trip Summary...");
              const today = new Date().toISOString().split('T')[0];
              const { data: nextTripData, error: tripError } = await supabase.from('trips').select('*').eq('user_id', userId)
                  .gte('start_date', today).order('start_date', { ascending: true }).limit(1).maybeSingle();
              if (tripError) throw tripError;
              if (!nextTripData) { if(isMounted.current) setNextTripSummary({ loading: false, trip: null, error: false }); return; }
   
              const budget = Number(nextTripData.budget) || 0; const saved = Number(nextTripData.saved_amount) || 0;
              const percentage = budget > 0 ? Math.min(100, Math.max(0, (saved / budget) * 100)) : (saved > 0 ? 100 : 0);
              let color = 'var(--accent-purple)'; if (percentage >= 100) color = 'var(--accent-green)'; else if (percentage >= 75) color = 'var(--accent-orange)';
              const processedTrip = {
                   id: nextTripData.id, name: nextTripData.name || 'Próximo Viaje', destination: nextTripData.destination,
                   startDate: nextTripData.start_date, endDate: nextTripData.end_date,
                   saved: saved, budget: budget, percentage: percentage, color: color,
                   formattedStartDate: formatDate(nextTripData.start_date), formattedEndDate: formatDate(nextTripData.end_date),
                   formattedSaved: formatCurrency(saved), formattedBudget: formatCurrency(budget),
                   icon: nextTripData.icon || 'fas fa-plane-departure' // Usar icono de DB si existe
              };
               if (isMounted.current) setNextTripSummary({ loading: false, trip: processedTrip, error: false });
         } catch (err) { console.error("Error Next Trip Widget:", err); if (isMounted.current) setNextTripSummary({ loading: false, trip: null, error: true }); toast.error(`Error Viaje Próximo: ${err.message}`); }
    }, [supabase]);

    const fetchEvaluationSummary = useCallback(async (userId) => {
        setEvaluationSummary({ loading: true, items: [], error: false, noData: false });
        try {
            console.log("Fetching Evaluation Summary...");
            const now = new Date(); const year = now.getFullYear(); const month = now.getMonth();
            const firstDayOfMonth = new Date(Date.UTC(year, month, 1)).toISOString().split('T')[0];
            const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).toISOString().split('T')[0];
            const { data: evaluationData, error: evaluationError } = await supabase.from('evaluaciones').select('*')
                .eq('user_id', userId).gte('evaluation_date', firstDayOfMonth).lte('evaluation_date', lastDayOfMonth).maybeSingle();
            if (evaluationError) throw evaluationError;
  
            if (!evaluationData) { if(isMounted.current) setEvaluationSummary({ loading: false, items: [], error: false, noData: true }); return; }
  
            const planItems = [
                 { label: 'Ingresos Plan.', amount: evaluationData.ingreso, icon: 'fas fa-arrow-down' },
                 { label: 'G. Fijos', amount: evaluationData.fijos, icon: 'fas fa-file-invoice-dollar' },
                 { label: 'G. Variables', amount: evaluationData.variables, icon: 'fas fa-shopping-cart' },
                 { label: 'Ahorro Mes', amount: evaluationData.ahorro_mes, icon: 'fas fa-piggy-bank' },
                 { label: 'Ahorro Colchón', amount: evaluationData.colchon, icon: 'fas fa-shield-alt' },
                 { label: 'Inversión', amount: evaluationData.inversion, icon: 'fas fa-chart-line' },
                 { label: 'Viajes', amount: evaluationData.viajes, icon: 'fas fa-plane-departure' },
                 { label: 'Extra', amount: evaluationData.extra, icon: 'fas fa-question-circle' }
             ].filter(item => item.label === 'Ingresos Plan.' || item.label === 'Extra' || (Number(item.amount) || 0) > 0)
              .slice(0, 4) // Limitar
              .map(item => ({ ...item, formattedAmount: formatCurrency(Number(item.amount) || 0), amountClass: item.label === 'Ingresos Plan.' ? 'income' : 'expense' }));
  
             if (isMounted.current) setEvaluationSummary({ loading: false, items: planItems, error: false, noData: planItems.length === 0 });
        } catch (err) { console.error("Error Evaluation Widget:", err); if (isMounted.current) setEvaluationSummary({ loading: false, items: [], error: true, noData: false }); toast.error(`Error Evaluación: ${err.message}`); }
    }, [supabase]);

    const fetchAccountsSummary = useCallback(async (userId) => {
        setAccountsSummary({ loading: true, items: [], hasMore: false, error: false, noData: false });
        try {
            console.log("Fetching Accounts Summary...");
             const { data: accountsData, error: accountsError } = await supabase.from('accounts').select('id, name, type, currency')
                .eq('user_id', userId).neq('type', 'tarjeta_credito').order('name').limit(3);
             if (accountsError) throw accountsError;
             if (!accountsData || accountsData.length === 0) { if(isMounted.current) setAccountsSummary({ loading: false, items: [], hasMore: false, error: false, noData: true }); return; }
   
             const { count: totalAccountsCount, error: countError } = await supabase.from('accounts').select('*', { count: 'exact', head: true })
                .eq('user_id', userId).neq('type', 'tarjeta_credito');
             if (countError) console.warn("Error counting accounts:", countError.message);
             const hasMoreAccounts = (totalAccountsCount || 0) > accountsData.length;
   
             // *** LLAMADA A RPC 'get_account_balances' ***
             const accountIds = accountsData.map(acc => acc.id);
             let balanceMap = new Map(); // Mapa para guardar balances por ID
   
             if (accountIds.length > 0) {
                 console.log("Calling RPC get_account_balances for IDs:", accountIds);
                 const { data: balanceData, error: rpcError } = await supabase.rpc(
                     'get_account_balances',
                     { account_ids_param: accountIds } // Pasar el array de IDs
                 );
                 if (rpcError) {
                     // Lanzar error para que lo capture el catch general del widget
                     throw new Error(`Error RPC get_account_balances: ${rpcError.message}`);
                 }
                 console.log("RPC Balances:", balanceData);
                 // Crear el mapa de saldos desde la respuesta de la RPC
                 balanceMap = new Map((balanceData || []).map(item => [item.account_id, item.balance]));
             }
             // *** FIN LLAMADA RPC ***
   
             // Mapear datos de cuentas y añadir saldo desde el mapa
             const summaryItems = accountsData.map(acc => {
                 const balance = balanceMap.get(acc.id) ?? null; // Obtener saldo del mapa
                 const balanceText = (balance !== null) ? formatCurrency(balance, acc.currency || 'EUR') : 'N/A';
                 let balanceClass = 'neutral';
                 if (balance !== null) { if (balance > 0) balanceClass = 'income'; else if (balance < 0) balanceClass = 'expense';}
                 // Necesitas getIconForAccountType en utils/iconUtils.js
                 // import { getIconForAccountType } from '../utils/iconUtils.js';
                 const iconClass = getIconClass(acc.type); // Asume getIconClass puede manejar tipos de cuenta
                 return { id: acc.id, name: acc.name, icon: iconClass, balance: balanceText, balanceClass };
             });
   
              if (isMounted.current) setAccountsSummary({ loading: false, items: summaryItems, hasMore: hasMoreAccounts, error: false, noData: summaryItems.length === 0 });
        } catch (err) {
            console.error("Error Accounts Widget:", err);
             if (isMounted.current) setAccountsSummary({ loading: false, items: [], hasMore: false, error: true, noData: false });
             toast.error(`Error Cuentas: ${err.message}`);
        }
    }, [supabase]);

    // --- Manejadores Modales ---
    const handleOpenTransactionModal = useCallback((type = 'gasto') => {
        setTransactionModalProps({ mode: 'add', initialData: null, type: type }); // Pasar tipo aquí
        setModalError(''); setIsTransactionModalOpen(true);
    }, []);
    const handleCloseTransactionModal = useCallback(() => setIsTransactionModalOpen(false), []);

    const handleOpenTripExpenseModal = useCallback(() => {
        setTripExpenseModalProps({ mode: 'add', initialData: null });
        setModalError(''); setIsTripExpenseModalOpen(true);
    }, []);
    const handleCloseTripExpenseModal = useCallback(() => setIsTripExpenseModalOpen(false), []);

    const handleSaveTransaction = useCallback(async (submittedFormData) => {
        if (!user?.id) { toast.error("Usuario no identificado."); return; }
        setModalIsSaving(true); setModalError('');
        const toastId = toast.loading('Guardando...');
  
        const type = submittedFormData.type;
        const amount = Math.abs(parseFloat(submittedFormData.amount) || 0);
        const transaction_date = submittedFormData.transaction_date;
        const description = submittedFormData.description;
        const notes = submittedFormData.notes || null;
  
        try {
            let error = null;
            if (type === 'transferencia') {
                toast.loading('Procesando transferencia...', { id: toastId });
                const sourceAccountId = submittedFormData.account_id;
                const destinationAccountId = submittedFormData.account_destination_id;
                if (!sourceAccountId || !destinationAccountId || sourceAccountId === destinationAccountId) throw new Error('Cuentas origen/destino inválidas.');
  
                // Llamada RPC
                const { error: rpcError } = await supabase.rpc(
                    'record_transfer_transaction',
                    {
                        user_id_param: user.id, source_account_id_param: sourceAccountId,
                        destination_account_id_param: destinationAccountId, amount_param: amount,
                        date_param: transaction_date, description_param: description, notes_param: notes
                    }
                );
                error = rpcError;
            } else { // Gasto o Ingreso
                toast.loading(`Guardando ${type}...`, { id: toastId });
                const account_id = submittedFormData.account_id;
                const category_id = submittedFormData.category_id || null;
                const signedAmount = type === 'gasto' ? -amount : amount;
                if (!account_id) throw new Error('Selecciona una cuenta.');
  
                const transactionData = { user_id: user.id, account_id, category_id, type, description, amount: signedAmount, transaction_date, notes };
                const { error: iError } = await supabase.from('transactions').insert([transactionData]);
                error = iError;
            }
  
            if (error) {
                  const message = error.message.includes(':') ? error.message.split(':').slice(-1)[0].trim() : error.message;
                  throw new Error(message || 'Error desconocido al guardar.');
            }
  
            toast.success('¡Guardado!', { id: toastId });
            handleCloseTransactionModal(); // Cierra este modal específico
            // Recargar widgets afectados AHORA
            fetchRecentActivity(user.id);
            fetchSummaryData(user.id); // Si afecta gasto variable
            fetchAccountsSummary(user.id); // Saldos cambian
            fetchBudgetData(user.id); // Progreso presupuesto cambia
        } catch (error) {
            console.error(`Error guardando tx desde dashboard (${type}):`, error);
            setModalError(`Error: ${error.message}`);
            toast.error(`Error: ${error.message}`, { id: toastId });
        } finally {
            setModalIsSaving(false);
        }
   }, [user, supabase, accounts, categories, fetchRecentActivity, fetchSummaryData, fetchAccountsSummary, fetchBudgetData, handleCloseTransactionModal]); // Dependencias

   const handleSaveTripExpense = useCallback(async (submittedFormData) => {
    if (!user?.id) { toast.error("Usuario no identificado."); return; }
    setModalIsSaving(true); setModalError('');
    const toastId = toast.loading('Guardando gasto de viaje...');
    try {
        const amount = parseFloat(submittedFormData.amount); // Validado en modal
        const expenseData = {
            user_id: user.id, trip_id: submittedFormData.tripId, // Asegúrate que el modal lo pasa
            description: submittedFormData.description.trim(), amount: amount,
            expense_date: submittedFormData.date,
            category: submittedFormData.category?.trim() || null,
            notes: submittedFormData.notes?.trim() || null
        };
        // Validación extra
        if (!expenseData.trip_id) throw new Error("Debes seleccionar un viaje.");

        const { error } = await supabase.from('trip_expenses').insert([expenseData]);
        if (error) throw error;

        toast.success('¡Gasto de Viaje guardado!', { id: toastId });
        handleCloseTripExpenseModal(); // Cierra este modal
        // Recargar widgets afectados
        fetchRecentActivity(user.id); // Gasto nuevo aparecerá aquí
        fetchNextTripSummary(user.id); // Puede afectar progreso si era el próximo viaje
        // Considerar fetchSummaryData si afecta gasto variable? Depende de cómo lo categorices

    } catch(error) {
        console.error("Error guardando gasto viaje desde dashboard:", error);
        setModalError(`Error: ${error.message}`);
        toast.error(`Error: ${error.message}`, { id: toastId });
    } finally {
        setModalIsSaving(false);
    }
// Añade dependencias como handleCloseTripExpenseModal, etc.
}, [user, supabase, handleCloseTripExpenseModal, fetchRecentActivity, fetchNextTripSummary, fetchSummaryData]);

const fetchNotificationCount = useCallback(async (userId) => {
    try {
        const { count, error } = await supabase.from('notifications').select('*', { count: 'exact', head: true })
            .eq('user_id', userId).eq('is_read', false);
        if (error) throw error;
        if (isMounted.current) setUnreadCount(count || 0);
    } catch (err) { console.error("Error Notification Count:", err); /* No mostrar toast por esto? */ }
}, [supabase]);

    // --- Efecto Principal de Carga ---
    const loadAllDashboardData = useCallback(async (currentUserId) => {
        setIsLoading(true); // Carga general
        setError(null);
        try {
            // Cargar perfil y datos para modales primero
            await fetchProfile(currentUserId);
            await fetchAccountsAndCategories(currentUserId);

            // Cargar datos de todos los widgets en paralelo
            // Usar allSettled para que un error en un widget no impida cargar los demás
            await Promise.allSettled([
                fetchSummaryData(currentUserId),
                fetchBudgetData(currentUserId),
                fetchUpcomingPayments(currentUserId),
                fetchGoalsProgress(currentUserId),
                fetchRecentActivity(currentUserId),
                fetchDebtsSummary(currentUserId),
                fetchLoansSummary(currentUserId),
                fetchNextTripSummary(currentUserId),
                fetchEvaluationSummary(currentUserId),
                fetchAccountsSummary(currentUserId),
                fetchNotificationCount(currentUserId)
            ]);
            console.log("Carga inicial completa de widgets.");
        } catch (err) {
            // Error en las cargas iniciales críticas (perfil/cuentas/cat)
            console.error("Error en carga crítica inicial:", err);
            if (isMounted.current) setError(err.message || "Error al cargar datos esenciales.");
        } finally {
            if (isMounted.current) setIsLoading(false);
        }
    }, [fetchProfile, fetchAccountsAndCategories, fetchSummaryData, fetchBudgetData, fetchUpcomingPayments, fetchGoalsProgress, fetchRecentActivity, fetchDebtsSummary, fetchLoansSummary, fetchNextTripSummary, fetchEvaluationSummary, fetchAccountsSummary,fetchNotificationCount]);


   // --- Efectos ---
   useEffect(() => { isMounted.current = true; return () => { isMounted.current = false; }; }, []);

   useEffect(() => { // Carga inicial
       if (authLoading) { setIsLoading(true); return; }
       if (!user) { navigate('/login'); return; }
       loadAllDashboardData(user.id); // Llama a la función orquestadora
   }, [user, authLoading, navigate, loadAllDashboardData]);

   // --- EFECTO PARA COMPROBAR TELÉFONO PENDIENTE DE VERIFICACIÓN ---
    useEffect(() => {
        if (!authLoading && user && userProfile && isMounted.current) { 
            // Solo ejecutar si el usuario, el perfil y el contexto de auth están listos
            const storedUserId = localStorage.getItem('pendingUserIdForPhoneVerification');
            const storedPhone = localStorage.getItem('pendingPhoneToVerify');

            console.log("[Dashboard] Verificando localStorage: storedUserId:", storedUserId, "storedPhone:", storedPhone, "currentUser ID:", user.id);
            console.log("[Dashboard] Estado actual de user.phone:", user.phone, "user.phone_confirmed_at:", user.phone_confirmed_at);

            // El teléfono se considera "no verificado" si:
            // 1. Hay un teléfono pendiente en localStorage para este usuario.
            // 2. Y (el campo user.phone en Supabase Auth está vacío O es diferente al pendiente O user.phone_confirmed_at no existe)
            const needsVerification = storedUserId === user.id && 
                                    storedPhone && 
                                    (user.phone !== storedPhone || !user.phone_confirmed_at);

            if (needsVerification) {
                console.log("[Dashboard] Teléfono pendiente encontrado y necesita verificación. Abriendo modal para:", storedPhone);
                setPendingPhoneToVerifyForModal(storedPhone);
                setShowPhoneVerifyModal(true);
            } else if (storedUserId === user.id && storedPhone) {
                // Si el teléfono ya está verificado y coincide, o si no había nada pendiente para este usuario
                console.log("[Dashboard] Teléfono pendiente ya está verificado/coincide o no hay acción pendiente. Limpiando localStorage.");
                localStorage.removeItem('pendingUserIdForPhoneVerification');
                localStorage.removeItem('pendingPhoneToVerify');
            }
        }
    }, [user, userProfile, authLoading]); // Depende de user, userProfile y authLoading
    // ---------------------------------------------------------------

    // --- CALLBACK PARA CUANDO EL TELÉFONO SE VERIFICA CON ÉXITO ---
    const handlePhoneVerificationSuccess = useCallback(async (verifiedPhoneNumber) => {
        console.log("[Dashboard] Teléfono verificado con éxito en Dashboard:", verifiedPhoneNumber);
        localStorage.removeItem('pendingUserIdForPhoneVerification');
        localStorage.removeItem('pendingPhoneToVerify');
        setShowPhoneVerifyModal(false);
        setPendingPhoneToVerifyForModal(null);
        toast.success("¡Número de teléfono verificado y asociado a tu cuenta!");
        
        if (refreshUserProfile) { // Llama a la función del AuthContext para recargar el perfil global
            console.log("[Dashboard] Llamando a refreshUserProfile desde AuthContext.");
            await refreshUserProfile();
        }
        // Opcional: Recargar datos específicos del dashboard si dependen del teléfono verificado
        // loadAllDashboardData(user.id); // Podría ser excesivo, refreshUserProfile debería ser suficiente
    }, [refreshUserProfile]);


    // --- Manejadores de Modales y Notificaciones ---
    const toggleNotificationPanel = useCallback(() => setIsNotificationPanelOpen(prev => !prev), []);

    const fetchAndDisplayNotifications = useCallback(async () => {
        if (!user?.id) return;
        setIsLoadingNotifications(true);
        try {
            const { data, error } = await supabase.from('notifications').select('*')
                .eq('user_id', user.id).order('created_at', { ascending: false }).limit(15);
            if (error) throw error;
             if (isMounted.current) setNotifications(data || []);
        } catch (err) {
            console.error("Error fetching notifications:", err);
             if (isMounted.current) setNotifications([]);
             // Usar toast aquí puede ser molesto si falla a menudo, considera un icono de error en el panel
             // toast.error("Error al cargar notificaciones.");
        } finally {
             if (isMounted.current) setIsLoadingNotifications(false);
         }
   }, [user?.id, supabase]);

    // Cargar notificaciones al abrir el panel
    useEffect(() => { if (isNotificationPanelOpen) fetchAndDisplayNotifications(); }, [isNotificationPanelOpen, fetchAndDisplayNotifications]);

    const handleMarkAllRead = useCallback(async () => {
        if (!user?.id) return;
        const unreadNotifs = notifications.filter(n => !n.is_read);
        if (unreadNotifs.length === 0) return;
  
        const previousNotifications = [...notifications]; // Copia para revertir
        // Actualizar UI optimista
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
  
        try {
             const { error } = await supabase.from('notifications').update({ is_read: true })
                 .eq('user_id', user.id).eq('is_read', false);
             if (error) throw error;
             toast.success("Notificaciones marcadas como leídas."); // Confirmación
        } catch (err) {
            console.error("Error marking all read:", err);
            toast.error("Error al marcar como leídas.");
             // Revertir UI si falla
             if (isMounted.current) {
                 setNotifications(previousNotifications);
                 fetchNotificationCount(user.id); // Re-sincronizar contador
             }
        }
    }, [user?.id, notifications, supabase, fetchNotificationCount]);

    const handleNotificationClick = useCallback(async (notification) => {
        if (!user?.id || !notification) return;

        console.log("Notification clicked:", notification);

        // 1. Marcar como leída (si no lo está ya)
        if (!notification.is_read) {
            // Actualización optimista en UI
            setNotifications(prev => prev.map(n => 
                n.id === notification.id ? { ...n, is_read: true } : n
            ));
            setUnreadCount(prev => Math.max(0, prev - 1));
            
            try {
                const { error: updateError } = await supabase
                    .from('notifications')
                    .update({ is_read: true })
                    .eq('id', notification.id)
                    .eq('user_id', user.id); // Seguridad extra
                if (updateError) {
                    console.error("Error marking single notification read:", updateError);
                    toast.error("Error al actualizar notificación.");
                    // Revertir UI o recargar contadores si falla
                    fetchNotificationCount(user.id); 
                    fetchAndDisplayNotifications(); // Recargar lista para consistencia
                }
            } catch (err) {
                console.error("Error en try-catch al marcar notificación:", err);
                fetchNotificationCount(user.id);
                fetchAndDisplayNotifications();
            }
        }

        // 2. Lógica de redirección según el tipo de notificación
        if (notification.type === 'trip_completed' && notification.related_entity_type === 'trip' && notification.related_entity_id) {
            console.log(`Navegando a viaje ID: ${notification.related_entity_id} para resumen.`);
            navigate('/trips', { 
                state: { 
                    tripIdToOpen: notification.related_entity_id, 
                    action: 'viewSummary' 
                } 
            });
        } else if (notification.type === 'loan_reminder' && notification.related_entity_type === 'loan' && notification.related_entity_id) {
            navigate('/loans', { state: { loanIdToHighlight: notification.related_entity_id } });
        } else if (notification.type === 'debt_reminder' && notification.related_entity_type === 'debt' && notification.related_entity_id) {
            navigate('/debts', { state: { debtIdToHighlight: notification.related_entity_id } });
        }
        // Añade más casos 'else if' para otros tipos de notificaciones y sus destinos

        setIsNotificationPanelOpen(false); // Cerrar el panel después del clic
    }, [user?.id, supabase, navigate, fetchNotificationCount, fetchAndDisplayNotifications, notifications]); // 'notifications' es dependencia para el find

    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    const handleProfileClick = useCallback(() => navigate('/profile'), [navigate]);
    //const handleHamburgerClick = () => console.log("Toggle sidebar (pendiente)");


    // --- Renderizado ---
    if (isLoading && !user) { return <div className="full-page-loader"><p>Cargando...</p></div>; }
    if (error && !isLoading) { return <div className="full-page-error"><p>Error al cargar: {error}</p></div>; }

    return (
        <div className="dashboard-container"> {/* Ajustar si sidebar se saca */}
            <Sidebar isProcessing={isLoading || modalIsSaving} />

            {/* --- Contenido Principal --- */}
            <main className="main-content">
                <MainHeader
                    pageTitle="Dashboard"
                    avatarUrl={avatarUrl}
                    unreadNotifications={unreadCount}
                    onNotificationClick={toggleNotificationPanel}
                    onProfileClick={handleProfileClick}
                    // onMenuClick={handleHamburgerClick} // Si se implementa
                />

                <NotificationPanel
                    isOpen={isNotificationPanelOpen}
                    notifications={notifications}
                    isLoading={isLoadingNotifications}
                    onMarkAllRead={handleMarkAllRead}
                    onNotificationClick={handleNotificationClick}
                    // onClose={toggleNotificationPanel} // Podría añadirse botón X
                />

                {/* Grid del Dashboard con Widgets */}
                <section id="dashboardGrid" className="dashboard-grid">
                    {/* Pasar datos y handlers a cada widget */}
                    <SummaryPanel
                        userName={userName}
                        summaryData={summaryData} // Pasamos el objeto completo
                        onAddTransaction={handleOpenTransactionModal}
                        onAddTripExpense={handleOpenTripExpenseModal} // O quitar si no se usa
                    />
                    <BudgetWidget data={budgetSummary} isLoading={budgetSummary.loading} error={budgetSummary.error} />
                    <UpcomingPaymentsWidget data={upcomingPayments} isLoading={upcomingPayments.loading} error={upcomingPayments.error} />
                    <GoalsWidget data={goalsProgress} isLoading={goalsProgress.loading} error={goalsProgress.error} />
                    <RecentActivityWidget data={recentActivity} isLoading={recentActivity.loading} error={recentActivity.error} />
                    {/* Añadir los demás widgets de forma similar */}
                    <DebtsWidget data={debtsSummary} isLoading={debtsSummary.loading} error={debtsSummary.error} />
                    <LoansWidget data={loansSummary} isLoading={loansSummary.loading} error={loansSummary.error} />
                    <TripWidget data={nextTripSummary} isLoading={nextTripSummary.loading} error={nextTripSummary.error} />
                    <EvaluationWidget data={evaluationSummary} isLoading={evaluationSummary.loading} error={evaluationSummary.error} noData={evaluationSummary.noData} />
                    <AccountsWidget data={accountsSummary} isLoading={accountsSummary.loading} error={accountsSummary.error} noData={accountsSummary.noData} />

                </section>

            </main> {/* Fin main-content */}

             {/* Modales para Acciones Rápidas */}
             <TransactionModal
                isOpen={isTransactionModalOpen} onClose={handleCloseTransactionModal} onSubmit={handleSaveTransaction}
                mode={transactionModalProps.mode} initialData={transactionModalProps.initialData}
                accounts={accounts} categories={categories}
                isSaving={modalIsSaving} error={modalError} setError={setModalError}
                // Pasar el tipo por defecto al abrir si es necesario
             />
             <TripExpenseModal
                 isOpen={isTripExpenseModalOpen} onClose={handleCloseTripExpenseModal} onSubmit={handleSaveTripExpense}
                 mode={tripExpenseModalProps.mode} initialData={tripExpenseModalProps.initialData}
                 // Necesitará la lista de trips para el selector!
                 trips={trips}
                 isSaving={modalIsSaving} error={modalError}
                 // Trip ID se establece en el modal al seleccionar viaje
             />

             {user && ( // Solo renderizar si hay un usuario (para pasar userId)
                <PhoneVerificationModal
                    isOpen={showPhoneVerifyModal}
                    onClose={() => {
                        setShowPhoneVerifyModal(false);
                        // Considerar si se debe limpiar localStorage aquí si el usuario cierra sin verificar
                        // localStorage.removeItem('pendingPhoneToVerify');
                        // localStorage.removeItem('pendingUserIdForPhoneVerification');
                        // setPendingPhoneToVerifyForModal(null);
                        toast.info("Verificación de teléfono pendiente. Puedes completarla más tarde desde tu perfil.", {duration: 4000});
                    }}
                    userId={user.id} // Pasar el ID del usuario actual
                    phoneToVerify={pendingPhoneToVerifyForModal} // El teléfono que se recogió en el registro
                    onVerificationSuccess={handlePhoneVerificationSuccess}
                />
            )}

             {/* Botón Scroll-Top */}
            {showScrollTop && ( <button onClick={scrollToTop} id="scrollTopBtn" className="scroll-top-btn visible" title="Volver arriba"><i className="fas fa-arrow-up"></i></button> )}

        </div> // Fin contenedor flex principal
    );
}

export default Dashboard;
