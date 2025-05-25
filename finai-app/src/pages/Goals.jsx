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

function Goals() {
    // --- Estado del Componente ---
    const { user, loading: authLoading } = useAuth();
    const [avatarUrl, setAvatarUrl] = useState(defaultAvatar);
    const [goals, setGoals] = useState([]);
    const [accounts, setAccounts] = useState([]); // Para dropdown en GoalModal
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

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
        if (!user?.id || !selectedGoal?.id) 
            { toast.error("Error: No se pudo identificar al usuario o la meta."); 
            setModalError("Error: Usuario o meta no identificados.");
            return; 
        }

        setModalError(''); 
        setIsSaving(true);
        const toastId = toast.loading('Añadiendo ahorro...');

        try {
            const { error: rpcError } = await supabase.rpc('record_goal_saving_contribution', {
                p_user_id: user.id,
                p_goal_id: selectedGoal.id,
                p_amount: parseFloat(submittedSavingsData.amount),
                p_payment_date: submittedSavingsData.date,
                p_source_account_id: submittedSavingsData.source_account_id || null, // Pasar null si no hay cuenta origen
                p_notes: submittedSavingsData.notes || null,
                p_transfer_out_category_id: CATEGORY_ID_TRANSFER_OUT, // ID de tu categoría de gasto para transferencias
                p_transfer_in_category_id: CATEGORY_ID_TRANSFER_IN    // ID de tu categoría de ingreso para transferencias
            });

            if (rpcError) {
                console.error("Error RPC record_goal_saving_contribution:", rpcError);
                throw new Error(rpcError.message || "Error al registrar la aportación.");
            }

            toast.success('¡Ahorro añadido con éxito!', { id: toastId });
            handleCloseSavingsModal();
            fetchData(user.id); // Recargar datos de metas (y cuentas si se afectaron)

            // Lógica de celebración si se alcanzó la meta (obtener meta actualizada)
            const { data: updatedGoalData } = await supabase
                .from('goals')
                .select('current_amount, target_amount, name')
                .eq('id', selectedGoal.id)
                .single();
            
            if (updatedGoalData && (Number(updatedGoalData.current_amount) >= (Number(updatedGoalData.target_amount) || Infinity))) {
                toast.success(`¡Felicidades! Has alcanzado tu meta "${updatedGoalData.name || ''}" 🎉`, { duration: 5000, icon: '🥳' });
            }

        } catch (error) {
            console.error('Error añadiendo ahorro:', error);
            setModalError(`Error: ${error.message}`);
            toast.error(`Error: ${error.message}`, { id: toastId });
        } finally { setIsSaving(false); }
    }, [user, selectedGoal, supabase, handleCloseSavingsModal, fetchData, setModalError, setIsSaving]);

    // Manejador Archivar

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
        const active = goals.filter(goal => !goal.is_archived);
        const archived = goals.filter(goal => goal.is_archived);
        active.sort((a, b) => (new Date(a.target_date || 0)) - (new Date(b.target_date || 0)));
        archived.sort((a, b) => (new Date(b.archived_at || 0)) - (new Date(a.archived_at || 0)));
        return { activeGoals: active, archivedGoals: archived };
    }, [goals]);

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

                {/* --- BOTÓN PARA MOSTRAR/OCULTAR ARCHIVADAS --- */}
                <div className="view-controls-bar goals-controls">
                    <div>{/* Espacio para futuros filtros */}</div>
                    <button
                        onClick={() => setShowArchivedGoals(prev => !prev)}
                        className="btn btn-secondary btn-sm"
                        disabled={isLoading}
                    >
                        {showArchivedGoals ? 'Ocultar Archivadas' : 'Mostrar Archivadas'} 
                        ({archivedGoals.length})
                    </button>
                </div>
                {/* ------------------------------------------ */}

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
