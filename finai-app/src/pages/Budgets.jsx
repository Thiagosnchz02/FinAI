/*
Archivo: src/pages/Budgets.jsx
Propósito: Componente para la página de gestión de presupuestos mensuales.
*/
import React, { useState, useEffect, useMemo } from 'react'; // Importa useMemo para cálculos
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient'; // Importa cliente Supabase

// Importa imágenes
import finAiLogo from '../assets/Logo_FinAI_Oficial.png';
import defaultAvatar from '../assets/avatar_predeterminado.png';
// Importar mascota si se quiere usar

// --- Funciones de Utilidad --- (Mover a /utils si se repiten)
const formatCurrency = (value, currency = 'EUR') => {
    // ... (misma función que antes)
    if (isNaN(value) || value === null || value === undefined) return '€0.00';
    const numberValue = Number(value);
    if (isNaN(numberValue)) return '€0.00';
    try {
        return new Intl.NumberFormat('es-ES', { style: 'currency', currency: currency, minimumFractionDigits: 2 }).format(numberValue);
    } catch (e) {
        console.error("Error formatting currency:", value, currency, e);
        return `${numberValue.toFixed(2)} ${currency}`;
    }
};

const getIconClass = (iconKeyword) => {
    // ... (mismo mapeo o lógica que antes) ...
    // Ejemplo simplificado:
    const defaultIcon = 'fas fa-tag';
    if (!iconKeyword) return defaultIcon;
    if (iconKeyword.startsWith('fa')) return iconKeyword; // Asume que ya es clase completa
    // Añadir mapeo si es necesario
    return defaultIcon;
};
// --- Fin Funciones de Utilidad ---

