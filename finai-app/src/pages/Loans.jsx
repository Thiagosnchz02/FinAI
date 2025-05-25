/*
Archivo: src/pages/Loans.jsx
Propósito: Componente para la página de gestión de préstamos realizados a terceros.
*/
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext.jsx';
import { formatCurrency, formatDate } from '../utils/formatters.js';
import Sidebar from '../components/layout/Sidebar.jsx'; 
import PageHeader from '../components/layout/PageHeader.jsx';
import '../styles/Loans.scss';
// Iconos y estado ahora en LoanCard
import LoanCard from '../components/Loans/LoanCard.jsx'; // Asume ruta src/components/
import LoanModal from '../components/Loans/LoanModal.jsx'; // Asume ruta src/components/
import CollectionModal from '../components/CollectionModal.jsx'; // Asume ruta src/components/
import toast from 'react-hot-toast';
import ConfirmationModal from '../components/ConfirmationModal.jsx';

// Importa imágenes
import defaultAvatar from '../assets/avatar_predeterminado.png';
import emptyMascot from '../assets/monstruo_pixar.png';

// --- Constantes ---
//const COLLECTION_CATEGORY_NAME = 'Devolución Préstamos'; // Nombre exacto categoría INGRESO

function Loans() {
    // --- Estado del Componente ---
    const { user, loading: authLoading } = useAuth();
    const [avatarUrl, setAvatarUrl] = useState(defaultAvatar);
    const [loans, setLoans] = useState([]);
    const [accounts, setAccounts] = useState([]); // Cuentas del usuario (para modal cobro)
    const [incomeCategories, setIncomeCategories] = useState([]); // Categorías de INGRESO (para modal cobro)
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Estados Modales
    const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
    const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add'); // Para LoanModal
    const [selectedLoan, setSelectedLoan] = useState(null); // Para editar o añadir cobro
    const [isSaving, setIsSaving] = useState(false); // Común para modales
    const [modalError, setModalError] = useState('');

    // Estado Confirmación
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [loanToDelete, setLoanToDelete] = useState(null); // { id, name }
    // Resumen Footer
    const [showSummaryFooter, setShowSummaryFooter] = useState(false);
    // UI
    const [showScrollTop, setShowScrollTop] = useState(false);

    const navigate = useNavigate();

    const fetchData = useCallback(async (currentUserId) => {
        setIsLoading(true); setError(null);
        setLoans([]); setAccounts([]); setIncomeCategories([]); setShowSummaryFooter(false);
        console.log(`Loans: Cargando datos para usuario ${currentUserId}`);
        try {
            const [profileRes, loansRes, accountsRes, categoriesRes] = await Promise.all([
                supabase.from('profiles').select('avatar_url').eq('id', currentUserId).single(),
                supabase.from('loans').select('*').eq('user_id', currentUserId).order('status').order('due_date'),
                supabase.from('accounts')
                .select('id, name')
                .eq('user_id', currentUserId)
                .eq('is_archived', false)
                .order('name'),
                supabase.from('categories').select('id, name, type, parent_category_id, is_default, is_archived') // Seleccionar categorías de INGRESO
                    .or(`user_id.eq.${currentUserId},is_default.eq.true`) // Del usuario o default
                    .eq('type', 'ingreso') // <<<--- Tipo INGRESO
                    .order('name')
            ]);

            if (profileRes.error && profileRes.status !== 406) throw profileRes.error;
            setAvatarUrl(profileRes.data?.avatar_url || defaultAvatar);

            if (loansRes.error) throw loansRes.error;
            const fetchedLoans = loansRes.data || [];
            setLoans(fetchedLoans);
            setShowSummaryFooter(fetchedLoans.length > 0);

            if (accountsRes.error) throw accountsRes.error;
            setAccounts(accountsRes.data || []);

            if (categoriesRes.error) throw categoriesRes.error;
            setIncomeCategories(categoriesRes.data || []); // Guardar categorías de INGRESO

        } catch (err) {
            console.error("Error cargando datos (Loans):", err);
            setError(err.message || "Error al cargar datos.");
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    // --- Efectos ---
    useEffect(() => {
        if (authLoading) { setIsLoading(true); return; }
        if (!user) { navigate('/login'); return; }
        fetchData(user.id);

        const handleScroll = () => setShowScrollTop(window.scrollY > 300);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [user, authLoading, navigate, fetchData]); // Dependencias

    const formattedIncomeCategoriesForSelect = useMemo(() => {
        console.log("[Loans.jsx useMemo] Formateando categorías de INGRESO para CollectionModal. 'incomeCategories'.length:", incomeCategories ? incomeCategories.length : 0);
        if (!incomeCategories || incomeCategories.length === 0) {
            return [];
        }
        
        // Asegurarse de que solo se procesan las de tipo 'ingreso' y no archivadas
        // (Aunque fetchData ya podría haber filtrado por tipo, una doble verificación no hace daño y maneja 'is_archived')
        const activeIncomeCategories = incomeCategories.filter(
            cat => cat.type === 'ingreso' && !cat.is_archived
        );

        const categoryIdsInIncomeType = new Set(activeIncomeCategories.map(cat => cat.id));

        const topLevelIncomeCategories = activeIncomeCategories.filter(
            cat => !cat.parent_category_id || !categoryIdsInIncomeType.has(cat.parent_category_id)
        ).sort((a, b) => a.name.localeCompare(b.name));
        
        const subIncomeCategories = activeIncomeCategories.filter(
            cat => cat.parent_category_id && categoryIdsInIncomeType.has(cat.parent_category_id)
        ).sort((a, b) => a.name.localeCompare(b.name));

        const options = [];
        topLevelIncomeCategories.forEach(parent => {
            options.push({ 
                id: parent.id, 
                name: `${parent.name}${parent.is_default ? '' : ''}`
            });
            const children = subIncomeCategories.filter(sub => sub.parent_category_id === parent.id);
            children.forEach(child => {
                options.push({ 
                    id: child.id, 
                    name: `  ↳ ${child.name}` // Indentación con prefijo
                });
            });
        });
        console.log("[Loans.jsx useMemo] Opciones finales de INGRESO para CollectionModal:", options.length);
        return options;
    }, [incomeCategories]);

    // --- Cálculo Resumen Footer (useMemo) ---
    const summary = useMemo(() => {
        let totalOwed = 0; let totalLoaned = 0; let nextDue = null; const today = new Date(); today.setHours(0, 0, 0, 0);
        loans.forEach(loan => { if (loan.status !== 'cobrado') { totalOwed += Number(loan.current_balance) || 0; totalLoaned += Number(loan.initial_amount) || 0; if (loan.due_date) { try { const dueDate = new Date(loan.due_date); const offset = dueDate.getTimezoneOffset(); const adjustedDueDate = new Date(dueDate.getTime() + (offset * 60 * 1000)); adjustedDueDate.setHours(0,0,0,0); if (adjustedDueDate >= today) { if (nextDue === null || adjustedDueDate < nextDue) nextDue = adjustedDueDate; } } catch (e) {} } } });
        return { totalOwedToUser: formatCurrency(totalOwed), totalLoanedActive: formatCurrency(totalLoaned), nextDueDateLoan: nextDue ? formatDate(nextDue.toISOString().split('T')[0]) : '--/--/----' };
    }, [loans]);

    // --- Manejadores Modales ---
    const handleOpenLoanModal = useCallback((mode = 'add', loan = null) => {
        setModalMode(mode); setSelectedLoan(loan); setModalError('');
        setIsSaving(false); setIsLoanModalOpen(true);
    }, []);
    const handleCloseLoanModal = useCallback(() => { setIsLoanModalOpen(false); setSelectedLoan(null); setModalError(''); }, []);

    const handleOpenCollectionModal = useCallback((loan) => {
        // Ya no se valida categoryId aquí
        setSelectedLoan(loan); setModalError(''); setIsSaving(false); setIsCollectionModalOpen(true);
    }, []);
    const handleCloseCollectionModal = useCallback(() => { setIsCollectionModalOpen(false); setSelectedLoan(null); setModalError(''); }, []);

    // Submit Modal Préstamo
    const handleLoanFormSubmit = useCallback(async (submittedFormData) => {
        if (!user?.id) { toast.error("Error: Usuario no identificado."); return; }
        setModalError(''); setIsSaving(true);
        const toastId = toast.loading(modalMode === 'edit' ? 'Guardando...' : 'Creando...');
        try {
            // Validaciones y construcción de dataToSave (igual que antes, usando submittedFormData)
            const initialAmount = parseFloat(submittedFormData.initial_amount);
            const currentBalance = parseFloat(submittedFormData.current_balance);
            const interestRate = parseFloat(submittedFormData.interest_rate);
             if (!submittedFormData.debtor.trim() || isNaN(initialAmount) || initialAmount <= 0 || isNaN(currentBalance) || currentBalance < 0) {
                 throw new Error('Deudor, Importe Inicial (>0) y Saldo Pendiente (>=0) obligatorios.');
             }
             if (modalMode === 'add' && currentBalance > initialAmount) {
                  throw new Error('Saldo pendiente no puede ser mayor que inicial al crear.');
             }
            // ... (otras validaciones si son necesarias)

            const dataToSave = {
                debtor: submittedFormData.debtor.trim(), description: submittedFormData.description.trim() || null,
                initial_amount: initialAmount, current_balance: currentBalance,
                interest_rate: !isNaN(interestRate) ? interestRate : null,
                due_date: submittedFormData.due_date || null, status: submittedFormData.status,
                reminder_enabled: submittedFormData.reminder_enabled, notes: submittedFormData.notes.trim() || null,
            };

            let error;
            if (modalMode === 'edit' && selectedLoan?.id) {
                const { error: uError } = await supabase.from('loans').update({ ...dataToSave, updated_at: new Date() })
                    .eq('id', selectedLoan.id).eq('user_id', user.id); error = uError;
            } else {
                const { error: iError } = await supabase.from('loans').insert([{ ...dataToSave, user_id: user.id }]); error = iError;
            }
            if (error) throw error;

            toast.success('¡Préstamo guardado!', { id: toastId });
            handleCloseLoanModal();
            fetchData(user.id); // Recargar
        } catch (err) {
            console.error('Error guardando préstamo:', err);
            setModalError(`Error: ${err.message}`);
            toast.error(`Error: ${err.message}`, { id: toastId });
        } finally { setIsSaving(false); }
    }, [user, modalMode, selectedLoan, supabase, handleCloseLoanModal, fetchData]);

    // Submit Modal Cobro
    const handleCollectionFormSubmit = useCallback(async (submittedCollectionData) => {
        if (!user?.id || !selectedLoan) { toast.error("Error inesperado."); return; }
        // Validaciones básicas ya hechas en el modal (importe, fecha, cuenta, categoría)
        const collectionAmount = parseFloat(submittedCollectionData.amount);
        const currentBalance = Number(selectedLoan.current_balance) || 0;
    
        // Confirmación cobro excesivo (Reemplazar por ConfirmationModal si se desea)
        if (collectionAmount > currentBalance) {
            if (!window.confirm(`Registrando cobro de <span class="math-inline">\{formatCurrency\(collectionAmount\)\}, más de lo pendiente \(</span>{formatCurrency(currentBalance)}).\n¿Continuar? (Saldo quedará en 0).`)) {
                return; // Cancela si el usuario no confirma
            }
        }
    
        setModalError(''); setIsSaving(true);
        const toastId = toast.loading('Registrando cobro...');
    
        try {
            // --- LLAMADA A LA FUNCIÓN RPC ---
            console.log('Llamando a RPC record_loan_collection');
            const { data: rpcSuccess, error: rpcError } = await supabase.rpc(
                'record_loan_collection', // Nombre exacto de la función SQL
                { // Parámetros con nombres EXACTOS a los de la función SQL
                    user_id_param: user.id,
                    loan_id_param: selectedLoan.id,
                    collection_amount_param: collectionAmount,
                    collection_date_param: submittedCollectionData.date,
                    collection_account_id_param: submittedCollectionData.accountId, // Cuenta destino
                    collection_category_id_param: submittedCollectionData.categoryId, // Categoría ingreso seleccionada
                    collection_notes_param: submittedCollectionData.notes.trim() || null
                }
            );
    
            // --- Manejar Respuesta RPC ---
            if (rpcError) {
                console.error("Error RPC al registrar cobro:", rpcError);
                // Intenta extraer un mensaje más útil si la RPC lanza una excepción específica
                const message = rpcError.message.includes(':') ? rpcError.message.split(':').slice(-1)[0].trim() : rpcError.message;
                throw new Error(message || 'Error en la base de datos al registrar el cobro.');
            }
    
            console.log('RPC record_loan_collection ejecutada:', rpcSuccess);
            toast.success('¡Cobro registrado!', { id: toastId });
            handleCloseCollectionModal();
            fetchData(user.id); // Recargar datos
    
        } catch (error) { // Captura errores de la llamada RPC o validaciones previas
            console.error('Error procesando cobro de préstamo:', error);
            setModalError(`Error: ${error.message}`); // Error en modal
            toast.error(`Error al registrar el cobro: ${error.message}`, { id: toastId }); // Toast global
        } finally {
            setIsSaving(false);
        }
    // Asegúrate de que las dependencias sean correctas
    }, [user, selectedLoan, supabase, handleCloseCollectionModal, fetchData]);

    // Manejador Eliminación
    const handleDeleteLoan = (loanId, debtorName) => { // Abre modal confirmación
        if (!loanId || !debtorName) return;
        setLoanToDelete({ id: loanId, name: debtorName });
        setIsConfirmModalOpen(true);
    };

    const confirmDeleteHandler = useCallback(async () => { // Ejecuta eliminación
        if (!loanToDelete || !user?.id) { toast.error("Faltan datos."); return; }
        const { id: loanId, name: debtorName } = loanToDelete;
        setIsConfirmModalOpen(false);
        const toastId = toast.loading(`Eliminando préstamo a "${debtorName}"...`);
        try {
            // Aquí podríamos querer eliminar transacciones de cobro asociadas si existen
            // o usar ON DELETE CASCADE/SET NULL en la BD si 'related_loan_id' existe
            console.warn("Eliminando préstamo:", loanId, " (No se eliminan transacciones de cobro asociadas automáticamente)");
            const { error } = await supabase.from('loans').delete()
                .eq('id', loanId).eq('user_id', user.id);
            if (error) {
                // Manejar error FK si alguna otra tabla depende de 'loans'
                throw error;
            }
            toast.success('Préstamo eliminado.', { id: toastId });
            fetchData(user.id); // Recargar
        } catch (err) {
            console.error('Error eliminando préstamo:', err);
            toast.error(`Error: ${err.message}`, { id: toastId });
        } finally { setLoanToDelete(null); }
    }, [user, loanToDelete, supabase, fetchData]);

    // Otros manejadores
    
    const handleBack = useCallback(() => navigate(-1), [navigate]);
    const scrollToTop = useCallback(() => window.scrollTo({ top: 0, behavior: 'smooth' }), []);

    const loanPageAction = (
        <button 
            onClick={() => handleOpenLoanModal('add')} 
            id="addLoanBtn" // Es buena práctica tener IDs únicos si son necesarios
            className="btn btn-primary btn-add" // Tus clases existentes
            // disabled se maneja por isProcessingPage en PageHeader,
            // o puedes añadir lógica específica aquí si es necesario
            // disabled={isLoading || isSaving} 
        >
            <i className="fas fa-plus"></i> Añadir Préstamo
        </button>
    );

    // --- Renderizado ---
    // ... (JSX completo similar a Debts.jsx, adaptando nombres de clase, textos y lógica de renderizado) ...
    return (
        <div style={{ display: 'flex' }}>
            {/* Sidebar */}
            <Sidebar
                // Pasar estado de carga/guardado si quieres deshabilitar botones mientras ocurre algo
                isProcessing={isLoading || isSaving /* ...o el estado relevante */}
            />
            {/* Contenido */}
            <div className="page-container">
                {/* Cabecera */}
                <PageHeader 
                    pageTitle="Mis Préstamos"
                    headerClassName="loans-header" // Tu clase específica si la necesitas
                    showSettingsButton={false}    // No mostrar botón de settings aquí
                    isProcessingPage={isLoading || isSaving} // Para deshabilitar botones de PageHeader si es necesario
                    actionButton={loanPageAction}   // <-- Pasar el botón "Añadir Préstamo"
                    // showBackButton={true} // Ya es true por defecto, no necesitas pasarlo si quieres el botón de volver
                />

                {/* Lista Préstamos */}
                <div id="loanList" className="loan-list"> {/* Usa clase específica si tienes estilos */}
                    {isLoading && <p>Cargando...</p>}
                    {error && <p style={{ color: 'red' }}>{error}</p>}
                    {!isLoading && loans.length === 0 && !error && ( /* Mensaje vacío */
                       <div className="empty-list-message"> <img src={emptyMascot} alt="Mascota"/> <p>No has registrado préstamos.</p> <button onClick={() => handleOpenLoanModal('add')} className="btn btn-primary"> <i className="fas fa-plus"></i> Registrar Préstamo </button> </div>
                    )}
                    {!isLoading && loans.map(loan => (
                        <LoanCard // <<< USA COMPONENTE LoanCard
                            key={loan.id}
                            loan={loan}
                            onEdit={() => handleOpenLoanModal('edit', loan)}
                            onDelete={() => handleDeleteLoan(loan.id, loan.debtor)}
                            onAddCollection={handleOpenCollectionModal} // Pasa handler para abrir modal cobro
                        />
                    ))}
                </div>

                {/* Footer Resumen */}
                {showSummaryFooter && !isLoading && !error && (
                   <div id="summary-footer" className="summary-footer">
                       {/* ... Footer Summary JSX ... */}
                       <div className="summary-box blue"> <span className="summary-label">Total por cobrar</span> <strong id="totalOwedToUser">{summary.totalOwedToUser}</strong> </div>
                       <div className="summary-box purple"> <span className="summary-label">Total prestado</span> <strong id="totalLoanedActive">{summary.totalLoanedActive}</strong> <small>(Activos)</small> </div>
                       <div className="summary-box orange"> <span className="summary-label">Próximo vencimiento</span> <strong id="nextDueDateLoan">{summary.nextDueDateLoan}</strong> </div>
                   </div>
                )}
            </div> {/* Fin page-container */}

            {/* Modales */}
            <LoanModal // <<< USA COMPONENTE LoanModal
                isOpen={isLoanModalOpen} onClose={handleCloseLoanModal} onSubmit={handleLoanFormSubmit}
                mode={modalMode} initialData={selectedLoan} isSaving={isSaving} error={modalError}
            />
            <CollectionModal // <<< USA COMPONENTE CollectionModal
                isOpen={isCollectionModalOpen} 
                onClose={handleCloseCollectionModal} 
                onSubmit={handleCollectionFormSubmit}
                selectedLoan={selectedLoan} 
                accounts={accounts} 
                incomeCategories={formattedIncomeCategoriesForSelect} // Pasa categorías de INGRESO
                isSaving={isSaving} 
                error={modalError}
            />
            <ConfirmationModal // <<< USA COMPONENTE ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => { setIsConfirmModalOpen(false); setLoanToDelete(null); }}
                onConfirm={confirmDeleteHandler} title="Confirmar Eliminación"
                message={`¿Seguro eliminar el préstamo a "${loanToDelete?.name || ''}"?`}
                confirmText="Eliminar" cancelText="Cancelar" isDanger={true}
            />

            {/* Botón Scroll-Top */}
            {showScrollTop && ( <button onClick={scrollToTop} id="scrollTopBtn" className="scroll-top-btn visible" title="Volver arriba"><i className="fas fa-arrow-up"></i></button> )}
        </div>
    );
}
export default Loans;