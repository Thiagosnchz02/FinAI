/*
Archivo: src/pages/Goals.jsx
Propósito: Componente para la página de gestión de metas financieras.
*/
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext.jsx';
//import { formatCurrency, formatDate } from '../utils/formatters.js';
import Sidebar from '../components/layout/Sidebar.jsx'; 
// getIconClass se usa ahora dentro de GoalCard
import GoalCard from '../components/Goals/GoalCard.jsx';
import GoalModal from '../components/Goals/GoalModal.jsx';
import SavingsModal from '../components/Goals/SavingsModal.jsx';
import toast from 'react-hot-toast';
import ConfirmationModal from '../components/ConfirmationModal.jsx';

// Importa imágenes
import defaultAvatar from '../assets/avatar_predeterminado.png';
import emptyMascot from '../assets/monstruo_pixar.png';


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

    // Estado Confirmación
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [goalToDelete, setGoalToDelete] = useState(null); // { id, name }
    // UI
    const [showScrollTop, setShowScrollTop] = useState(false);

    const navigate = useNavigate();

    // --- Carga de Datos ---
    const fetchData = useCallback(async (currentUserId) => {
        setIsLoading(true); setError(null);
        setGoals([]); setAccounts([]); // Resetear
        console.log(`Goals: Cargando datos para usuario ${currentUserId}`);
        try {
            const [profileRes, accountsRes, goalsRes] = await Promise.all([
                supabase.from('profiles').select('avatar_url').eq('id', currentUserId).single(),
                supabase.from('accounts').select('id, name').eq('user_id', currentUserId).order('name'),
                supabase.from('goals').select('*').eq('user_id', currentUserId).order('target_date')
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

    // --- Manejadores Modales ---
    const handleOpenGoalModal = useCallback((mode = 'add', goal = null) => {
        setModalMode(mode); setSelectedGoal(goal); setModalError('');
        setIsSaving(false); setIsGoalModalOpen(true);
    }, []);
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
        if (!user?.id || !selectedGoal) { toast.error("Error inesperado."); return; }
        setModalError(''); setIsSaving(true);
        const toastId = toast.loading('Añadiendo ahorro...');
        try {
            const amountToAdd = submittedSavingsData.amount; // Ya validado en modal
            // 1. Obtener importe actual (más seguro)
            const { data: currentGoalData, error: fetchError } = await supabase
                .from('goals').select('current_amount')
                .eq('id', selectedGoal.id).eq('user_id', user.id).single();
            if (fetchError) throw new Error(`Meta no encontrada: ${fetchError.message}`);

            // 2. Calcular y actualizar
            const currentAmount = Number(currentGoalData.current_amount) || 0;
            const newAmount = currentAmount + amountToAdd;
            const { error: updateError } = await supabase.from('goals')
                .update({ current_amount: newAmount, updated_at: new Date() }) // Añadir updated_at
                .eq('id', selectedGoal.id).eq('user_id', user.id);
            if (updateError) throw updateError;

            toast.success('¡Ahorro añadido!', { id: toastId });
            handleCloseSavingsModal();
            fetchData(user.id); // Recargar
        } catch (error) {
            console.error('Error añadiendo ahorro:', error);
            setModalError(`Error: ${error.message}`);
            toast.error(`Error: ${error.message}`, { id: toastId });
        } finally { setIsSaving(false); }
    }, [user, selectedGoal, supabase, handleCloseSavingsModal, fetchData]);

    // Manejador Eliminación
    const handleDeleteGoal = (goalId, goalName) => {
        if (!goalId || !goalName) return;
        setGoalToDelete({ id: goalId, name: goalName });
        setIsConfirmModalOpen(true);
    };
    const confirmDeleteHandler = useCallback(async () => {
        if (!goalToDelete || !user?.id) { toast.error("Faltan datos."); return; }
        const { id: goalId, name: goalName } = goalToDelete;
        setIsConfirmModalOpen(false);
        const toastId = toast.loading(`Eliminando meta "${goalName}"...`);
        try {
            const { error } = await supabase.from('goals').delete()
                .eq('id', goalId).eq('user_id', user.id);
            if (error) throw error;
            toast.success('Meta eliminada.', { id: toastId });
            fetchData(user.id); // Recargar
        } catch (err) {
            console.error('Error eliminando meta:', err);
            toast.error(`Error: ${err.message}`, { id: toastId });
        } finally { setGoalToDelete(null); }
    }, [user, goalToDelete, supabase, fetchData]);

    // Otros manejadores
    
    const handleBack = useCallback(() => navigate(-1), [navigate]);
    const scrollToTop = useCallback(() => window.scrollTo({ top: 0, behavior: 'smooth' }), []);

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
                <div className="page-header goals-header">
                   {/* ... Cabecera JSX ... */}
                   <button onClick={handleBack} id="backButton" className="btn-icon" aria-label="Volver"><i className="fas fa-arrow-left"></i></button>
                   <div className="header-title-group"> <img id="userAvatarHeader" src={avatarUrl} alt="Avatar" className="header-avatar-small" /> <h1>Mis Metas</h1> </div>
                   <button onClick={() => handleOpenGoalModal('add')} id="addGoalBtn" className="btn btn-primary btn-add"> <i className="fas fa-plus"></i> Añadir Meta </button>
                </div>

                {/* Lista de Metas */}
                <div id="goalList" className="goal-list-grid">
                    {isLoading && <p>Cargando metas...</p>}
                    {error && <p style={{ color: 'red' }}>{error}</p>}
                    {!isLoading && goals.length === 0 && !error && ( /* Mensaje vacío */
                        <div className="empty-list-message">
                           <img src={emptyMascot} alt="Mascota FinAi" className="empty-mascot"/>
                           <p>¡Define tu primera meta de ahorro!</p>
                            <button onClick={() => handleOpenGoalModal('add')} className="btn btn-primary"> <i className="fas fa-plus"></i> Crear Meta </button>
                        </div>
                    )}
                    {!isLoading && goals.map(goal => (
                        <GoalCard
                            key={goal.id}
                            goal={goal}
                            onAddSavings={handleOpenSavingsModal}
                            onEdit={handleOpenGoalModal} // Pasará ('edit', goal)
                            onDelete={handleDeleteGoal} // Pasará (goal.id, goal.name)
                        />
                    ))}
                </div>
            </div> {/* Fin page-container */}

            {/* Modales */}
            <GoalModal
                isOpen={isGoalModalOpen} onClose={handleCloseGoalModal} onSubmit={handleGoalFormSubmit}
                mode={modalMode} initialData={selectedGoal} accounts={accounts}
                isSaving={isSaving} error={modalError}
            />
            <SavingsModal
                isOpen={isSavingsModalOpen} onClose={handleCloseSavingsModal} onSubmit={handleAddSavingsSubmit}
                selectedGoal={selectedGoal} isSaving={isSaving} error={modalError}
            />
            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => { setIsConfirmModalOpen(false); setGoalToDelete(null); }}
                onConfirm={confirmDeleteHandler} title="Confirmar Eliminación"
                message={`¿Seguro eliminar la meta "${goalToDelete?.name || ''}"? Se perderá el progreso.`}
                confirmText="Eliminar" cancelText="Cancelar" isDanger={true}
            />

            {/* Botón Scroll-Top */}
            {showScrollTop && ( <button onClick={scrollToTop} id="scrollTopBtn" className="scroll-top-btn visible" title="Volver arriba"><i className="fas fa-arrow-up"></i></button> )}
        </div>
    );
}
export default Goals;