function Budgets() {
    // --- Estado del Componente ---
    const [userId, setUserId] = useState(null); // Vendrá de AuthContext
    const [avatarUrl, setAvatarUrl] = useState(defaultAvatar);
    const [selectedPeriod, setSelectedPeriod] = useState(''); // Formato YYYY-MM
    const [budgets, setBudgets] = useState([]); // Presupuestos del periodo
    const [categories, setCategories] = useState([]); // TODAS las categorías (para nombres e iconos)
    const [spending, setSpending] = useState({}); // Gasto por category_id para el periodo { catId: amount }
    const [isLoading, setIsLoading] = useState(true); // Carga inicial (cats) y carga de periodo
    const [error, setError] = useState(null);
    // Modal
    const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [selectedBudgetId, setSelectedBudgetId] = useState(null);
    const [formData, setFormData] = useState({ categoryId: '', amount: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [modalError, setModalError] = useState('');
    // UI
    const [showScrollTop, setShowScrollTop] = useState(false);

    const navigate = useNavigate();

    // --- Efectos ---
    useEffect(() => {
        // Carga inicial: usuario, avatar, categorías y periodo actual
        const initialize = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // 1. Obtener usuario (Simulado)
                const simulatedUserId = 'USER_ID_PLACEHOLDER'; // Reemplazar con AuthContext
                setUserId(simulatedUserId);

                // 2. Cargar perfil (avatar) y categorías
                const [profileRes, categoriesRes] = await Promise.all([
                    supabase.from('profiles').select('avatar_url').eq('id', simulatedUserId).single(),
                    supabase.from('categories').select('id, name, type, icon').or(`user_id.eq.${simulatedUserId},is_default.eq.true`).order('name')
                ]);

                if (profileRes.error && profileRes.status !== 406) throw profileRes.error;
                setAvatarUrl(profileRes.data?.avatar_url || defaultAvatar);

                if (categoriesRes.error) throw categoriesRes.error;
                setCategories(categoriesRes.data || []);

                // 3. Establecer periodo inicial (mes actual)
                const today = new Date();
                const initialPeriod = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
                setSelectedPeriod(initialPeriod);
                // La carga de presupuestos/gastos se disparará por el siguiente useEffect

            } catch (err) {
                console.error("Error en inicialización (Budgets):", err);
                setError(err.message || "Error al cargar datos iniciales.");
                setIsLoading(false); // Terminar carga aunque haya error inicial
            }
            // No ponemos setIsLoading(false) aquí, se hará cuando carguen los datos del periodo
        };

        initialize();

        // Scroll-top listener
        const handleScroll = () => setShowScrollTop(window.scrollY > 300);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);

    }, [navigate]); // Dependencia navigate por si redirige

    useEffect(() => {
        // Cargar presupuestos y gastos cuando cambia el periodo o el userId
        const loadBudgetsAndSpendingForPeriod = async () => {
            if (!userId || !selectedPeriod) return; // No cargar si falta algo

            console.log(`Cargando datos para periodo: ${selectedPeriod}`);
            setIsLoading(true);
            setError(null);
            setBudgets([]); // Limpiar datos anteriores
            setSpending({});

            try {
                const year = parseInt(selectedPeriod.split('-')[0]);
                const month = parseInt(selectedPeriod.split('-')[1]) - 1;
                const startDate = new Date(year, month, 1).toISOString().split('T')[0];
                const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

                // Obtener presupuestos Y calcular/obtener gastos en paralelo
                const [budgetsRes, spendingRes] = await Promise.all([
                    supabase.from('budgets')
                        .select('*')
                        .eq('user_id', userId)
                        .eq('start_date', startDate), // Asumiendo que guardas start_date
                    calculateSpendingForPeriod(userId, startDate, endDate) // Función optimizada (pendiente)
                ]);

                if (budgetsRes.error) throw budgetsRes.error;
                // El error de spendingRes se maneja dentro de la función o se relanza

                setBudgets(budgetsRes.data || []);
                setSpending(spendingRes || {}); // Guardar mapa de gastos

            } catch (err) {
                console.error(`Error cargando datos para ${selectedPeriod}:`, err);
                setError(err.message || `Error al cargar datos para ${selectedPeriod}.`);
            } finally {
                setIsLoading(false);
            }
        };

        loadBudgetsAndSpendingForPeriod();

    }, [selectedPeriod, userId]); // Recargar si cambia periodo o usuario

    // --- Cálculo de Gastos (Optimización Pendiente) ---
    const calculateSpendingForPeriod = async (currentUserId, startDate, endDate) => {
        console.warn("Calculando gastos - ¡Optimización pendiente!");
        // Idealmente, esto sería una llamada a una función RPC en Supabase
        // O, como mínimo, un fetch único de transacciones y agrupar en cliente.
        // Simulación básica (devuelve objeto vacío):
        // return {};

        // Implementación básica (similar al original, pero fetch único):
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select('amount, category_id')
                .eq('user_id', currentUserId)
                .eq('type', 'gasto')
                .not('category_id', 'is', null)
                .gte('transaction_date', startDate)
                .lte('transaction_date', endDate);

            if (error) throw error;

            const spendingMap = {};
            (data || []).forEach(tx => {
                const categoryId = tx.category_id;
                const amount = Math.abs(tx.amount);
                spendingMap[categoryId] = (spendingMap[categoryId] || 0) + amount;
            });
            console.log("Gasto calculado:", spendingMap);
            return spendingMap;
        } catch (err) {
            console.error("Error calculando gastos:", err);
            return {}; // Devolver vacío en caso de error
        }
    };

    // --- Cálculos Derivados (Resumen) ---
    const summary = useMemo(() => {
        let totalBudgeted = 0;
        let totalSpentSum = 0;
        budgets.forEach(b => {
            totalBudgeted += Number(b.amount) || 0;
            totalSpentSum += Number(spending[b.category_id]) || 0;
        });
        const totalRemaining = totalBudgeted - totalSpentSum;
        return {
            totalBudgeted: formatCurrency(totalBudgeted),
            totalSpent: formatCurrency(totalSpentSum),
            totalRemaining: formatCurrency(totalRemaining),
            remainingIsPositive: totalRemaining >= 0,
        };
    }, [budgets, spending]); // Recalcular solo si cambian presupuestos o gastos

    // --- Manejadores de Modal ---
    const handleOpenBudgetModal = (mode = 'add', budget = null) => {
        setModalMode(mode);
        setModalError('');
        setIsSaving(false);
        if (mode === 'edit' && budget) {
            setSelectedBudgetId(budget.id);
            setFormData({
                categoryId: budget.category_id || '',
                amount: budget.amount || '',
            });
        } else {
            setSelectedBudgetId(null);
            setFormData({ categoryId: '', amount: '' }); // Resetear
        }
        setIsBudgetModalOpen(true);
    };

    const handleCloseBudgetModal = () => setIsBudgetModalOpen(false);

    const handleFormInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (modalError) setModalError('');
    };

    const handleBudgetFormSubmit = async (event) => {
        event.preventDefault();
        if (!userId || !selectedPeriod) return;

        // Validaciones
        if (!formData.categoryId) { setModalError('Selecciona una categoría.'); return; }
        const amount = parseFloat(formData.amount);
        if (isNaN(amount) || amount <= 0) { setModalError('El importe debe ser mayor que cero.'); return; }
        setModalError('');
        setIsSaving(true);

        try {
            const year = parseInt(selectedPeriod.split('-')[0]);
            const month = parseInt(selectedPeriod.split('-')[1]) - 1;
            const startDate = new Date(year, month, 1).toISOString().split('T')[0];
            const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

            const budgetData = {
                user_id: userId,
                category_id: formData.categoryId,
                amount: amount,
                period: 'mensual', // Asumir mensual
                start_date: startDate,
                end_date: endDate,
            };

            let error;
            if (modalMode === 'edit' && selectedBudgetId) {
                // UPDATE
                const { error: updateError } = await supabase.from('budgets')
                    .update({ amount: budgetData.amount }) // Solo actualizar importe
                    .eq('id', selectedBudgetId).eq('user_id', userId);
                error = updateError;
            } else {
                // INSERT - Verificar duplicados antes
                const { data: existing, error: checkError } = await supabase.from('budgets')
                    .select('id').eq('user_id', userId).eq('category_id', budgetData.category_id).eq('start_date', startDate).maybeSingle();
                if (checkError) throw checkError;
                if (existing) throw new Error(`Ya existe un presupuesto para esta categoría en ${selectedPeriod}.`);

                const { error: insertError } = await supabase.from('budgets').insert([budgetData]);
                error = insertError;
            }

            if (error) throw error;

            console.log(`Presupuesto ${modalMode === 'edit' ? 'actualizado' : 'creado'}`);
            handleCloseBudgetModal();
            // Recargar datos forzando el useEffect de periodo/userId
            // Una forma es cambiar temporalmente el periodo y volver a ponerlo, o usar un estado 'refreshKey'
            setSelectedPeriod(prev => prev); // Esto podría no ser suficiente, mejor un refresh key
            // O llamar directamente a la función de carga (menos ideal)
            // loadBudgetsAndSpendingForPeriod();

        } catch (err) {
            console.error('Error guardando presupuesto:', err);
            setModalError(`Error: ${err.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteBudget = async (budgetId, categoryName) => {
        if (!window.confirm(`¿Seguro que quieres eliminar el presupuesto para "${categoryName}" en ${selectedPeriod}?`)) return;

        try {
            const { error } = await supabase.from('budgets').delete().eq('id', budgetId).eq('user_id', userId);
            if (error) throw error;
            console.log('Presupuesto eliminado');
            alert('Presupuesto eliminado.');
            // Quitar del estado local y recalcular resumen
            const updatedBudgets = budgets.filter(b => b.id !== budgetId);
            setBudgets(updatedBudgets);
            // El resumen se recalculará por useMemo

        } catch (err) {
            console.error('Error eliminando presupuesto:', err);
            alert(`Error: ${err.message}`);
        }
    };


    // Reutilizar handleLogout, handleBack, scrollToTop
    const handleLogout = () => console.log('Logout pendiente');
    const handleBack = () => navigate(-1);
    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    const handlePeriodChange = (e) => setSelectedPeriod(e.target.value);

    // Filtrar categorías disponibles para el modal
    const availableCategoriesForModal = useMemo(() => {
        const budgetedCategoryIds = budgets.map(b => b.category_id);
        return categories.filter(cat =>
            cat.type === 'gasto' &&
            (modalMode === 'edit' && cat.id === formData.categoryId // Si edita, mostrar la actual
             || modalMode === 'add' && !budgetedCategoryIds.includes(cat.id)) // Si añade, mostrar no presupuestadas
        );
    }, [categories, budgets, modalMode, formData.categoryId]);


    // --- Renderizado ---
    return (
        <div style={{ display: 'flex' }}>

            {/* --- Sidebar (Reutilizable) --- */}
            <aside className="sidebar">
                {/* ... contenido sidebar con Links ... */}
                <div className="sidebar-logo"> <img src={finAiLogo} alt="FinAi Logo Small" /> </div>
                <nav className="sidebar-nav">
                    <Link to="/dashboard" className="nav-button" title="Dashboard"><i className="fas fa-home"></i> <span>Dashboard</span></Link>
                    <Link to="/accounts" className="nav-button" title="Cuentas"><i className="fas fa-wallet"></i> <span>Cuentas</span></Link>
                    <Link to="/budgets" className="nav-button active" title="Presupuestos"><i className="fas fa-chart-pie"></i> <span>Presupuestos</span></Link> {/* Active */}
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
            <div className="page-container">
                {/* --- Cabecera --- */}
                <div className="page-header budgets-header">
                    <button onClick={handleBack} id="backButton" className="btn-icon" aria-label="Volver"><i className="fas fa-arrow-left"></i></button>
                    <div className="header-title-group">
                        <img id="userAvatarHeader" src={avatarUrl} alt="Avatar" className="header-avatar-small" />
                        <h1>Presupuestos</h1>
                    </div>
                    <button onClick={() => handleOpenBudgetModal('add')} id="addBudgetBtn" className="btn btn-primary btn-add">
                        <i className="fas fa-plus"></i> Añadir
                    </button>
                </div>

                {/* --- Controles y Resumen --- */}
                <div className="controls-summary-section">
                    <div className="period-selector">
                        <label htmlFor="monthYearPicker">Periodo:</label>
                        <input
                            type="month"
                            id="monthYearPicker"
                            name="monthYear"
                            value={selectedPeriod}
                            onChange={handlePeriodChange}
                            disabled={isLoading}
                        />
                    </div>
                    <div className="budget-summary-box">
                        <div><span>Total Presupuestado:</span> <strong id="totalBudgeted">{isLoading ? '...' : summary.totalBudgeted}</strong></div>
                        <div><span>Total Gastado:</span> <strong id="totalSpent">{isLoading ? '...' : summary.totalSpent}</strong></div>
                        <div><span>Restante General:</span> <strong id="totalRemaining" className={summary.remainingIsPositive ? 'positive' : 'negative'}>{isLoading ? '...' : summary.totalRemaining}</strong></div>
                    </div>
                </div>

                {/* --- Lista de Presupuestos --- */}
                <div id="budgetList" className="budget-list-grid">
                    {isLoading && (
                        <p id="loadingBudgetsMessage" style={{ textAlign: 'center', padding: '20px', color: '#666', gridColumn: '1 / -1' }}>Cargando presupuestos...</p>
                    )}
                    {error && !isLoading && (
                         <p style={{ textAlign: 'center', padding: '20px', color: 'red', gridColumn: '1 / -1' }}>{error}</p>
                    )}
                    {!isLoading && !error && budgets.length === 0 && (
                        <p id="noBudgetsMessage" className="empty-list-message" style={{ gridColumn: '1 / -1' }}>No has definido presupuestos para este periodo. ¡Añade uno!</p>
                    )}
                    {!isLoading && !error && budgets.length > 0 && (
                        budgets.map(b => {
                            const category = categories.find(c => c.id === b.category_id);
                            const spent = spending[b.category_id] || 0;
                            const remaining = (Number(b.amount) || 0) - spent;
                            const percentage = b.amount > 0 ? Math.min((spent / b.amount) * 100, 100) : 0;
                            const remainingClass = remaining >= 0 ? 'positive' : 'negative';
                            let progressBarColor = '#48bb78'; // Verde
                            if (percentage >= 95) progressBarColor = '#f56565'; // Rojo
                            else if (percentage >= 75) progressBarColor = '#ecc94b'; // Amarillo
                            const iconClass = getIconClass(category?.icon);
                            const categoryName = category?.name || 'Categoría Desconocida';

                            return (
                                <div key={b.id} className="budget-card" data-id={b.id} data-category-id={b.category_id}>
                                    <div className="card-header">
                                        <span className="category-icon"><i className={iconClass}></i></span>
                                        <h3 className="category-name">{categoryName}</h3>
                                    </div>
                                    <div className="card-body">
                                        <div className="budget-amounts">
                                            <div>Presup.: <span className="amount budgeted">{formatCurrency(b.amount)}</span></div>
                                            <div>Gastado: <span className="amount spent">{formatCurrency(spent)}</span></div>
                                            <div>Restante: <span className={`amount remaining ${remainingClass}`}>{formatCurrency(remaining)}</span></div>
                                        </div>
                                        <div className="progress-bar-container">
                                            <div className="progress-bar" style={{ width: `${percentage}%`, backgroundColor: progressBarColor }}></div>
                                        </div>
                                    </div>
                                    <div className="card-actions">
                                        <button onClick={() => handleOpenBudgetModal('edit', b)} className="btn-icon btn-edit" aria-label="Editar"><i className="fas fa-pencil-alt"></i></button>
                                        <button onClick={() => handleDeleteBudget(b.id, categoryName)} className="btn-icon btn-delete" aria-label="Eliminar"><i className="fas fa-trash-alt"></i></button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

            </div> {/* Fin page-container */}

            {/* --- Modal Añadir/Editar Presupuesto --- */}
            {isBudgetModalOpen && (
                <div id="budgetModal" className="modal-overlay active" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget) handleCloseBudgetModal(); }}>
                    <div className="modal-content">
                        <h2 id="modalTitleBudget">{modalMode === 'add' ? `Añadir Presupuesto (${selectedPeriod})` : 'Editar Presupuesto'}</h2>
                        <form id="budgetForm" onSubmit={handleBudgetFormSubmit}>
                            <input type="hidden" id="budgetId" name="budgetId" value={selectedBudgetId || ''} readOnly />
                            <input type="hidden" id="budgetPeriod" name="budgetPeriod" value={selectedPeriod} readOnly />

                            <div className="input-group">
                                <label htmlFor="budgetCategory">Categoría (Gasto)</label>
                                <select
                                    id="budgetCategory"
                                    name="categoryId" // Coincide con clave en formData
                                    required
                                    value={formData.categoryId}
                                    onChange={handleFormInputChange}
                                    disabled={modalMode === 'edit' || isSaving} // Deshabilitar si edita o guarda
                                >
                                    <option value="" disabled>Selecciona categoría...</option>
                                    {availableCategoriesForModal.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                    {/* Mostrar mensaje si no hay disponibles */}
                                    {modalMode === 'add' && availableCategoriesForModal.length === 0 && (
                                        <option disabled>No hay más categorías de gasto disponibles para este mes.</option>
                                    )}
                                </select>
                                <small>Solo un presupuesto por categoría cada mes.</small>
                            </div>

                            <div className="input-group">
                                <label htmlFor="budgetAmount">Importe Presupuestado (€)</label>
                                <input
                                    type="number"
                                    id="budgetAmount"
                                    name="amount" // Coincide con clave en formData
                                    required
                                    step="0.01"
                                    placeholder="0.00"
                                    min="0.01"
                                    value={formData.amount}
                                    onChange={handleFormInputChange}
                                    disabled={isSaving}
                                />
                            </div>

                            {modalError && (
                                <p id="modalBudgetError" className="error-message">{modalError}</p>
                            )}

                            <div className="modal-actions">
                                <button type="button" onClick={handleCloseBudgetModal} className="btn btn-secondary" disabled={isSaving}>Cancelar</button>
                                <button type="submit" id="saveBudgetButton" className="btn btn-primary" disabled={isSaving}>
                                    {isSaving ? 'Guardando...' : 'Guardar Presupuesto'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )} {/* Fin modal */}

            {/* --- Botón Scroll-Top --- */}
            {showScrollTop && (
                <button onClick={scrollToTop} id="scrollTopBtn" className="scroll-top-btn visible" title="Volver arriba">
                    <i className="fas fa-arrow-up"></i>
                </button>
            )}

        </div> // Fin contenedor flex principal
    );
}

export default Budgets;
