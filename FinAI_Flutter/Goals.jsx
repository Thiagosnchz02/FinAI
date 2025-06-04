/*
Archivo: src/pages/Goals.jsx
Propósito: Componente para la página de gestión de metas financieras.
*/
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation  } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext.jsx';
//import { formatCurrency, formatDate } from '../utils/formatters.js';
import Sidebar from '../components/layout/Sidebar.jsx'; 
import PageHeader from '../components/layout/PageHeader.jsx';
import GoalContributionHistoryModal from '../components/Goals/GoalContributionHistoryModal.jsx';
import '../styles/Goals.scss';
// getIconClass se usa ahora dentro de GoalCard
import GoalCard from '../components/Goals/GoalCard.jsx';
import GoalModal from '../components/Goals/GoalModal.jsx';
import SavingsModal from '../components/Goals/SavingsModal.jsx';
import toast from 'react-hot-toast';
import ConfirmationModal from '../components/ConfirmationModal.jsx';

// Importa imágenes
import defaultAvatar from '../assets/avatar_predeterminado.png';
import emptyMascot from '../assets/monstruo_pixar.png';

const CATEGORY_ID_TRANSFER_OUT = '2d55034c-0587-4d9c-9d93-5284d6880c76'; 
const CATEGORY_ID_TRANSFER_IN = '7547fdfa-f7b2-44f4-af01-f937bfcc5be3';

const GOAL_STATUS_FILTER_OPTIONS = [
    { value: 'all_active', label: 'Todas las Activas' },
    { value: 'in_progress', label: 'En Progreso' },
    { value: 'completed_not_archived', label: 'Alcanzadas (No Archivadas)' },
];

const GOAL_SORT_OPTIONS = [
    { value: 'target_date_asc', label: 'Fecha Objetivo (Próximas)' },
    { value: 'target_date_desc', label: 'Fecha Objetivo (Lejanas)' },
    { value: 'remaining_amount_asc', label: 'Restante (Menor a Mayor)' },
    { value: 'remaining_amount_desc', label: 'Restante (Mayor a Menor)' },
    { value: 'progress_asc', label: 'Progreso (Menor %)' },
    { value: 'progress_desc', label: 'Progreso (Mayor %)' },
    { value: 'name_asc', label: 'Nombre (A-Z)' },
    { value: 'name_desc', label: 'Nombre (Z-A)' },
];

