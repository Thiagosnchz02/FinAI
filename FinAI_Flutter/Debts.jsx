/*
Archivo: src/pages/Debts.jsx
Propósito: Componente para la página de gestión de deudas, incluyendo registro de pagos.
*/
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext.jsx';
import { formatCurrency, formatDate } from '../utils/formatters.js';
import Sidebar from '../components/layout/Sidebar.jsx'; 
import '../styles/Debts.scss';
// getIconForDebt ahora se usa en DebtCard
// getStatusBadgeClass, getStatusText ahora se usan en DebtCard
import DebtCard from '../components/Debts/DebtCard.jsx'; // Importar componente
import DebtModal from '../components/Debts/DebtModal.jsx'; // Importar componente
import PaymentModal from '../components/PaymentModal.jsx'; // Importar componente
import toast from 'react-hot-toast'; // Importar toast
import ConfirmationModal from '../components/ConfirmationModal.jsx'; // Importar componente
import PageHeader from '../components/layout/PageHeader.jsx';

// Importa imágenes
import defaultAvatar from '../assets/avatar_predeterminado.png';
import emptyMascot from '../assets/monstruo_pixar.png';

// --- Componente Principal ---
function Debts() {
    /// --- Estado ---
    const { user, loading: authLoading } = useAuth(); // Obtener user y estado de carga auth
    const [avatarUrl, setAvatarUrl] = useState(defaultAvatar);
    const [debts, setDebts] = useState([]); // Deudas del usuario
    const [accounts, setAccounts] = useState([]); // Cuentas del usuario (para modal pago)
    const [expenseCategories, setExpenseCategories] = useState([]); // Categorías de GASTO (para modal pago)
    // Eliminado paymentCategoryId
    const [isLoading, setIsLoading] = useState(true); // Carga general de datos de la página
    const [error, setError] = useState(null);

    // Modales (mantener estados, pero los componentes se extraerán)
    const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [selectedDebt, setSelectedDebt] = useState(null); // Guarda el objeto deuda completo
    const [isSaving, setIsSaving] = useState(false);
    const [modalError, setModalError] = useState('');

    // Modal Confirmación (lo añadiremos luego)
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [debtToDelete, setDebtToDelete] = useState(null);
    // Resumen Footer
    const [showSummaryFooter, setShowSummaryFooter] = useState(false);
    // UI
    const [showScrollTop, setShowScrollTop] = useState(false);

    const navigate = useNavigate();

    const fetchData = useCallback(async (currentUserId) => {
        setIsLoading(true);
        setError(null);
        setDebts([]); setAccounts([]); setExpenseCategories([]); setShowSummaryFooter(false);
        console.log(`Debts: Cargando datos para usuario ${currentUserId}`);
        try {
            const [profileRes, debtsRes, accountsRes, categoriesRes] = await Promise.all([
                supabase.from('profiles').select('avatar_url').eq('id', currentUserId).single(),
                supabase.from('debts').select('*').eq('user_id', currentUserId).order('status').order('due_date'),
                supabase.from('accounts')
                .select('id, name, type, currency')
                .eq('user_id', currentUserId)
                .eq('is_archived', false)
                .order('name'),
                supabase.from('categories').select('id, name, type, parent_category_id, is_default, is_archived') // Seleccionar categorías de INGRESO
                                    .or(`user_id.eq.${currentUserId},is_default.eq.true`) // Del usuario o default
                                    .order('name')
            ]);

            if (profileRes.error && profileRes.status !== 406) throw profileRes.error;
            setAvatarUrl(profileRes.data?.avatar_url || defaultAvatar);

            if (debtsRes.error) throw debtsRes.error;
            const fetchedDebts = debtsRes.data || [];
            setDebts(fetchedDebts);
            setShowSummaryFooter(fetchedDebts.length > 0);

            if (accountsRes.error) throw accountsRes.error;
            setAccounts(accountsRes.data || []);

            if (categoriesRes.error) throw categoriesRes.error;
            setExpenseCategories(categoriesRes.data || []);
            // Ya no buscamos categoryId específico

        } catch (err) {
            console.error("Error cargando datos (Debts):", err);
            setError(err.message || "Error al cargar datos.");
            setDebts([]); setAccounts([]); setExpenseCategories([]); setShowSummaryFooter(false);
        } finally {
            setIsLoading(false);
        }
    }, [supabase]); // Depende solo de supabase (implícitamente de user fuera)

    // --- Efectos ---
    useEffect(() => {
        if (authLoading) { setIsLoading(true); return; }
        if (!user) { navigate('/login'); return; }
        fetchData(user.id);
        const handleScroll = () => setShowScrollTop(window.scrollY > 300);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [user, authLoading, navigate, fetchData]); // Dependencias correctas

    const formattedExpenseCategoriesForPaymentModal = useMemo(() => {
        console.log("[Debts.jsx useMemo] Formateando categorías de GASTO para PaymentModal. 'expenseCategories'.length:", expenseCategories ? expenseCategories.length : 0);
        if (!expenseCategories || expenseCategories.length === 0) {
            return [];
        }
        
        const activeExpenseCategories = expenseCategories.filter(
            cat => cat.type === 'gasto' && !cat.is_archived
        );

        const categoryIdsInExpenseType = new Set(activeExpenseCategories.map(cat => cat.id));

        const topLevelExpenseCategories = activeExpenseCategories.filter(
            cat => !cat.parent_category_id || !categoryIdsInExpenseType.has(cat.parent_category_id)
        ).sort((a, b) => a.name.localeCompare(b.name));
        
        const subExpenseCategories = activeExpenseCategories.filter(
            cat => cat.parent_category_id && categoryIdsInExpenseType.has(cat.parent_category_id)
        ).sort((a, b) => a.name.localeCompare(b.name));

        const options = [];
        topLevelExpenseCategories.forEach(parent => {
            options.push({ 
                id: parent.id, 
                name: `${parent.name}${parent.is_default ? '' : ''}`
            });
            const children = subExpenseCategories.filter(sub => sub.parent_category_id === parent.id);
            children.forEach(child => {
                options.push({ 
                    id: child.id, 
                    name: `  ↳ ${child.name}`
                });
            });
        });
        console.log("[Debts.jsx useMemo] Opciones finales de GASTO para PaymentModal:", options.length);
        return options;
    }, [expenseCategories]);

    // --- Cálculo Resumen Footer ---
    const summary = useMemo(() => {
      console.log("Recalculando resumen de deudas..."); // Para depuración
      let totalPending = 0;
      let totalInitialActive = 0;
      let nextDue = null; // Guardará el objeto Date de la próxima fecha
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Poner hora a 0 para comparar solo fechas

      debts.forEach(debt => {
          // Considerar solo deudas no pagadas para los totales y fecha
          if (debt.status !== 'pagada') {
              totalPending += Number(debt.current_balance) || 0;
              totalInitialActive += Number(debt.initial_amount) || 0;

              // Encontrar la próxima fecha de vencimiento futura
              if (debt.due_date) {
                  try {
                      // Convertir la fecha de la deuda a objeto Date
                      const dueDate = new Date(debt.due_date);
                       // Ajustar por zona horaria para evitar problemas al comparar con 'today'
                       // getTimezoneOffset devuelve la diferencia en minutos, la convertimos a ms
                       const offset = dueDate.getTimezoneOffset() * 60 * 1000;
                       // Creamos una nueva fecha ajustada sumando el offset (si es UTC-3, suma 3 horas en ms)
                       const adjustedDueDate = new Date(dueDate.getTime() + offset);
                       adjustedDueDate.setHours(0,0,0,0); // Poner hora a 0 para comparar

                      // Verificar si la fecha es válida y si es futura (o hoy)
                      if (!isNaN(adjustedDueDate.getTime()) && adjustedDueDate >= today) {
                          // Si es la primera fecha futura encontrada O es anterior a la actual 'nextDue'
                          if (nextDue === null || adjustedDueDate < nextDue) {
                              nextDue = adjustedDueDate; // Guardar el objeto Date
                          }
                      }
                  } catch (e) {
                      // Ignorar fechas inválidas si la conversión falla
                      console.error("Error parsing due date for summary:", debt.due_date, e);
                  }
              }
          }
      });

      // Formatear los resultados para devolverlos
      return {
          totalPending: formatCurrency(totalPending),
          totalInitial: formatCurrency(totalInitialActive),
          // Formatear la fecha 'nextDue' encontrada (si existe) o devolver placeholder
          // Convertir de nuevo a formato YYYY-MM-DD antes de formatear con formatDate
          nextDueDate: nextDue ? formatDate(nextDue.toISOString().split('T')[0]) : '--/--/----'
      };
    }, [debts]);

    const openEditDebtModal = (debtToEdit) => {
        handleOpenDebtModal('edit', debtToEdit); // Llama a la original con 'edit' y el objeto deuda
    };

    // --- Manejadores Modales ---
    const handleOpenDebtModal = useCallback((mode = 'add', debt = null) => {
        setModalMode(mode); setSelectedDebt(debt); setModalError('');
        setIsSaving(false); setIsDebtModalOpen(true);
    }, []);

    const handleCloseDebtModal = useCallback(() => { setIsDebtModalOpen(false); setSelectedDebt(null); setModalError(''); }, []);
    const handleOpenPaymentModal = useCallback((debt) => {
        setSelectedDebt(debt); setModalError(''); setIsSaving(false); setIsPaymentModalOpen(true);
        // El estado inicial del form de pago se maneja en PaymentModal
    }, []);

    const handleClosePaymentModal = useCallback(() => { setIsPaymentModalOpen(false); setSelectedDebt(null); setModalError(''); }, []);
    
    const handleDebtFormSubmit = useCallback(async (submittedFormData) => {
        if (!user?.id) { toast.error("Error: Usuario no identificado."); return; }
        // Las validaciones básicas ya se hicieron en el modal
        setModalError(''); setIsSaving(true);
        const toastId = toast.loading(modalMode === 'edit' ? 'Guardando...' : 'Creando...');
        try {
            const initialAmount = parseFloat(submittedFormData.initial_amount);
            const currentBalance = parseFloat(submittedFormData.current_balance);
            const interestRate = parseFloat(submittedFormData.interest_rate);
            const dataToSave = {
                creditor: submittedFormData.creditor.trim(),
                description: submittedFormData.description.trim() || null,
                initial_amount: initialAmount,
                current_balance: currentBalance,
                interest_rate: !isNaN(interestRate) ? interestRate : null,
                due_date: submittedFormData.due_date || null,
                status: submittedFormData.status,
                notes: submittedFormData.notes.trim() || null,
            };

            let error;
            if (modalMode === 'edit' && selectedDebt?.id) {
                const { error: uError } = await supabase.from('debts')
                    .update({ ...dataToSave, updated_at: new Date() })
                    .eq('id', selectedDebt.id).eq('user_id', user.id); error = uError;
            } else {
                const { error: iError } = await supabase.from('debts')
                    .insert([{ ...dataToSave, user_id: user.id }]); error = iError;
            }
            if (error) throw error;

            toast.success('¡Deuda guardada!', { id: toastId });
            handleCloseDebtModal();
            fetchData(user.id);
        } catch (err) {
            console.error('Error guardando deuda:', err);
            setModalError(`Error: ${err.message}`); // Error para el modal
            toast.error(`Error: ${err.message}`, { id: toastId }); // Toast global
        } finally { setIsSaving(false); }
    }, [user, modalMode, selectedDebt, supabase, handleCloseDebtModal, fetchData]);

    
    const handlePaymentFormSubmit = useCallback(async (submittedPaymentData) => {
        if (!user?.id || !selectedDebt) { toast.error("Error inesperado."); return; }
        // Validaciones ya hechas en el modal

        const paymentAmount = parseFloat(submittedPaymentData.amount);
        const paymentDate = submittedPaymentData.date;
        const accountId = submittedPaymentData.accountId;
        const categoryId = submittedPaymentData.categoryId;
        const paymentNotes = submittedPaymentData.notes.trim() || null;

        // Confirmación de pago excesivo (se mantiene igual por ahora)
        const currentBalance = Number(selectedDebt.current_balance) || 0;
        if (paymentAmount > currentBalance) {
            if (!window.confirm(`Estás pagando ${formatCurrency(paymentAmount)}, más de lo pendiente (${formatCurrency(currentBalance)}). ¿Continuar?`)){
                return;
            }
        }

        setModalError(''); setIsSaving(true);
        const toastId = toast.loading('Registrando pago...');
        try {
            // --- LLAMADA A LA FUNCIÓN RPC ---
            console.log('Llamando a RPC record_debt_payment');
            const { data: rpcSuccess, error: rpcError } = await supabase.rpc(
                'record_debt_payment', // Nombre exacto de la función SQL
                { // Parámetros con nombres EXACTOS a los de la función SQL
                    user_id_param: user.id,
                    debt_id_param: selectedDebt.id,
                    payment_amount_param: paymentAmount,
                    payment_date_param: paymentDate,
                    payment_account_id_param: accountId,
                    payment_category_id_param: categoryId,
                    payment_notes_param: paymentNotes
                }
            );
    
            // --- Manejar Respuesta RPC ---
            if (rpcError) {
                // Si la función SQL lanzó una excepción, rpcError tendrá detalles
                console.error("Error RPC al registrar pago:", rpcError);
                throw new Error(rpcError.message || 'Error en la base de datos al registrar el pago.');
            }
    
            // Si la RPC no lanzó error (y devolvió true o simplemente no devolvió nada específico en error)
            console.log('RPC record_debt_payment ejecutada con éxito:', rpcSuccess);
            toast.success('¡Pago registrado y deuda actualizada!', { id: toastId });
            handleClosePaymentModal();
            fetchData(user.id); // Recargar datos
    
        } catch (error) { // Captura errores de la llamada RPC o validaciones previas
            console.error('Error procesando pago de deuda:', error);
            setModalError(`Error: ${error.message}`); // Error en modal
            toast.error(`Error al registrar el pago: ${error.message}`, { id: toastId }); // Toast global
        } finally {
            setIsSaving(false);
        }
    // Actualizar dependencias: selectedDebt, supabase, fetchData, etc.
    // Ya no necesita 'accounts' o 'expenseCategories' directamente aquí.
    }, [user, selectedDebt, supabase, handleClosePaymentModal, fetchData]);
    
    const handleDeleteDebt = (debtId, debtCreditor) => { // Ya no necesita ser async aquí
        if (!debtId || !debtCreditor) {
            console.error("Se necesita ID y nombre para eliminar.");
            toast.error("No se puede iniciar la eliminación (faltan datos).")
            return;
        }
        // Guarda los datos de la deuda a eliminar
        setDebtToDelete({ id: debtId, name: debtCreditor });
        // Abre el modal de confirmación
        setIsConfirmModalOpen(true);
    };

    const confirmDeleteHandler = useCallback(async () => { // Ejecuta la eliminación
        if (!debtToDelete || !user?.id) { /* ... (manejo error igual) */ return; }
        const { id: debtId, name: debtCreditor } = debtToDelete;
        setIsConfirmModalOpen(false);
        const toastId = toast.loading(`Eliminando deuda "${debtCreditor}"...`);
        try {
            const { error } = await supabase.from('debts')
                .delete().eq('id', debtId).eq('user_id', user.id);
            if (error) {
                if (error.code === '23503') {
                     toast.error('No se puede eliminar, tiene pagos asociados.', { id: toastId, duration: 6000 });
                } else { throw error; }
            } else {
                toast.success('Deuda eliminada.', { id: toastId });
                fetchData(user.id); // Recargar
            }
        } catch (err) { /* ... (manejo error igual con toast) */
             console.error('Error eliminando deuda (confirmado):', err);
             toast.error(`Error: ${err.message}`, { id: toastId });
        } finally { setDebtToDelete(null); }
    }, [user, debtToDelete, supabase, fetchData]);

    // Otros manejadores
    
    const handleBack = useCallback(() => navigate(-1), [navigate]);
    const scrollToTop = useCallback(() => window.scrollTo({ top: 0, behavior: 'smooth' }), []);

    const debtPageAction = (
        <button 
            onClick={() => handleOpenDebtModal('add')} 
            id="addDebtBtn" 
            className="btn btn-primary btn-add" // Tus clases existentes
            // disabled se maneja por isProcessingPage en PageHeader,
            // o puedes añadir lógica específica aquí si es necesario
            // disabled={isLoading || isSaving} 
        >
            <i className="fas fa-plus"></i> Añadir Deuda
        </button>
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
              {/* ... Cabecera ... */}
               <PageHeader 
                    pageTitle="Mis Deudas"
                    headerClassName="debts-header" // Tu clase específica si la necesitas
                    showSettingsButton={false}     // No mostrar botón de settings aquí
                    isProcessingPage={isLoading || isSaving} // Para deshabilitar botones de PageHeader si es necesario
                    actionButton={debtPageAction}    // <-- Pasar el botón "Añadir Deuda"
                />
              {/* Lista de Deudas (usando DebtCard) */}
              <div id="debtList" className="debt-list-grid">
                  {isLoading && !debts.length && <p>Cargando...</p>}
                  {error && <p style={{color:'red'}}>{error}</p>}
                  {!isLoading && debts.length === 0 && !error && ( /* Mensaje vacío */
                     <div id="noDebtsMessage" className="empty-list-message" style={{ gridColumn: '1 / -1' }}> <img src={emptyMascot} alt="Mascota FinAi Feliz" className="empty-mascot" /> <p>¡Enhorabuena! No tienes deudas registradas.</p> <p>Si tienes alguna, añádela.</p> <button onClick={() => handleOpenDebtModal('add')} id="addDebtFromEmptyBtn" className="btn btn-primary"> <i className="fas fa-plus"></i> Añadir Mi Primera Deuda </button> </div>
                  )}
                  {debts.map(debt => (
                      <DebtCard
                          key={debt.id}
                          debt={debt}
                          onEdit={openEditDebtModal}
                          onDelete={handleDeleteDebt} // Pasa la función que abre el confirm modal
                          onAddPayment={handleOpenPaymentModal}
                      />
                  ))}
              </div>
              {/* ... Footer Resumen ... */}
               {showSummaryFooter && !isLoading && !error && (
                    <div id="summary-footer" className="summary-footer">
                        <div className="summary-box blue"> <span className="summary-label">Total Pendiente</span> <strong id="totalPendingAmount">{summary.totalPending}</strong> </div>
                        <div className="summary-box green"> <span className="summary-label">Total Inicial</span> <strong id="totalInitialAmount">{summary.totalInitial}</strong> <small>(Deudas Activas)</small> </div>
                        <div className="summary-box purple"> <span className="summary-label">Próximo Vencimiento</span> <strong id="nextDueDate">{summary.nextDueDate}</strong> </div>
                    </div>
                )}
            </div> {/* Fin page-container */}

            {/* --- Modales (usando componentes) --- */}
            <DebtModal
                isOpen={isDebtModalOpen}
                onClose={handleCloseDebtModal}
                onSubmit={handleDebtFormSubmit}
                mode={modalMode}
                initialData={selectedDebt}
                isSaving={isSaving}
                error={modalError}
            />
            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={handleClosePaymentModal}
                onSubmit={handlePaymentFormSubmit}
                selectedDebt={selectedDebt} // Pasa la deuda completa
                accounts={accounts} // Pasa lista de cuentas
                expenseCategories={formattedExpenseCategoriesForPaymentModal} // Pasa lista de categorías de GASTO
                isSaving={isSaving}
                error={modalError}
            />
            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => { setIsConfirmModalOpen(false); setDebtToDelete(null); }}
                onConfirm={confirmDeleteHandler}
                title="Confirmar Eliminación"
                message={`¿Estas Seguro que quiere eliminar la deuda con "${debtToDelete?.name || ''}"? No se puede deshacer.`}
                confirmText="Eliminar"
                cancelText="Cancelar"
                isDanger={true}
            />

            {/* Botón Scroll-Top */}
            {showScrollTop && ( <button onClick={scrollToTop} id="scrollTopBtn" className="scroll-top-btn visible" title="Volver arriba"> <i className="fas fa-arrow-up"></i> </button> )}
        </div>
    );
}

export default Debts;


