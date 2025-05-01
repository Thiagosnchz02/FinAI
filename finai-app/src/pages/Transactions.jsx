/*
Archivo: src/pages/Transactions.jsx
Propósito: Componente para mostrar y gestionar la lista de transacciones.
*/
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient'; // Asegúrate que la ruta sea correcta

// Importa imágenes
import finAiLogo from '../assets/Logo_FinAI_Oficial.png'; // Asegúrate que la ruta sea correcta
import defaultAvatar from '../assets/avatar_predeterminado.png'; // Asegúrate que la ruta sea correcta
// Importar mascota si se quiere usar en mensaje vacío
// import emptyMascot from '../assets/monstruo_pixar.png';

// --- Constantes y Opciones ---
const TRANSFER_CATEGORY_ID_OUT = '2d55034c-0587-4d9c-9d93-5284d6880c76'; // REEMPLAZA con tu UUID real
const TRANSFER_CATEGORY_ID_IN = '7547fdfa-f7b2-44f4-af01-f937bfcc5be3'; // REEMPLAZA con tu UUID real

// --- Funciones de Utilidad (Mover a /utils si prefieres) ---
const formatCurrency = (value, currency = 'EUR') => {
    const numberValue = Number(value);
    if (isNaN(numberValue) || value === null || value === undefined) return 'N/A';
    try {
        return new Intl.NumberFormat('es-ES', { style: 'currency', currency: currency, minimumFractionDigits: 2 }).format(numberValue);
    } catch (e) {
        console.error("Error formatting currency:", value, e);
        return `${numberValue.toFixed(2)} ${currency}`;
    }
};

const formatDate = (dateString, options = { day: '2-digit', month: '2-digit', year: 'numeric' }) => {
    if (!dateString) return '--/--/----';
    try {
        // Intenta crear fecha, si es inválida, devuelve default
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '--/--/----';

        // Ajustar por zona horaria para mostrar fecha local correcta del input YYYY-MM-DD
        const offset = date.getTimezoneOffset();
        const adjustedDate = new Date(date.getTime() + (offset * 60 * 1000));

        return adjustedDate.toLocaleDateString('es-ES', options);
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return '--/--/----';
    }
};

// Mapeo de iconos (simplificado, expandir según necesidad)
const iconMap = {
    comida: 'fas fa-utensils', restaurante: 'fas fa-utensils', supermercado: 'fas fa-shopping-cart',
    transporte: 'fas fa-bus', coche: 'fas fa-car', gasolina: 'fas fa-gas-pump',
    ocio: 'fas fa-film', entretenimiento: 'fas fa-film',
    hogar: 'fas fa-home', facturas: 'fas fa-file-invoice-dollar',
    ropa: 'fas fa-tshirt', compras: 'fas fa-shopping-bag',
    salud: 'fas fa-heartbeat', farmacia: 'fas fa-pills',
    educación: 'fas fa-graduation-cap', libros: 'fas fa-book',
    viaje: 'fas fa-plane-departure', hotel: 'fas fa-hotel',
    regalos: 'fas fa-gift',
    salario: 'fas fa-money-bill-wave', ingresos: 'fas fa-dollar-sign',
    transferencia: 'fas fa-exchange-alt', // Icono para transferencias
    // Añade más mapeos aquí
};
const getIconClass = (categoryName, defaultIcon = 'fas fa-tag') => {
    if (!categoryName) return defaultIcon;
    const lowerCaseName = categoryName.toLowerCase();
    // Buscar palabra clave en el nombre
    for (const keyword in iconMap) {
        if (lowerCaseName.includes(keyword)) {
            return iconMap[keyword];
        }
    }
    return defaultIcon; // Icono por defecto si no hay coincidencia
};


