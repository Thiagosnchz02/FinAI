/*
Archivo: src/pages/Budgets.jsx
Propósito: Componente para la página de gestión de presupuestos mensuales.
*/
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext.jsx';
import { formatCurrency } from '../utils/formatters.js';
import BudgetCard from '../components/Budgets/BudgetCard.jsx'; // Importar componente Card
import BudgetModal from '../components/Budgets/BudgetModal.jsx'; // Importar componente Modal
import toast from 'react-hot-toast'; // Importar toast
import ConfirmationModal from '../components/ConfirmationModal.jsx'; // Importar ConfirmationModal
import Sidebar from '../components/layout/Sidebar.jsx'; 

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

    // Modal Presupuesto
    const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [selectedBudget, setSelectedBudget] = useState(null); // Guarda el objeto budget completo
    const [isSaving, setIsSaving] = useState(false);
    const [modalError, setModalError] = useState(''); // Error para el modal

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
            try {
                const [profileRes, categoriesRes] = await Promise.all([
                    supabase.from('profiles').select('avatar_url').eq('id', currentUserId).single(),
                    supabase.from('categories').select('id, name, type, icon').or(`user_id.eq.${currentUserId},is_default.eq.true`).order('name')
                ]);

                if (profileRes.error && profileRes.status !== 406) throw profileRes.error;
                setAvatarUrl(profileRes.data?.avatar_url || defaultAvatar);

                if (categoriesRes.error) throw categoriesRes.error;
                setCategories(categoriesRes.data || []);

                if (!selectedPeriod) {
                    const today = new Date();
                    const initialPeriod = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
                    setSelectedPeriod(initialPeriod);
                }

            } catch (err) {
                console.error("Error en carga inicial (Budgets Base):", err);
                setError(err.message || "Error al cargar datos base.");
            } finally {
                setIsLoadingInitial(false);
            }
        };

        if (user?.id) {
            loadBaseData(user.id);
        }
    }, [user, supabase]);

    const fetchDataForPeriod = useCallback(async (currentUserId, period) => {
        if (!currentUserId || !period) return;
        setIsLoading(true); setError(null); setBudgets([]); setSpending({});
        console.log(`Cargando datos para periodo: ${period}`);
        try {
            const year = parseInt(period.split('-')[0]);
            const month = parseInt(period.split('-')[1]) - 1;
            const startDate = new Date(Date.UTC(year, month, 1)).toISOString().split('T')[0];
            const endDate = new Date(Date.UTC(year, month + 1, 0)).toISOString().split('T')[0];

            const [budgetsRes, spendingRes] = await Promise.all([
                supabase.from('budgets').select('*').eq('user_id', currentUserId).eq('start_date', startDate),
                supabase.rpc('get_spending_for_period', { user_id_param: currentUserId, start_date_param: startDate, end_date_param: endDate })
            ]);

            if (budgetsRes.error) throw new Error(`Error budgets: ${budgetsRes.error.message}`);
            setBudgets(budgetsRes.data || []);

            if (spendingRes.error) throw new Error(`Error gastos: ${spendingRes.error.message}`);
            const spendingMap = (spendingRes.data || []).reduce((map, item) => {
                map[item.category_id] = Number(item.total_spent) || 0;
                return map;
            }, {});
            setSpending(spendingMap);

        } catch (err) {
            console.error(`Error cargando datos para ${period}:`, err);
            setError(err.message || `Error al cargar datos del periodo.`);
            setBudgets([]); setSpending({}); // Limpiar si hay error
        } finally {
            setIsLoading(false);
        }
    }, [supabase]); // Depende de supabase

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
        let totalBudgeted = budgets.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
        let totalSpentSum = Object.values(spending).reduce((sum, spent) => sum + spent, 0);
        // Asegurar que solo sumamos gasto de categorías presupuestadas para el total gastado del resumen? O mostrar todo el gasto?
        // Para ser consistente con las barras, sumamos solo el gasto de categorías presupuestadas:
        totalSpentSum = budgets.reduce((sum, b) => sum + (spending[b.category_id] || 0), 0);

        const totalRemaining = totalBudgeted - totalSpentSum;
        return {
            totalBudgeted: formatCurrency(totalBudgeted),
            totalSpent: formatCurrency(totalSpentSum),
            totalRemaining: formatCurrency(totalRemaining),
            remainingIsPositive: totalRemaining >= 0,
        };
    }, [budgets, spending]);

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

    // Filtrar categorías disponibles para el modal
    const availableCategoriesForModal = useMemo(() => {
        const budgetedCategoryIds = budgets.map(b => b.category_id);
        // Filtrar solo categorías de GASTO que NO estén ya presupuestadas este mes
        return categories.filter(cat =>
            cat.type === 'gasto' &&
            (modalMode === 'edit' // Si edita, sólo puede editar el importe, no la categoría
                ? cat.id === formData.categoryId // Muestra solo la categoría que está editando
                : !budgetedCategoryIds.includes(cat.id)) // Si añade, muestra solo las NO presupuestadas
        );
    }, [categories, budgets, modalMode, formData.categoryId]);

    // --- Renderizado ---
    const displayPeriod = selectedPeriod
        ? new Date(selectedPeriod + '-02').toLocaleDateString('es-ES', { month: 'long', year: 'numeric'})
        : 'Selecciona periodo';

    // Mostrar carga principal si isLoadingInitial o isLoading (si ya pasó la inicial)
    const showLoadingIndicator = isLoadingInitial || isLoading;


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
                <div className="page-header budgets-header">
                    {/* ... (Cabecera JSX igual que antes) ... */}
                    <button onClick={handleBack} id="backButton" className="btn-icon" aria-label="Volver"><i className="fas fa-arrow-left"></i></button>
                    <div className="header-title-group">
                        <img id="userAvatarHeader" src={avatarUrl} alt="Avatar" className="header-avatar-small" />
                        <h1>Presupuestos Mensuales</h1>
                    </div>
                    <button onClick={() => handleOpenBudgetModal('add')} id="addBudgetBtn" className="btn btn-primary btn-add">
                        <i className="fas fa-plus"></i> Añadir
                    </button>
                </div>

                {/* Controles y Resumen */}
                <div className="controls-summary-section">
                    {/* ... (Controles y Resumen JSX igual que antes, usando 'summary') ... */}
                     <div className="period-selector">
                        <label htmlFor="monthYearPicker">Periodo:</label>
                        <input
                            type="month" id="monthYearPicker" name="monthYear"
                            value={selectedPeriod} onChange={handlePeriodChange}
                            disabled={isLoading || isLoadingInitial} // Deshabilitar mientras carga algo
                        />
                    </div>
                    <div className="budget-summary-box">
                        <div><span>Total Presup.:</span> <strong id="totalBudgeted">{showLoadingIndicator ? '...' : summary.totalBudgeted}</strong></div>
                        <div><span>Total Gastado:</span> <strong id="totalSpent">{showLoadingIndicator ? '...' : summary.totalSpent}</strong></div>
                        <div><span>Restante:</span> <strong id="totalRemaining" className={summary.remainingIsPositive ? 'positive' : 'negative'}>{showLoadingIndicator ? '...' : summary.totalRemaining}</strong></div>
                    </div>
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
                            const category = categories.find(c => c.id === b.category_id);
                            const spent = spending[b.category_id] || 0;
                            return (
                                <BudgetCard
                                    key={b.id}
                                    budget={b}
                                    category={category}
                                    spentAmount={spent}
                                    onEdit={handleOpenBudgetModal} // Pasa la función para abrir el modal
                                    onDelete={handleDeleteBudget} // Pasa la función para iniciar borrado
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
                availableCategories={availableCategoriesForModal} // Pasar categorías filtradas
                displayPeriod={displayPeriod} // Pasar periodo formateado
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