function Goals() {
    // --- Estado del Componente ---
    const { user, loading: authLoading } = useAuth();
    const [avatarUrl, setAvatarUrl] = useState(defaultAvatar);
    const [goals, setGoals] = useState([]);
    const [accounts, setAccounts] = useState([]); // Para dropdown en GoalModal
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [goalStatusFilter, setGoalStatusFilter] = useState('all_active');
    const [goalSortConfig, setGoalSortConfig] = useState({ key: 'target_date', direction: 'asc' }); // Por defecto: próximas fechas primero
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [contributionHistory, setContributionHistory] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [historyError, setHistoryError] = useState('');
    

    // Estados Modales
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const [isSavingsModalOpen, setIsSavingsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add'); // Para GoalModal
    const [selectedGoal, setSelectedGoal] = useState(null); // Para editar o añadir ahorro
    const [isSaving, setIsSaving] = useState(false); // Común para ambos modales
    const [modalError, setModalError] = useState('');
    const [showArchivedGoals, setShowArchivedGoals] = useState(false);

    // Estado Confirmación
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [goalToProcess, setGoalToProcess] = useState(null);
    const [goalToDelete, setGoalToDelete] = useState(null);
    // UI
    const [showScrollTop, setShowScrollTop] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();

    // --- Carga de Datos ---
    const fetchData = useCallback(async (currentUserId) => {
        setIsLoading(true); setError(null);
        setGoals([]); setAccounts([]); // Resetear
        console.log(`Goals: Cargando datos para usuario ${currentUserId}`);
        try {
            const [profileRes, accountsRes, goalsRes] = await Promise.all([
                supabase.from('profiles').select('avatar_url').eq('id', currentUserId).single(),
                supabase.from('accounts').select('id, name, type, currency, balance').eq('user_id', currentUserId).eq('is_archived', false)
            .order('name'),
                supabase.from('goals').select('*, related_account_id (id, name)').eq('user_id', currentUserId).order('target_date')
            ]);

            if (profileRes.error && profileRes.status !== 406) throw profileRes.error;
            setAvatarUrl(profileRes.data?.avatar_url || defaultAvatar);

            if (accountsRes.error) throw accountsRes.error;
            setAccounts(accountsRes.data || []);

            if (goalsRes.error) throw goalsRes.error;
            setGoals(goalsRes.data || []);

        } catch (err) {
            console.error("Error cargando datos (Goals):", err);
            setError(err.message || "Error al cargar datos.");
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    // --- Efectos ---
    useEffect(() => { // Carga inicial y scroll
        if (authLoading) { setIsLoading(true); return; }
        if (!user) { navigate('/login'); return; }
        fetchData(user.id);

        const handleScroll = () => setShowScrollTop(window.scrollY > 300);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [user, authLoading, navigate, fetchData]);

    const openEditModal = (goalToEdit) => {
        handleOpenGoalModal('edit', goalToEdit); // Llama a la original con los parámetros correctos
    };

    // --- Manejadores Modales ---
    const handleOpenGoalModal = useCallback((mode = 'add', goal = null) => {
        console.log("handleOpenGoalModal: mode=", mode, "goal=", goal);
        setModalMode(mode); setSelectedGoal(goal); setModalError('');
        setIsSaving(false); setIsGoalModalOpen(true);
    }, []);

    // --- NUEVO useEffect PARA MANEJAR LA NAVEGACIÓN DESDE VIAJES ---
    useEffect(() => {
        if (location.state?.action === 'createFromTrip' && location.state?.tripName) {
            console.log("Goals: Acción 'createFromTrip' detectada con datos:", location.state);
            const { tripName, tripBudget, tripStartDate, tripRelatedAccountId } = location.state;
            
            // Preparamos los datos iniciales para GoalModal
            const goalDataFromTrip = {
                name: `Ahorro para ${tripName}`, // Nombre de la meta
                target_amount: tripBudget,        // Presupuesto del viaje como objetivo
                current_amount: '0.00',           // Ahorrado inicial 0 para la nueva meta
                target_date: tripStartDate,       // Fecha de inicio del viaje como fecha objetivo
                icon: 'fas fa-plane-departure',   // Icono por defecto para metas de viaje (puedes cambiarlo)
                related_account_id: tripRelatedAccountId || '', // Cuenta asociada si viene del viaje
                notes: `Meta de ahorro para el viaje: ${tripName}.`
            };

            // Abrir el modal en modo 'add' pero con estos datos iniciales
            handleOpenGoalModal('add', goalDataFromTrip);

            // Limpiar el estado de la navegación para que no se vuelva a ejecutar
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, navigate, handleOpenGoalModal]); // Depende de location.state y las funciones que llama
    // --- FIN NUEVO useEffect ---

    const handleCloseGoalModal = useCallback(() => { setIsGoalModalOpen(false); setSelectedGoal(null); setModalError(''); }, []);

    const handleOpenSavingsModal = useCallback((goal) => {
        setSelectedGoal(goal); setModalError(''); setIsSaving(false); setIsSavingsModalOpen(true);
    }, []);
    const handleCloseSavingsModal = useCallback(() => { setIsSavingsModalOpen(false); setSelectedGoal(null); setModalError(''); }, []);

    const handleAttemptArchiveGoal = (goalId, goalName) => {
        setGoalToDelete({ id: goalId, name: goalName, action: 'archive' }); // Añadir action
        setIsConfirmModalOpen(true);
    };
    const handleUnarchiveGoal = (goalId, goalName) => {
        setGoalToDelete({ id: goalId, name: goalName, action: 'unarchive' }); // Añadir action
        setIsConfirmModalOpen(true);
    };

    const confirmProcessGoalHandler = useCallback(async () => {
        if (!goalToDelete || !goalToDelete.id || !user?.id) {
            toast.error("Acción no válida o datos incompletos.");
            setIsConfirmModalOpen(false); 
            setGoalToDelete(null); 
            return;
        }

        const { id: goalId, name: goalName, action } = goalToDelete;
        setIsConfirmModalOpen(false); // Cerrar modal
        const toastActionText = action === 'archive' ? 'Archivando' : 'Restaurando';
        const toastId = toast.loading(`${toastActionText} meta "${goalName}"...`);

        try {
            let updateData;
            if (action === 'archive') {
                updateData = { 
                    is_archived: true, 
                    archived_at: new Date().toISOString() 
                };
                console.log(`[Goals.jsx] Archivando meta ID: ${goalId}`, updateData);
            } else if (action === 'unarchive') {
                updateData = { 
                    is_archived: false, 
                    archived_at: null // Asegurarse de poner archived_at a null
                };
                console.log(`[Goals.jsx] Desarchivando meta ID: ${goalId}`, updateData);
            } else {
                throw new Error("Acción desconocida para procesar meta.");
            }

            const { error: dbError } = await supabase
                .from('goals')
                .update(updateData)
                .eq('id', goalId)
                .eq('user_id', user.id);

            if (dbError) {
                console.error(`[Goals.jsx] Error en Supabase al ${action} meta:`, dbError);
                throw dbError;
            }

            toast.success(`Meta "${goalName}" ${action === 'archive' ? 'archivada' : 'restaurada con éxito'}.`, { id: toastId });
            
            console.log(`[Goals.jsx] Meta ${action}da. Llamando a fetchData para refrescar...`);
            await fetchData(user.id); // <-- ASEGÚRATE QUE ESTA LLAMADA SE HAGA Y SEA AWAIT
                                    // Y que fetchData realmente obtenga los datos frescos y actualice el estado 'goals'.

        } catch (err) {
            console.error(`[Goals.jsx] Error al ${action} meta:`, err);
            toast.error(`Error: ${err.message}`, { id: toastId });
        } finally {
            setGoalToDelete(null); // Limpiar goalToDelete
        }
    }, [user, goalToDelete, supabase, fetchData, setIsConfirmModalOpen, setGoalToDelete]);

    // Submit Modal Meta (Añadir/Editar)
    const handleGoalFormSubmit = useCallback(async (submittedFormData) => {
        if (!user?.id) { toast.error("Error: Usuario no identificado."); return; }
        setModalError(''); setIsSaving(true);
        const toastId = toast.loading(modalMode === 'edit' ? 'Guardando...' : 'Creando...');
        try {
            const targetAmount = parseFloat(submittedFormData.target_amount);
            const currentAmountInitial = parseFloat(submittedFormData.current_amount) || 0; // Solo para 'add'

            const dataToSave = {
                user_id: user.id,
                name: submittedFormData.name.trim(), target_amount: targetAmount,
                target_date: submittedFormData.target_date || null,
                icon: submittedFormData.icon.trim() || null,
                related_account_id: submittedFormData.related_account_id || null,
                notes: submittedFormData.notes.trim() || null
            };

            let error;
            if (modalMode === 'edit' && selectedGoal?.id) {
                // UPDATE: No actualizamos current_amount desde aquí
                const { error: updateError } = await supabase.from('goals')
                    .update({ ...dataToSave, updated_at: new Date() })
                    .eq('id', selectedGoal.id).eq('user_id', user.id);
                error = updateError;
            } else {
                // INSERT: Incluimos current_amount inicial
                dataToSave.current_amount = currentAmountInitial;
                const { error: insertError } = await supabase.from('goals').insert([dataToSave]);
                error = insertError;
            }
            if (error) throw error;

            toast.success('¡Meta guardada!', { id: toastId });
            handleCloseGoalModal();
            fetchData(user.id); // Recargar
        } catch (err) {
            console.error('Error guardando meta:', err);
            setModalError(`Error: ${err.message}`);
            toast.error(`Error: ${err.message}`, { id: toastId });
        } finally { setIsSaving(false); }
    }, [user, modalMode, selectedGoal, supabase, handleCloseGoalModal, fetchData]);

    // Submit Modal Añadir Ahorro
    const handleAddSavingsSubmit = useCallback(async (submittedSavingsData) => {
        if (!user?.id || !selectedGoal?.id) {
            toast.error("Error: Datos incompletos.");
            setModalError("Error: Usuario o meta no identificados."); // Si tienes un estado de error para SavingsModal
            return;
        }

        setModalError(''); // Limpiar error del SavingsModal
        setIsSaving(true); // Usar tu estado de guardado
        const operationToastId = toast.loading('Añadiendo ahorro...'); // Renombrado para claridad

        const amountToAdd = parseFloat(submittedSavingsData.amount);
        // ... (otros datos de submittedSavingsData)

        try {
            // Llamada a tu RPC 'record_goal_saving_contribution'
            const { error: rpcError } = await supabase.rpc('record_goal_saving_contribution', {
                p_user_id: user.id,
                p_goal_id: selectedGoal.id,
                p_amount: amountToAdd,
                p_payment_date: submittedSavingsData.date,
                p_source_account_id: submittedSavingsData.source_account_id || null,
                p_notes: submittedSavingsData.notes || null,
                p_transfer_out_category_id: CATEGORY_ID_TRANSFER_OUT,
                p_transfer_in_category_id: CATEGORY_ID_TRANSFER_IN
            });

            if (rpcError) {
                console.error("Error RPC record_goal_saving_contribution:", rpcError);
                throw new Error(rpcError.message || "Error al registrar la aportación.");
            }

            toast.success('¡Ahorro añadido con éxito!', { id: operationToastId });
            handleCloseSavingsModal(); // Cerrar el modal de añadir ahorro
            
            // Volver a cargar los datos para obtener el estado más reciente de la meta
            // y de las cuentas (si se afectaron).
            // fetchData debería actualizar el estado 'goals' y otros relevantes.
            await fetchData(user.id); 

            // --- VERIFICAR SI LA META SE COMPLETÓ Y SUGERIR ARCHIVAR ---
            // Necesitamos encontrar la meta actualizada en la lista de 'goals' del estado,
            // o hacer una nueva consulta para obtener solo esa meta.
            // Es más eficiente si fetchData actualiza 'goals' y luego buscamos aquí.
            
            // Para asegurar que trabajamos con la meta actualizada después de fetchData:
            // Hacemos una pequeña pausa para permitir que el estado 'goals' se actualice
            // y luego buscamos la meta. Esto no es ideal, sería mejor si fetchData devolviera
            // las metas actualizadas o si pudiéramos pasar un callback.
            // Una forma más robusta sería que fetchData devuelva las metas y buscar ahí.
            // Por ahora, una pequeña demora para el ejemplo:

            setTimeout(async () => { // Usar async aquí si handleAttemptArchiveGoal es async
                // Asumimos que 'goals' (el estado) ya se actualizó por fetchData
                // Esta lógica de buscar la meta actualizada podría ir en un useEffect que dependa de 'goals' y 'selectedGoal.id'
                // pero para mantenerlo aquí por ahora:
                const { data: updatedGoalData, error: goalCheckError } = await supabase
                    .from('goals')
                    .select('id, name, current_amount, target_amount, is_archived')
                    .eq('id', selectedGoal.id)
                    .eq('user_id', user.id)
                    .single();

                if (goalCheckError) {
                    console.error("Error al verificar estado de la meta después de añadir ahorro:", goalCheckError);
                    return;
                }

                if (updatedGoalData && !updatedGoalData.is_archived) { // Solo si no está ya archivada
                    const current = Number(updatedGoalData.current_amount) || 0;
                    const target = Number(updatedGoalData.target_amount) || 0;

                    if (target > 0 && current >= target) { // Meta completada
                        toast.dismiss(); // Quitar toasts anteriores
                        toast((t) => (
                            <div className="custom-toast-container archive-suggestion-toast">
                                <span className="toast-icon">🎉</span>
                                <div className="toast-content">
                                    <p className="toast-title">¡Meta "{updatedGoalData.name}" Conseguida!</p>
                                    <p className="toast-body">Has alcanzado tu objetivo. ¿Quieres archivar esta meta ahora?</p>
                                </div>
                                <div className="toast-actions horizontal">
                                    <button
                                        className="btn btn-primary btn-sm green-btn"
                                        onClick={() => {
                                            toast.dismiss(t.id);
                                            handleAttemptArchiveGoal(updatedGoalData.id, updatedGoalData.name);
                                        }}
                                    >
                                        Sí, Archivar
                                    </button>
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => toast.dismiss(t.id)}
                                    >
                                        No, después
                                    </button>
                                </div>
                                <button onClick={() => toast.dismiss(t.id)} className="toast-close-btn minimal">
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                        ), { duration: 15000, position: "top-center" }); // Toast persistente
                    }
                }
            }, 500); // Pequeña demora para permitir que fetchData actualice el estado 'goals'
            // ----------------------------------------------------------

        } catch (error) {
            console.error('Error añadiendo ahorro a la meta:', error);
            // setModalError(`Error: ${error.message}`); // Si tienes un estado de error para SavingsModal
            toast.error(`Error: ${error.message}`, { id: operationToastId });
        } finally {
            setIsSaving(false); // Usar tu estado de guardado
        }
    }, [user, selectedGoal, supabase, handleCloseSavingsModal, fetchData, setIsSaving, handleAttemptArchiveGoal]);

    
    const fetchContributionHistory = useCallback(async (goalId) => {
        if (!goalId || !user?.id) {
            setHistoryError("No se pudo identificar la meta o el usuario.");
            return;
        }
        setIsLoadingHistory(true);
        setHistoryError('');
        setContributionHistory([]);
        console.log(`[Goals.jsx] Fetching contribution history for goal ID: ${goalId}`);
        try {
            // Asumimos que las aportaciones son las transacciones de INGRESO a la cuenta vinculada de la meta
            // O si la meta es abstracta, no habrá historial de transacciones directas.
            // Por ahora, buscaremos transacciones vinculadas por 'related_goal_id'.
            const { data, error: dbError } = await supabase
                .from('transactions')
                .select('id, transaction_date, description, amount, notes, type, account_id (name)') // Campos a mostrar
                .eq('user_id', user.id)
                .eq('related_goal_id', goalId) // Filtrar por el ID de la meta
                .order('transaction_date', { ascending: false }) // Más recientes primero
                .limit(20); // Mostrar, por ejemplo, las últimas 20 aportaciones

            if (dbError) throw dbError;
            
            setContributionHistory(data || []);
            console.log(`[Goals.jsx] Contribution history fetched:`, data);
        } catch (err) {
            console.error("Error fetching contribution history:", err);
            setHistoryError('No se pudo cargar el historial de aportaciones.');
        } finally {
            setIsLoadingHistory(false);
        }
    }, [supabase, user?.id]);

    const handleOpenHistoryModal = useCallback((goal) => {
        setSelectedGoal(goal); // Usamos selectedGoal para saber de qué meta es el historial
        fetchContributionHistory(goal.id);
        setIsHistoryModalOpen(true);
    }, [fetchContributionHistory]);

    const handleCloseHistoryModal = useCallback(() => {
        setIsHistoryModalOpen(false);
        setSelectedGoal(null); // Limpiar selectedGoal si solo se usa para este modal
        setContributionHistory([]);
        setHistoryError('');
    }, []);

    // Otros manejadores
    
    const handleBack = useCallback(() => navigate(-1), [navigate]);
    const scrollToTop = useCallback(() => window.scrollTo({ top: 0, behavior: 'smooth' }), []);

    const goalPageAction = (
        <button 
            onClick={() => handleOpenGoalModal('add')} 
            id="addGoalBtn" 
            className="btn btn-primary btn-add" // Tus clases existentes
            // disabled se maneja por isProcessingPage en PageHeader,
            // o puedes añadir lógica específica aquí si es necesario
            // disabled={isLoading || isSaving} 
        >
            <i className="fas fa-plus"></i> Añadir Meta
        </button>
    );

    const { activeGoals, archivedGoals } = useMemo(() => {
        console.log("[Goals.jsx useMemo active/archived] Recalculando. goals:", goals.length, "Filter:", goalStatusFilter, "Sort:", goalSortConfig);
        let filtered = goals.filter(goal => !goal.is_archived);

        // Aplicar filtro de estado
        if (goalStatusFilter === 'in_progress') {
            filtered = filtered.filter(goal => (Number(goal.current_amount) || 0) < (Number(goal.target_amount) || 0));
        } else if (goalStatusFilter === 'completed_not_archived') {
            filtered = filtered.filter(goal => (Number(goal.current_amount) || 0) >= (Number(goal.target_amount) || 0) && (Number(goal.target_amount) || 0) > 0);
        }
        // 'all_active' ya está cubierto por el filtro inicial !goal.is_archived

        // Aplicar ordenación
        if (goalSortConfig.key && filtered.length > 0) {
            const { key, direction } = goalSortConfig;
            filtered.sort((a, b) => {
                let valA, valB;
                if (key === 'target_date') {
                    valA = a.target_date ? new Date(a.target_date).getTime() : (direction === 'asc' ? Infinity : -Infinity);
                    valB = b.target_date ? new Date(b.target_date).getTime() : (direction === 'asc' ? Infinity : -Infinity);
                } else if (key === 'remaining_amount') {
                    valA = Math.max(0, (Number(a.target_amount) || 0) - (Number(a.current_amount) || 0));
                    valB = Math.max(0, (Number(b.target_amount) || 0) - (Number(b.current_amount) || 0));
                } else if (key === 'progress') {
                    const progA = (Number(a.target_amount) || 0) > 0 ? ((Number(a.current_amount) || 0) / (Number(a.target_amount))) * 100 : 0;
                    const progB = (Number(b.target_amount) || 0) > 0 ? ((Number(b.current_amount) || 0) / (Number(b.target_amount))) * 100 : 0;
                    valA = Math.min(100, Math.max(0, progA));
                    valB = Math.min(100, Math.max(0, progB));
                } else { // name
                    valA = String(a.name || '').toLowerCase();
                    valB = String(b.name || '').toLowerCase();
                }

                let comparison = 0;
                if (valA < valB) comparison = -1;
                if (valA > valB) comparison = 1;
                
                let finalResult = direction === 'asc' ? comparison : -comparison;

                if (finalResult === 0 && key !== 'name') { // Desempate por nombre
                    const nameA = String(a.name || '').toLowerCase();
                    const nameB = String(b.name || '').toLowerCase();
                    if (nameA < nameB) return -1;
                    if (nameA > nameB) return 1;
                }
                return finalResult;
            });
        }
        
        const archived = goals.filter(goal => goal.is_archived)
            .sort((a, b) => (new Date(b.archived_at || 0)) - (new Date(a.archived_at || 0)));
            
        return { activeGoals: filtered, archivedGoals: archived };
    }, [goals, goalStatusFilter, goalSortConfig]);

    const accountsForSavingsModal = useMemo(() => {
        if (!selectedGoal) { // Si no hay meta seleccionada para el ahorro, filtra solo por tipo
            return accounts.filter(acc => acc.type !== 'tarjeta_credito');
        }
        // Si hay meta seleccionada, filtra por tipo Y para no incluir la cuenta destino de la meta
        return accounts.filter(acc => 
            acc.type !== 'tarjeta_credito' && 
            acc.id !== selectedGoal.related_account_id 
        );
    }, [accounts, selectedGoal]);

    const handleGoalStatusFilterChange = (event) => {
        setGoalStatusFilter(event.target.value);
    };

    const handleGoalSortChange = (event) => {
        const valueParts = event.target.value.split('_');
        const direction = valueParts.pop();
        const key = valueParts.join('_');
        setGoalSortConfig({ key, direction });
    };

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
                    pageTitle="Mis Metas"
                    headerClassName="goals-header" // Tu clase específica si la necesitas
                    showSettingsButton={false}     // No mostrar botón de settings aquí
                    isProcessingPage={isLoading || isSaving} // Para deshabilitar botones de PageHeader si es necesario
                    actionButton={goalPageAction}    // <-- Pasar el botón "Añadir Meta"
                />

                <div className="view-controls-bar goals-controls">
                    {/* --- NUEVOS CONTROLES DE FILTRO Y ORDENACIÓN --- */}
                    <div className="filter-control goals-filter">
                        <label htmlFor="goalStatusFilter">Mostrar:</label>
                        <select id="goalStatusFilter" value={goalStatusFilter} onChange={handleGoalStatusFilterChange} disabled={isLoading || showArchivedGoals}>
                            {GOAL_STATUS_FILTER_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="sort-control goals-sort">
                        <label htmlFor="goalSort">Ordenar por:</label>
                        <select id="goalSort" value={`${goalSortConfig.key}_${goalSortConfig.direction}`} onChange={handleGoalSortChange} disabled={isLoading || showArchivedGoals}>
                            {GOAL_SORT_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    {/* ------------------------------------------- */}
                    <button
                        onClick={() => setShowArchivedGoals(prev => !prev)}
                        className="btn btn-secondary btn-sm"
                        disabled={isLoading}
                    >
                        {showArchivedGoals ? 'Ocultar Archivadas' : 'Mostrar Archivadas'} 
                        ({archivedGoals.length})
                    </button>
                </div>

                {isLoading && <p className="loading-message">Cargando metas...</p>}
                {error && <p className="error-message">{error}</p>}

                {!isLoading && !error && activeGoals.length === 0 && !showArchivedGoals && (
                    <div className="empty-list-message welcome-options"> {/* Usar tus clases */}
                        <img src={emptyMascot} alt="Mascota FinAi" className="empty-mascot large" />
                        <h2>¡Define tu primera meta de ahorro!</h2>
                        <button onClick={() => handleOpenGoalModal('add')} className="btn btn-primary">
                            <i className="fas fa-plus"></i> Crear Meta
                        </button>
                    </div>
                )}
                <div id="goalListActive" className="goal-list-grid">
                    {!isLoading && activeGoals.map(g => ( // Cambiado goal a g para evitar conflicto con estado
                        <GoalCard
                            key={g.id}
                            goal={g}
                            onAddSavings={handleOpenSavingsModal}
                            onEdit={() => handleOpenGoalModal('edit', g)}
                            onArchive={() => handleAttemptArchiveGoal(g.id, g.name)} // Pasar para archivar
                            // onDelete ya no se pasa directamente
                            onViewHistory={() => handleOpenHistoryModal(g)}
                        />
                    ))}
                </div>

                {showArchivedGoals && (
                    <>
                        <h2 className="content-section-header">Metas Archivadas</h2>
                        {!isLoading && archivedGoals.length === 0 && !error && (
                            <p className="empty-list-message small-empty">No tienes metas archivadas.</p>
                        )}
                        <div id="goalListArchived" className="goal-list-grid archived-list">
                            {!isLoading && archivedGoals.map(g => ( // Cambiado goal a g
                                <GoalCard
                                    key={g.id}
                                    goal={g}
                                    onUnarchive={() => handleUnarchiveGoal(g.id, g.name)} // Pasar para desarchivar
                                />
                            ))}
                        </div>
                    </>
                )}
            </div> {/* Fin page-container */}

            {/* Modales */}
            <GoalModal
                isOpen={isGoalModalOpen} onClose={handleCloseGoalModal} onSubmit={handleGoalFormSubmit}
                mode={modalMode} initialData={selectedGoal} accounts={accounts}
                isSaving={isSaving} error={modalError}
            />
            
            <SavingsModal
                isOpen={isSavingsModalOpen} 
                onClose={handleCloseSavingsModal} 
                onSubmit={handleAddSavingsSubmit}
                accounts={accountsForSavingsModal}
                selectedGoal={selectedGoal} 
                isSaving={isSaving} 
                error={modalError}
            />

            {/* --- NUEVO: RENDERIZAR MODAL DE HISTORIAL DE APORTACIONES --- */}
            {selectedGoal && isHistoryModalOpen && ( // Renderizar solo si hay una meta seleccionada y el modal está abierto
                <GoalContributionHistoryModal
                    isOpen={isHistoryModalOpen}
                    onClose={handleCloseHistoryModal}
                    goal={selectedGoal} // Pasar la meta completa
                    transactions={contributionHistory}
                    isLoading={isLoadingHistory}
                    error={historyError}
                />
            )}
            {/* --------------------------------------------------------- */}

            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => { 
                    setIsConfirmModalOpen(false); 
                    setGoalToDelete(null); // Usar setGoalToDelete consistentemente
                }}
                onConfirm={confirmProcessGoalHandler}
                title={goalToDelete?.action === 'archive' ? "Archivar Meta" : "Restaurar Meta"}
                message={
                    goalToDelete?.action === 'archive' 
                    ? `¿Seguro que quieres archivar la meta "${goalToDelete?.name || ''}"? Podrás verla y restaurarla más tarde.`
                    : `¿Seguro que quieres restaurar la meta "${goalToDelete?.name || ''}" a tu lista activa?`
                }
                confirmText={goalToDelete?.action === 'archive' ? "Sí, Archivar" : "Sí, Restaurar"}
                cancelText="Cancelar"
                isDanger={goalToDelete?.action === 'archive'} // Usar goalToDelete para la condición de 'isDanger'
            />

            {/* Botón Scroll-Top */}
            {showScrollTop && ( <button onClick={scrollToTop} id="scrollTopBtn" className="scroll-top-btn visible" title="Volver arriba"><i className="fas fa-arrow-up"></i></button> )}
        </div>
    );
}
export default Goals;