// --- Componente Principal ---
function Transactions() {
    // --- Estado ---
    const [userId, setUserId] = useState(null);
    const [userAvatarUrl, setUserAvatarUrl] = useState(defaultAvatar);
    const [transactions, setTransactions] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add'); // 'add' o 'edit'
    const [editingTransaction, setEditingTransaction] = useState(null); // Datos para editar
    const [isSaving, setIsSaving] = useState(false);
    const [modalError, setModalError] = useState('');
    const [filters, setFilters] = useState({
        // year: 'all', // Filtrar por año puede ser complejo con paginación, empezar sin él
        // dateRange: 'all',
        dateFrom: '', // Formato YYYY-MM-DD
        dateTo: '',   // Formato YYYY-MM-DD
        type: 'all',
        accountId: 'all',
        categoryId: 'all', // 'all', 'none', o UUID
    });
    const [sort, setSort] = useState({ column: 'transaction_date', ascending: false });
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [message, setMessage] = useState(''); // Mensajes generales
    const [messageType, setMessageType] = useState('');

    const navigate = useNavigate();
    const isMounted = useRef(true);

    // --- Carga Inicial (Usuario, Avatar, Cuentas, Categorías, Transacciones) ---
    const fetchInitialData = useCallback(async () => {
        setIsLoading(true);
        setMessage('');
        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                console.error('Transactions: No user session.', userError);
                if (isMounted.current) navigate('/login');
                return;
            }
            if (!isMounted.current) return;
            setUserId(user.id);

            // Cargar avatar, cuentas y categorías en paralelo
            const [profileRes, accountsRes, categoriesRes] = await Promise.all([
                supabase.from('profiles').select('avatar_url').eq('id', user.id).single(),
                supabase.from('accounts').select('id, name').eq('user_id', user.id).order('name'),
                supabase.from('categories').select('id, name, type').or(`user_id.eq.${user.id},is_default.eq.true`).order('name')
            ]);

             if (!isMounted.current) return;

            // Procesar Avatar
            if (profileRes.error && profileRes.error.code !== 'PGRST116') console.warn("Error loading avatar", profileRes.error);
            setUserAvatarUrl(profileRes.data?.avatar_url || defaultAvatar);

            // Procesar Cuentas
            if (accountsRes.error) throw new Error(`Error cargando cuentas: ${accountsRes.error.message}`);
            setAccounts(accountsRes.data || []);

            // Procesar Categorías
            if (categoriesRes.error) throw new Error(`Error cargando categorías: ${categoriesRes.error.message}`);
            setCategories(categoriesRes.data || []);

            // Cargar transacciones iniciales (después de tener cuentas/categorías)
            await fetchTransactions(user.id, filters, sort); // Pasar filtros y sort iniciales

        } catch (error) {
            console.error("Error loading initial data:", error);
             if (isMounted.current) {
                setMessage(`Error cargando datos: ${error.message}`);
                setMessageType('error');
             }
        } finally {
            if (isMounted.current) setIsLoading(false);
        }
    }, [navigate]); // fetchTransactions se pasa como dependencia abajo

    // --- Fetch Transacciones (con filtros y orden) ---
    const fetchTransactions = useCallback(async (currentUserId, currentFilters, currentSort) => {
        if (!currentUserId) return;
        setIsLoading(true); // Indicar carga de transacciones
        try {
            let query = supabase
                .from('transactions')
                .select(`
                    id, user_id, account_id, category_id, type, description, amount,
                    transaction_date, notes, created_at,
                    accounts ( name, currency ),
                    categories ( name, icon, type )
                `)
                .eq('user_id', currentUserId);

            // Aplicar Filtros
            if (currentFilters.type !== 'all') query = query.eq('type', currentFilters.type);
            if (currentFilters.accountId !== 'all') query = query.eq('account_id', currentFilters.accountId);
            if (currentFilters.categoryId !== 'all') {
                if (currentFilters.categoryId === 'none') query = query.is('category_id', null);
                else query = query.eq('category_id', currentFilters.categoryId);
            }
            if (currentFilters.dateFrom) query = query.gte('transaction_date', currentFilters.dateFrom);
            if (currentFilters.dateTo) query = query.lte('transaction_date', currentFilters.dateTo);

            // Aplicar Ordenación
            query = query.order(currentSort.column, { ascending: currentSort.ascending });

            // Aplicar Límite (implementar paginación si es necesario)
            query = query.limit(100);

            console.log("Fetching transactions with filters:", currentFilters, "and sort:", currentSort);
            const { data, error } = await query;

            if (error) throw error;

             if (isMounted.current) {
                 console.log("Transactions received:", data.length);
                 setTransactions(data || []);
             }

        } catch (error) {
            console.error("Error fetching transactions:", error);
             if (isMounted.current) {
                 setMessage(`Error al cargar transacciones: ${error.message}`);
                 setMessageType('error');
                 setTransactions([]); // Limpiar en caso de error
             }
        } finally {
             if (isMounted.current) setIsLoading(false);
        }
    }, [supabase]); // Dependencia de supabase

    // --- Efecto Principal de Carga y Recarga ---
    useEffect(() => {
        isMounted.current = true;
        fetchInitialData(); // Carga inicial
        return () => { isMounted.current = false; };
    }, [fetchInitialData]);

    // Recargar transacciones cuando cambian filtros o sort (si no es la carga inicial)
    useEffect(() => {
        // Evitar recarga si aún está en la carga inicial o no hay userId
        if (!isLoading && userId) {
            fetchTransactions(userId, filters, sort);
        }
    }, [filters, sort, userId, isLoading, fetchTransactions]); // Incluir fetchTransactions

    // --- Scroll-Top ---
    useEffect(() => {
        const handleScroll = () => {
            if (isMounted.current) setShowScrollTop(window.scrollY > 300);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);


    // --- Manejadores UI ---
    const handleFilterChange = useCallback((e) => {
        const { id, value } = e.target;
        // Extraer la clave del filtro del id (ej: filterAccountId -> accountId)
        const filterKey = id.replace('filter', '').charAt(0).toLowerCase() + id.replace('filter', '').slice(1);
         setFilters(prev => ({ ...prev, [filterKey]: value }));
        // No llamamos a fetchTransactions aquí, esperamos al botón "Filtrar"
    }, []);

    const handleApplyFilters = useCallback(() => {
        // Ya no es necesario llamar a fetchTransactions aquí,
        // el useEffect [filters, sort] lo hará automáticamente.
        // Simplemente log para confirmar el intento.
        console.log("Apply filters button clicked. Filters:", filters);
        // Opcional: podrías forzar una recarga si el useEffect no se dispara por alguna razón
        if (userId) fetchTransactions(userId, filters, sort);
    }, [filters, sort, userId, fetchTransactions]); // Añadir dependencias

     const handleSort = useCallback((column) => {
        setSort(prevSort => ({
            column: column,
            ascending: prevSort.column === column ? !prevSort.ascending : false // Invertir si es la misma columna, si no, default a DESC
        }));
        // El useEffect [filters, sort] recargará
    }, []);


    // --- Manejadores Modales y CRUD ---
    const handleOpenModal = useCallback((mode = 'add', transaction = null) => {
        setModalMode(mode);
        setEditingTransaction(mode === 'edit' ? transaction : null);
        setModalError('');
        setIsModalOpen(true);
    }, []);

    const handleCloseModal = useCallback(() => {
        setIsModalOpen(false);
        setEditingTransaction(null); // Limpiar datos de edición al cerrar
    }, []);

    const handleSaveTransaction = useCallback(async (formData) => {
        if (!userId) return;
        setIsSaving(true);
        setModalError('');

        const type = formData.type;
        const amount = Math.abs(parseFloat(formData.amount) || 0);
        const transaction_date = formData.transaction_date;
        const description = formData.description;
        const notes = formData.notes || null;

        try {
            let result = null;

            if (type === 'transferencia') {
                console.log("Processing TRANSFER...");
                const sourceAccountId = formData.account_id;
                const destinationAccountId = formData.account_destination_id;

                if (!sourceAccountId || !destinationAccountId) throw new Error('Selecciona cuenta origen y destino.');
                if (sourceAccountId === destinationAccountId) throw new Error('Las cuentas no pueden ser la misma.');
                if (!TRANSFER_CATEGORY_ID_OUT || !TRANSFER_CATEGORY_ID_IN) throw new Error("IDs de categoría de transferencia no configurados.");

                const gastoTransferencia = {
                    user_id: userId, account_id: sourceAccountId, category_id: TRANSFER_CATEGORY_ID_OUT, type: 'gasto',
                    description: `Transferencia a ${accounts.find(a => a.id === destinationAccountId)?.name || 'cuenta'}: ${description}`,
                    amount: -amount, transaction_date, notes
                };
                const ingresoTransferencia = {
                    user_id: userId, account_id: destinationAccountId, category_id: TRANSFER_CATEGORY_ID_IN, type: 'ingreso',
                    description: `Transferencia desde ${accounts.find(a => a.id === sourceAccountId)?.name || 'cuenta'}: ${description}`,
                    amount: amount, transaction_date, notes
                };

                // Solo se permite añadir transferencias, no editar (por simplicidad)
                if (modalMode === 'edit') throw new Error("La edición de transferencias no está soportada actualmente.");

                console.log("Inserting transfer (2 rows):", gastoTransferencia, ingresoTransferencia);
                result = await supabase.from('transactions').insert([gastoTransferencia, ingresoTransferencia]);

            } else { // Gasto o Ingreso
                console.log(`Processing ${type.toUpperCase()}...`);
                const account_id = formData.account_id;
                const category_id = formData.category_id || null; // Permitir null
                const signedAmount = type === 'gasto' ? -amount : amount;

                if (!account_id) throw new Error('Debes seleccionar una cuenta.');

                const transactionData = { user_id: userId, account_id, category_id, type, description, amount: signedAmount, transaction_date, notes };

                if (modalMode === 'edit' && editingTransaction?.id) {
                    console.log("Updating transaction:", editingTransaction.id);
                    delete transactionData.user_id; // RLS se encarga
                    // Importante: No permitir cambiar el tipo si era transferencia o viceversa en edición simple
                    if (editingTransaction.type === 'transferencia' || type === 'transferencia') {
                         throw new Error("No se puede cambiar el tipo a/desde transferencia en la edición.");
                    }
                    result = await supabase.from('transactions').update(transactionData).eq('id', editingTransaction.id).eq('user_id', userId);
                } else {
                    console.log("Inserting single transaction:", transactionData);
                    result = await supabase.from('transactions').insert([transactionData]);
                }
            }

            // Verificar resultado
            const { error } = result;
            if (error) throw error;

            alert(modalMode === 'edit' ? 'Transacción actualizada.' : 'Transacción guardada.');
            handleCloseModal();
            await fetchTransactions(userId, filters, sort); // Recargar con filtros/sort actuales

        } catch (error) {
            console.error(`Error saving transaction (${type}):`, error);
            setModalError(`Error: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    }, [userId, modalMode, editingTransaction, accounts, supabase, handleCloseModal, fetchTransactions, filters, sort]); // Añadir dependencias

    const handleDeleteTransaction = useCallback(async (transactionId) => {
        if (!userId || !transactionId) return;
        const txToDelete = transactions.find(tx => tx.id === transactionId);
        if (!txToDelete) return;

        // Manejar eliminación de transferencias (eliminar ambas partes)
        let relatedTxId = null;
        if (txToDelete.category_id === TRANSFER_CATEGORY_ID_IN || txToDelete.category_id === TRANSFER_CATEGORY_ID_OUT) {
            // Buscar la transacción "hermana" (misma fecha, importe opuesto, descripción similar)
            // Esto es complejo y propenso a errores. Una mejor solución es agrupar transferencias en la DB.
            // Por ahora, advertimos al usuario.
            if (!window.confirm(`Estás eliminando parte de una transferencia (${txToDelete.description}). ¿Eliminar de todas formas? (La otra parte quedará huérfana)`)) return;
        } else {
            if (!window.confirm(`¿Eliminar transacción "${txToDelete.description || 'Sin descripción'}" del ${formatDate(txToDelete.transaction_date)}?`)) return;
        }


        try {
            console.log('Deleting transaction:', transactionId);
            const { error } = await supabase.from('transactions').delete().eq('id', transactionId).eq('user_id', userId);
            if (error) throw error;

            // Intentar eliminar la transacción relacionada si es transferencia (simplificado)
             if (relatedTxId) {
                 await supabase.from('transactions').delete().eq('id', relatedTxId).eq('user_id', userId);
            }

            alert('Transacción eliminada.');
            await fetchTransactions(userId, filters, sort); // Recargar

        } catch (error) {
            console.error('Error deleting transaction:', error);
            alert(`Error al eliminar: ${error.message}`);
        }
    }, [userId, transactions, supabase, fetchTransactions, filters, sort]);


    // --- Otros ---
    const handleLogout = useCallback(async () => {
            if (isProcessing) return;
            setIsProcessing(true);
            try {
                const { error } = await supabase.auth.signOut();
                if (error) throw error;
            } catch (error) {
                console.error("Error logging out:", error);
                alert("Error al cerrar sesión.");
                setIsProcessing(false);
            }
        }, [isProcessing, supabase]);
    const handleBack = useCallback(() => navigate(-1), [navigate]);
    const scrollToTop = useCallback(() => window.scrollTo({ top: 0, behavior: 'smooth' }), []);

    // --- Renderizado ---
    const getSortIcon = (column) => {
        if (sort.column !== column) return <i className="fas fa-sort"></i>;
        return sort.ascending ? <i className="fas fa-sort-up"></i> : <i className="fas fa-sort-down"></i>;
    };

    return (
        <div style={{ display: 'flex' }}>

            {/* --- Sidebar --- */}
             <aside className="sidebar">
                             <div className="sidebar-logo"> <img src={finAiLogo} alt="FinAi Logo Small" /> </div>
                             <nav className="sidebar-nav">
                                 {/* Usar NavLink para 'active' class automática si se configura */}
                                 <Link to="/dashboard" className="nav-button" title="Dashboard"><i className="fas fa-home"></i> <span>Dashboard</span></Link>
                                 <Link to="/accounts" className="nav-button" title="Cuentas"><i className="fas fa-wallet"></i> <span>Cuentas</span></Link>
                                 <Link to="/budgets" className="nav-button" title="Presupuestos"><i className="fas fa-chart-pie"></i> <span>Presupuestos</span></Link>
                                 <Link to="/categories" className="nav-button" title="Categorías"><i className="fas fa-tags"></i> <span>Categorías</span></Link>
                                 <Link to="/transactions" className="nav-button" title="Transacciones"><i className="fas fa-exchange-alt"></i> <span>Transacciones</span></Link>
                                 <Link to="/trips" className="nav-button" title="Viajes"><i className="fas fa-suitcase-rolling"></i> <span>Viajes</span></Link>
                                 <Link to="/evaluations" className="nav-button" title="Evaluación"><i className="fas fa-balance-scale"></i> <span>Evaluación</span></Link>
                                 <Link to="/reports" className="nav-button" title="Informes"><i className="fas fa-chart-bar"></i> <span>Informes</span></Link>
                                 <Link to="/profile" className="nav-button active" title="Perfil"><i className="fas fa-user-circle"></i> <span>Perfil</span></Link> {/* Active */}
                                 <Link to="/settings" className="nav-button" title="Configuración"><i className="fas fa-cog"></i> <span>Configuración</span></Link>
                                 <Link to="/debts" className="nav-button" title="Deudas"><i className="fas fa-credit-card"></i> <span>Deudas</span></Link>
                                 <Link to="/loans" className="nav-button" title="Préstamos"><i className="fas fa-hand-holding-usd"></i> <span>Préstamos</span></Link>
                                 <Link to="/fixed-expenses" className="nav-button" title="Gastos Fijos"><i className="fas fa-receipt"></i> <span>Gastos Fijos</span></Link>
                                 <Link to="/goals" className="nav-button" title="Metas"><i className="fas fa-bullseye"></i> <span>Metas</span></Link>
                             </nav>
                             <button className="nav-button logout-button" onClick={handleLogout} title="Cerrar Sesión" disabled={isLoading || isSaving}>
                                 {isLoading ? <><i className="fas fa-spinner fa-spin"></i> <span>Saliendo...</span></> : <><i className="fas fa-sign-out-alt"></i> <span>Salir</span></>}
                             </button>
                         </aside>

            {/* --- Contenido Principal --- */}
            <div className={`page-container ${isLoading ? 'content-loading' : ''}`}>
                {/* --- Cabecera --- */}
                <div className="page-header transactions-header">
                    <button onClick={handleBack} id="backButton" className="btn-icon" aria-label="Volver" disabled={isSaving}><i className="fas fa-arrow-left"></i></button>
                    <div className="header-title-group">
                        <img id="userAvatarHeader" src={userAvatarUrl} alt="Avatar" className="header-avatar-small" />
                        <h1>Transacciones</h1>
                    </div>
                    <button onClick={() => handleOpenModal('add')} id="addTransactionBtn" className="btn btn-primary btn-add" disabled={isLoading || isSaving}>
                        <i className="fas fa-plus"></i> Añadir
                    </button>
                </div>

                 {/* Mensaje General */}
                 {message && (
                    <p className={`message page-message ${messageType}`}>{message}</p>
                 )}

                {/* --- Barra de Filtros --- */}
                <div className="filter-bar">
                    {/* <select id="filterYear" className="filter-select" value={filters.year} onChange={handleFilterChange} disabled={isLoading || isSaving}>
                         <option value="all">Todos Años</option>
                         { [2025, 2024, 2023].map(year => <option key={year} value={year}>{year}</option>) }
                    </select> */}
                     <input type="date" id="filterDateFrom" className="filter-input" value={filters.dateFrom} onChange={handleFilterChange} disabled={isLoading || isSaving} title="Fecha Desde"/>
                     <input type="date" id="filterDateTo" className="filter-input" value={filters.dateTo} onChange={handleFilterChange} disabled={isLoading || isSaving} title="Fecha Hasta"/>
                    <select id="filterType" className="filter-select" value={filters.type} onChange={handleFilterChange} disabled={isLoading || isSaving}>
                        <option value="all">Todos Tipos</option>
                        <option value="gasto">Gastos</option>
                        <option value="ingreso">Ingresos</option>
                        <option value="transferencia">Transferencias</option>
                    </select>
                    <select id="filterAccountId" className="filter-select" value={filters.accountId} onChange={handleFilterChange} disabled={isLoading || isSaving || accounts.length === 0}>
                        <option value="all">Todas Cuentas</option>
                        {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                    </select>
                    <select id="filterCategoryId" className="filter-select" value={filters.categoryId} onChange={handleFilterChange} disabled={isLoading || isSaving || categories.length === 0}>
                        <option value="all">Todas Categorías</option>
                        <option value="none">(Sin Categoría)</option>
                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                    {/* El botón aplicar ya no es estrictamente necesario con useEffect */}
                    {/* <button onClick={handleApplyFilters} id="applyFiltersBtn" className="btn btn-secondary btn-filter" disabled={isLoading || isSaving}>Filtrar</button> */}
                </div>

                {/* --- Tabla de Transacciones --- */}
                <div className="table-container">
                    <table id="transactionsTable" className="transactions-table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('transaction_date')}>Fecha {getSortIcon('transaction_date')}</th>
                                <th onClick={() => handleSort('description')}>Descripción {getSortIcon('description')}</th>
                                <th onClick={() => handleSort('categories.name')}>Categoría {getSortIcon('categories.name')}</th>
                                <th onClick={() => handleSort('accounts.name')}>Cuenta {getSortIcon('accounts.name')}</th>
                                <th className="amount-col" onClick={() => handleSort('amount')}>Importe {getSortIcon('amount')}</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="transactionsTableBody">
                            {isLoading && (
                                <tr><td colSpan="6" style={{ textAlign: 'center' }}>Cargando...</td></tr>
                            )}
                            {!isLoading && transactions.length === 0 && (
                                <tr><td colSpan="6" style={{ textAlign: 'center' }}>
                                    <p className="empty-list-message no-margin">No hay transacciones que coincidan.</p>
                                </td></tr>
                            )}
                            {!isLoading && transactions.map(tx => (
                                <TransactionRow
                                    key={tx.id}
                                    transaction={tx}
                                    onEdit={() => handleOpenModal('edit', tx)}
                                    onDelete={() => handleDeleteTransaction(tx.id)}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>

            </div> {/* Fin page-container */}

            {/* --- Modal --- */}
            {isModalOpen && (
                <TransactionModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onSubmit={handleSaveTransaction}
                    mode={modalMode}
                    initialData={editingTransaction}
                    accounts={accounts} // Pasar cuentas al modal
                    categories={categories} // Pasar categorías al modal
                    isSaving={isSaving}
                    error={modalError}
                    setError={setModalError} // Permitir al modal limpiar su error
                />
            )}

            {/* --- Botón Scroll-Top --- */}
            {showScrollTop && (
                <button onClick={scrollToTop} id="scrollTopBtn" className="scroll-top-btn visible" title="Volver arriba" disabled={isSaving}>
                    <i className="fas fa-arrow-up"></i>
                </button>
            )}

        </div> // Fin contenedor flex principal
    );
}


// --- Componente Fila Transacción ---
function TransactionRow({ transaction, onEdit, onDelete }) {
    const { id, transaction_date, description, amount, type, accounts, categories } = transaction;

    const formattedDate = useMemo(() => formatDate(transaction_date), [transaction_date]);
    const accountName = accounts?.name || <span style={{color: '#aaa'}}>N/A</span>;
    const categoryName = categories?.name || <span style={{color: '#aaa'}}>(Sin Cat.)</span>;
    const categoryIcon = getIconClass(categories?.name); // Usar nombre para icono
    const amountClass = type === 'ingreso' ? 'income' : (type === 'gasto' ? 'expense' : 'transfer');
    const amountSign = type === 'ingreso' ? '+' : '-';
    const formattedAmount = formatCurrency(Math.abs(amount), accounts?.currency || 'EUR');

    return (
        <tr data-id={id}>
            <td><span className="trans-date">{formattedDate}</span></td>
            <td><span className="trans-desc">{description || '-'}</span></td>
            <td><span className="trans-cat"><i className={categoryIcon}></i> {categoryName}</span></td>
            <td><span className="trans-acc">{accountName}</span></td>
            <td className="amount-col"><span className={`trans-amount ${amountClass}`}>{amountSign}{formattedAmount}</span></td>
            <td>
                {type !== 'transferencia' && /* No permitir editar transferencias directamente */ (
                    <button className="btn-icon btn-edit" aria-label="Editar" onClick={onEdit}><i className="fas fa-pencil-alt"></i></button>
                )}
                <button className="btn-icon btn-delete" aria-label="Eliminar" onClick={onDelete}><i className="fas fa-trash-alt"></i></button>
            </td>
        </tr>
    );
}


// --- Componente Modal Transacción ---
function TransactionModal({ isOpen, onClose, onSubmit, mode, initialData, accounts, categories, isSaving, error, setError }) {
    const [formData, setFormData] = useState({});
    const [transactionType, setTransactionType] = useState('gasto'); // Estado local para tipo

    // Inicializar/Resetear formulario al abrir o cambiar modo/datos
    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        let defaultData = {
            type: 'gasto', amount: '', transaction_date: today, description: '',
            account_id: '', account_destination_id: '', category_id: '', notes: ''
        };

        if (mode === 'edit' && initialData && initialData.type !== 'transferencia') { // No editar transferencias
            defaultData = {
                type: initialData.type || 'gasto',
                amount: Math.abs(initialData.amount || 0).toString(), // Usar valor absoluto
                transaction_date: initialData.transaction_date ? initialData.transaction_date.split('T')[0] : today,
                description: initialData.description || '',
                account_id: initialData.account_id || '',
                account_destination_id: '', // No aplica en edición simple
                category_id: initialData.category_id || '',
                notes: initialData.notes || ''
            };
        }
        setFormData(defaultData);
        setTransactionType(defaultData.type); // Sincronizar estado local del tipo
        setError(''); // Limpiar error al abrir/cambiar
    }, [isOpen, mode, initialData]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (name === 'transactionType') {
            setTransactionType(value); // Actualizar estado local del tipo
            // Limpiar campos específicos al cambiar tipo? (Opcional)
            // if (value === 'transferencia') setFormData(prev => ({ ...prev, category_id: '' }));
            // else setFormData(prev => ({ ...prev, account_destination_id: '' }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
         if (error) setError(''); // Limpiar error al cambiar cualquier campo
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setError(''); // Limpiar error antes de validar/enviar

        // Validaciones
        const amount = parseFloat(formData.amount);
        if (isNaN(amount) || amount <= 0) { setError('Importe debe ser mayor a cero.'); return; }
        if (!formData.transaction_date) { setError('Fecha es obligatoria.'); return; }
        if (!formData.description?.trim()) { setError('Descripción es obligatoria.'); return; }
        if (!formData.account_id) { setError(transactionType === 'transferencia' ? 'Cuenta Origen es obligatoria.' : 'Cuenta es obligatoria.'); return; }

        if (transactionType === 'transferencia') {
            if (!formData.account_destination_id) { setError('Cuenta Destino es obligatoria.'); return; }
            if (formData.account_id === formData.account_destination_id) { setError('Cuentas origen y destino no pueden ser iguales.'); return; }
        } else {
            // Categoría opcional, no necesita validación extra aquí (a menos que la quieras obligatoria)
            // if (!formData.category_id) { setError('Categoría es obligatoria.'); return; }
        }

        // Pasar datos validados al onSubmit del padre
        onSubmit({ ...formData, type: transactionType, amount: amount });
    };

    // Filtrar categorías según el tipo seleccionado
    const filteredCategories = useMemo(() => {
        if (transactionType === 'transferencia' || !categories) return [];
        return categories.filter(cat => cat.type === transactionType);
    }, [transactionType, categories]);

    if (!isOpen) return null;

    const isTransfer = transactionType === 'transferencia';

    return (
        <div className="modal-overlay active" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget && !isSaving) onClose(); }}>
            <div className="modal-content">
                <h2>{mode === 'add' ? 'Añadir Movimiento' : 'Editar Transacción'}</h2>
                <form onSubmit={handleSubmit}>
                    {/* ID oculto para edición */}
                    {mode === 'edit' && <input type="hidden" name="id" value={initialData?.id || ''} />}

                    {/* Selector de Tipo */}
                    <div className="input-group">
                        <label>Tipo</label>
                        <div className="radio-group type-toggle">
                            <label className={`type-button expense-btn ${transactionType === 'gasto' ? 'active' : ''} ${mode === 'edit' ? 'disabled' : ''}`}>
                                <input type="radio" name="transactionType" value="gasto" checked={transactionType === 'gasto'} onChange={handleChange} disabled={isSaving || mode === 'edit'}/> Gasto
                            </label>
                            <label className={`type-button income-btn ${transactionType === 'ingreso' ? 'active' : ''} ${mode === 'edit' ? 'disabled' : ''}`}>
                                <input type="radio" name="transactionType" value="ingreso" checked={transactionType === 'ingreso'} onChange={handleChange} disabled={isSaving || mode === 'edit'}/> Ingreso
                            </label>
                            <label className={`type-button transfer-btn ${transactionType === 'transferencia' ? 'active' : ''} ${mode === 'edit' ? 'disabled' : ''}`}>
                                <input type="radio" name="transactionType" value="transferencia" checked={transactionType === 'transferencia'} onChange={handleChange} disabled={isSaving || mode === 'edit'}/> Transferencia
                            </label>
                        </div>
                    </div>

                    {/* Campos Comunes */}
                    <div className="input-group"> <label htmlFor="modalAmount">Importe</label> <input type="number" id="modalAmount" name="amount" required step="0.01" min="0.01" value={formData.amount} onChange={handleChange} disabled={isSaving}/> </div>
                    <div className="input-group"> <label htmlFor="modalDate">Fecha</label> <input type="date" id="modalDate" name="transaction_date" required value={formData.transaction_date} onChange={handleChange} disabled={isSaving}/> </div>
                    <div className="input-group"> <label htmlFor="modalDescription">Descripción</label> <input type="text" id="modalDescription" name="description" required value={formData.description} onChange={handleChange} disabled={isSaving}/> </div>

                    {/* Cuenta Origen / Cuenta Principal */}
                    <div className="input-group">
                        <label htmlFor="modalAccountId">{isTransfer ? 'Cuenta Origen' : 'Cuenta'}</label>
                        <select id="modalAccountId" name="account_id" required value={formData.account_id} onChange={handleChange} disabled={isSaving || accounts.length === 0}>
                            <option value="" disabled>{accounts.length === 0 ? 'No hay cuentas' : 'Selecciona...'}</option>
                            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    </div>

                    {/* Cuenta Destino (Solo Transferencias) */}
                    {isTransfer && (
                        <div className="input-group">
                            <label htmlFor="modalAccountDestinationId">Cuenta Destino</label>
                            <select id="modalAccountDestinationId" name="account_destination_id" required={isTransfer} value={formData.account_destination_id} onChange={handleChange} disabled={isSaving || accounts.length === 0}>
                                <option value="" disabled>{accounts.length === 0 ? 'No hay cuentas' : 'Selecciona...'}</option>
                                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>
                    )}

                    {/* Categoría (No para Transferencias) */}
                    {!isTransfer && (
                        <div className="input-group">
                            <label htmlFor="modalCategoryId">Categoría</label>
                            <select id="modalCategoryId" name="category_id" value={formData.category_id} onChange={handleChange} disabled={isSaving || filteredCategories.length === 0}>
                                <option value="">(Sin categoría)</option>
                                {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    )}

                    {/* Notas */}
                    <div className="input-group"> <label htmlFor="modalNotes">Notas</label> <textarea id="modalNotes" name="notes" rows={2} value={formData.notes} onChange={handleChange} disabled={isSaving}></textarea> </div>

                    {/* Error y Acciones */}
                    {error && <p className="error-message">{error}</p>}
                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSaving}>Cancelar</button>
                        <button type="submit" className="btn btn-primary" disabled={isSaving}>
                            {isSaving ? 'Guardando...' : (mode === 'add' ? 'Guardar' : 'Guardar Cambios')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}


export default Transactions;
