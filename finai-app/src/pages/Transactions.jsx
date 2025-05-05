/*
Archivo: src/pages/Transactions.jsx
Propósito: Componente para mostrar y gestionar la lista de transacciones.
*/
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext.jsx';
import { formatDate } from '../utils/formatters.js';
import Sidebar from '../components/layout/Sidebar.jsx'; 
// getIconClass ahora se usa en TransactionRow
import TransactionRow from '../components/Transactions/TransactionRow.jsx'; // Asume ruta src/components/
import TransactionModal from '../components/Transactions/TransactionModal.jsx'; // Asume ruta src/components/
import toast from 'react-hot-toast';
import ConfirmationModal from '../components/ConfirmationModal.jsx';

// Importa imágenes
import defaultAvatar from '../assets/avatar_predeterminado.png';
// import emptyMascot from '../assets/monstruo_pixar.png';

// --- Constantes (Asegúrate que estos IDs sean correctos) ---
const TRANSFER_CATEGORY_ID_OUT = '2d55034c-0587-4d9c-9d93-5284d6880c76'; // REEMPLAZA
const TRANSFER_CATEGORY_ID_IN = '7547fdfa-f7b2-44f4-af01-f937bfcc5be3'; // REEMPLAZA

// --- Componente Principal ---
function Transactions() {
    // --- Estado ---
    const { user, loading: authLoading } = useAuth();
    const [avatarUrl, setAvatarUrl] = useState(defaultAvatar);
    const [transactions, setTransactions] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true); // Carga inicial y de transacciones
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [modalError, setModalError] = useState('');
    const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', type: 'all', accountId: 'all', categoryId: 'all' });
    const [sort, setSort] = useState({ column: 'transaction_date', ascending: false });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50); // O 25, 100, etc.
    const [totalItems, setTotalItems] = useState(0);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [transactionToDelete, setTransactionToDelete] = useState(null); // { id, description, date }
    const [showScrollTop, setShowScrollTop] = useState(false);

    const navigate = useNavigate();
    const isMounted = useRef(true); // Para cleanup

    // --- Carga Inicial (Usuario, Avatar, Cuentas, Categorías, Transacciones) ---
    const fetchData = useCallback(async (currentUserId, currentFilters, currentSort, page = 1, perPage = 50) => {
        if (!currentUserId) { setIsLoading(false); return; }
   
        setIsLoading(true); setError(null);
        console.log(`Transactions: Fetching Page ${page} for ${currentUserId}, Filters:`, currentFilters, "Sort:", currentSort);
   
        try {
            // Cargar datos estáticos (perfil, cuentas, categorías)
            const [profileRes, accountsRes, categoriesRes] = await Promise.all([
                supabase.from('profiles').select('avatar_url').eq('id', currentUserId).single(),
                supabase.from('accounts').select('id, name, currency').eq('user_id', currentUserId).order('name'),
                supabase.from('categories').select('id, name, type, icon, color').or(`user_id.eq.${currentUserId},is_default.eq.true`).order('name')
            ]);
   
             if (!isMounted.current) return; // Usar isMounted.current si tienes esa ref
   
            // Procesar perfil, cuentas, categorías...
            if (profileRes.error && profileRes.status !== 406) console.warn("Error loading avatar", profileRes.error);
            setAvatarUrl(profileRes.data?.avatar_url || defaultAvatar); // Asume que tienes setAvatarUrl
            if (accountsRes.error) throw new Error(`Cuentas: ${accountsRes.error.message}`);
            setAccounts(accountsRes.data || []); // Asume setAccounts
            if (categoriesRes.error) throw new Error(`Categorías: ${categoriesRes.error.message}`);
            setCategories(categoriesRes.data || []); // Asume setCategories
   
            // --- Cargar Transacciones con Paginación ---
            const rangeFrom = (page - 1) * perPage;
            const rangeTo = rangeFrom + perPage - 1;
   
            let query = supabase.from('transactions')
                .select(`*, accounts ( name, currency ), categories ( name, icon, type, color )`, { count: 'exact' }) // <-- Pedir count
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
   
            // Aplicar Rango para paginación
            query = query.range(rangeFrom, rangeTo);
   
            // Ejecutar Query
            const { data, error: txError, count } = await query;
            if (txError) throw txError;
   
            if (isMounted.current) { // Usar isMounted.current si tienes esa ref
                setTransactions(data || []);
                setTotalItems(count || 0); // Guardar el total de items
                console.log(`Transactions: Page ${page} loaded (${data?.length || 0} items), Total matching: ${count}`);
            }
   
        } catch (error) {
            console.error("Error loading data (Transactions):", error);
             if (isMounted.current) {
                 toast.error(`Error al cargar datos: ${error.message}`);
                 setTransactions([]); setTotalItems(0); // Resetear en error
                 setError(error.message); // Asume que tienes setError
             }
        } finally {
            if (isMounted.current) setIsLoading(false);
        }
    }, [supabase])  // fetchTransactions se pasa como dependencia abajo

    // --- Efectos ---
    useEffect(() => {
        if (authLoading) { setIsLoading(true); return; }
        if (!user) { navigate('/login'); return; }
   
        // Llama a fetchData con la página actual
        fetchData(user.id, filters, sort, currentPage, itemsPerPage);
   
    }, [user, authLoading, navigate, fetchData, filters, sort, currentPage, itemsPerPage]); // Añadir currentPage e itemsPerPage
   
    // Efecto adicional para resetear la página a 1 si cambian filtros o sort
    useEffect(() => {
        // Solo resetear si no es la carga inicial (isLoading es false)
        // y si la página actual NO es ya la 1 (para evitar bucle)
        if (!isLoading && currentPage !== 1) {
             console.log("Filters/Sort changed, resetting to page 1");
             setCurrentPage(1); // Vuelve a la primera página
             // Esto disparará el useEffect anterior para recargar los datos de la página 1
        }
    }, [filters, sort]);

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
        const filterKey = id.replace('filter', '').charAt(0).toLowerCase() + id.replace('filter', '').slice(1);
        setFilters(prev => ({ ...prev, [filterKey]: value }));
        // No llamar a fetchData aquí, el useEffect [filters] lo hará
    }, []);

    const handleSort = useCallback((column) => {
        setSort(prevSort => ({
            column: column,
            ascending: prevSort.column === column ? !prevSort.ascending : false
        }));
        // El useEffect [sort] recargará
    }, []);


    // --- Manejadores Modales y CRUD ---
    const handleOpenModal = useCallback((mode = 'add', transaction = null) => {
        setModalMode(mode);
        setEditingTransaction(mode === 'edit' ? transaction : null);
        setModalError(''); // Limpiar error modal
        setIsModalOpen(true);
    }, []);

    const handleCloseModal = useCallback(() => {
        setIsModalOpen(false); setEditingTransaction(null); setModalError('');
    }, []);

    const handleSaveTransaction = useCallback(async (submittedFormData) => {
        if (!user?.id) { toast.error("Usuario no identificado."); return; }
        setIsSaving(true); setModalError(''); // Asume setModalError
        const toastId = toast.loading(modalMode === 'edit' ? 'Actualizando...' : 'Guardando...');
   
        const type = submittedFormData.type;
        const amount = Math.abs(parseFloat(submittedFormData.amount) || 0); // Validado en modal
        const transaction_date = submittedFormData.transaction_date;
        const description = submittedFormData.description;
        const notes = submittedFormData.notes || null;
   
        try {
            let error = null; // Definir error fuera del if/else
   
            if (type === 'transferencia') {
                // Lógica RPC para transferencia
                console.log("Processing TRANSFER via RPC...");
                const sourceAccountId = submittedFormData.account_id;
                const destinationAccountId = submittedFormData.account_destination_id;
   
                // Validaciones básicas ya hechas en el modal, pero podemos repetir
                if (!sourceAccountId || !destinationAccountId) throw new Error('Selecciona cuenta origen y destino.');
                if (sourceAccountId === destinationAccountId) throw new Error('Las cuentas no pueden ser la misma.');
   
                // Llamada RPC (asegúrate que la función SQL existe y los IDs de categoría son correctos en ella)
                const { data: rpcSuccess, error: rpcError } = await supabase.rpc(
                    'record_transfer_transaction',
                    {
                        user_id_param: user.id,
                        source_account_id_param: sourceAccountId,
                        destination_account_id_param: destinationAccountId,
                        amount_param: amount,
                        date_param: transaction_date,
                        description_param: description,
                        notes_param: notes
                    }
                );
                error = rpcError; // Asigna el error de la RPC
   
            } else { // Gasto o Ingreso
                console.log(`Processing ${type.toUpperCase()}...`);
                const account_id = submittedFormData.account_id;
                const category_id = submittedFormData.category_id || null;
                const signedAmount = type === 'gasto' ? -amount : amount;
                if (!account_id) throw new Error('Debes seleccionar una cuenta.');
   
                const transactionData = { /* ... (igual que antes, user_id NO es necesario si RLS está ok) ... */
                     account_id, category_id, type, description, amount: signedAmount, transaction_date, notes
                };
   
                let result;
                if (modalMode === 'edit' && editingTransaction?.id) {
                     if (editingTransaction.type === 'transferencia' || type === 'transferencia') throw new Error("No se puede editar a/desde transferencia.");
                     result = await supabase.from('transactions').update({...transactionData, updated_at: new Date()}).eq('id', editingTransaction.id).eq('user_id', user.id);
                } else {
                     result = await supabase.from('transactions').insert([{...transactionData, user_id: user.id}]); // Incluir user_id en insert
                }
                error = result.error; // Asigna el error de insert/update
            }
   
            // Verificar resultado final
            if (error) {
                 // Intenta extraer un mensaje más útil si es un error de RPC
                 const message = error.message.includes(':') ? error.message.split(':').slice(-1)[0].trim() : error.message;
                 throw new Error(message || 'Error desconocido al guardar.');
            }
   
            toast.success('¡Transacción guardada!', { id: toastId });
            handleCloseModal(); // Asume que tienes este handler
            fetchData(user.id, filters, sort, currentPage, itemsPerPage); // Recargar datos CON paginación actual
   
        } catch (error) {
            console.error(`Error saving transaction (${type}):`, error);
            setModalError(`Error: ${error.message}`); // Error para el modal
            toast.error(`Error: ${error.message}`, { id: toastId }); // Toast global
        } finally {
            setIsSaving(false);
        }
    // Asegúrate de incluir todas las dependencias externas usadas
    }, [user, modalMode, editingTransaction, accounts, supabase, handleCloseModal, fetchData, filters, sort, currentPage, itemsPerPage]);

    const handleDeleteTransaction = (transactionId, description, date) => {
        if (!transactionId) return;
        setItemToDelete({ id: transactionId, name: description || 'Transacción', date: date });
        setIsConfirmModalOpen(true);
    };

    // Confirmación de eliminación
    const confirmDeleteHandler = useCallback(async () => {
        if (!transactionToDelete || !user?.id) { toast.error("Faltan datos."); return; }
        const { id: transactionId, name: description, date } = transactionToDelete;
        setIsConfirmModalOpen(false);
        const toastId = toast.loading(`Eliminando "${description || 'transacción'}"...`);

        try {
            // ADVERTENCIA: Lógica simple, no maneja transferencias vinculadas automáticamente.
            // Una RPC sería mejor para borrar ambas partes de una transferencia.
             const tx = transactions.find(t => t.id === transactionId); // Encontrar datos originales
             if (tx && (tx.category_id === TRANSFER_CATEGORY_ID_IN || tx.category_id === TRANSFER_CATEGORY_ID_OUT)) {
                 toast.error('La eliminación de transferencias debe hacerse manualmente (borrar ambas partes) o con una función avanzada.', { id: toastId, duration: 6000 });
                 // Alternativa: intentar buscar y borrar la hermana (complejo y frágil)
                 // Alternativa 2: No permitir borrar aquí y añadir botón específico en modal de transferencia?
                 setItemToDelete(null);
                 return;
             }

            const { error } = await supabase.from('transactions').delete().eq('id', transactionId).eq('user_id', user.id);
            if (error) throw error;

            toast.success('Transacción eliminada.', { id: toastId });
            fetchData(user.id, filters, sort); // Recargar

        } catch (err) {
            console.error('Error eliminando transacción:', err);
            toast.error(`Error: ${err.message}`, { id: toastId });
        } finally {
            setItemToDelete(null);
        }
    }, [user, transactionToDelete, supabase, fetchData, filters, sort, transactions]); // Incluir 'transactions' si se usa para check de transferencia

    // --- Otros ---
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
            <Sidebar
                // Pasar estado de carga/guardado si quieres deshabilitar botones mientras ocurre algo
                isProcessing={isLoading || isSaving /* ...o el estado relevante */}
            />
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
                {/* --- Controles de Paginación --- */}
                {!isLoading && transactions.length > 0 && totalItems > itemsPerPage && ( // Mostrar solo si hay más de una página posible
                    <div className="pagination-controls">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1 || isSaving}
                        >
                            &lt; Anterior
                        </button>
                        <span>
                            Página {currentPage} de {Math.ceil(totalItems / itemsPerPage)} (Total: {totalItems})
                        </span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalItems / itemsPerPage)))}
                            disabled={currentPage * itemsPerPage >= totalItems || isSaving}
                        >
                            Siguiente &gt;
                        </button>
                        {/* Opcional: Select para cambiar itemsPerPage */}
                        { <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} disabled={isSaving}>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select> }
                    </div>
                )}

            </div> {/* Fin page-container */}

            {/* --- Modal --- */}
            <TransactionModal // <<< USA COMPONENTE
                isOpen={isModalOpen} onClose={handleCloseModal} onSubmit={handleSaveTransaction}
                mode={modalMode} initialData={editingTransaction}
                accounts={accounts} categories={categories} // Pasar listas
                isSaving={isSaving} error={modalError} setError={setModalError}
            />
            <ConfirmationModal // <<< USA COMPONENTE
                isOpen={isConfirmModalOpen}
                onClose={() => { setIsConfirmModalOpen(false); setTransactionToDelete(null); }}
                onConfirm={confirmDeleteHandler} title="Confirmar Eliminación"
                message={`¿Seguro eliminar "${transactionToDelete?.name || 'transacción'}" del ${formatDate(transactionToDelete?.date)}?`}
                confirmText="Eliminar" cancelText="Cancelar" isDanger={true}
            />

            {/* --- Botón Scroll-Top --- */}
            {showScrollTop && (
                <button onClick={scrollToTop} id="scrollTopBtn" className="scroll-top-btn visible" title="Volver arriba" disabled={isSaving}>
                    <i className="fas fa-arrow-up"></i>
                </button>
            )}

        </div> // Fin contenedor flex principal
    );
}

export default Transactions;
