/*
Archivo: src/pages/Investments.jsx
Propósito: Componente para la página de gestión de inversiones.
*/
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext.jsx';
import { formatCurrency, formatDate } from '../utils/formatters.js';
import Sidebar from '../components/layout/Sidebar.jsx'; 
// Icono ahora se usa en InvestmentCard
import InvestmentCard from '../components/Investments/InvestmentCard.jsx'; // Asume ruta src/components/
import InvestmentModal from '../components/Investments/InvestmentModal.jsx'; // Asume ruta src/components/
import toast from 'react-hot-toast';
import ConfirmationModal from '../components/ConfirmationModal.jsx';

// Importa imágenes
import defaultAvatar from '../assets/avatar_predeterminado.png';
import emptyMascot from '../assets/monstruo_pixar.png';

function Investments() {
    // --- Estado del Componente ---
    const { user, loading: authLoading } = useAuth();
    const [avatarUrl, setAvatarUrl] = useState(defaultAvatar);
    const [investments, setInvestments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Estados Modales
    const [isInvestmentModalOpen, setIsInvestmentModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [selectedInvestment, setSelectedInvestment] = useState(null); // Objeto para editar
    const [isSaving, setIsSaving] = useState(false);
    const [modalError, setModalError] = useState(''); // Error para pasar al modal

    // Estado Confirmación
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [investmentToDelete, setInvestmentToDelete] = useState(null); // { id, name }
    // Resumen Footer
    const [showSummaryFooter, setShowSummaryFooter] = useState(false);
    // UI
    const [showScrollTop, setShowScrollTop] = useState(false);

    const navigate = useNavigate();

    const fetchData = useCallback(async (currentUserId) => {
        setIsLoading(true); setError(null);
        setInvestments([]); setShowSummaryFooter(false);
        console.log(`Investments: Cargando datos para usuario ${currentUserId}`);
        try {
            const [profileRes, investmentsRes] = await Promise.all([
                supabase.from('profiles').select('avatar_url').eq('id', currentUserId).single(),
                supabase.from('investments').select('*').eq('user_id', currentUserId).order('name')
            ]);

            if (profileRes.error && profileRes.status !== 406) throw profileRes.error;
            setAvatarUrl(profileRes.data?.avatar_url || defaultAvatar);

            if (investmentsRes.error) throw investmentsRes.error;
            const fetchedInvestments = investmentsRes.data || [];
            setInvestments(fetchedInvestments);
            setShowSummaryFooter(fetchedInvestments.length > 0);

        } catch (err) {
            console.error("Error cargando datos (Investments):", err);
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
    }, [user, authLoading, navigate, fetchData]);

    // --- Cálculo Resumen Footer (useMemo) ---
    const summary = useMemo(() => {
        let totalCurrent = 0; let totalPurchase = 0;
        investments.forEach(inv => {
            const currentVal = Number(inv.current_value) || 0;
            const quantity = Number(inv.quantity) || 0;
            const purchasePrice = Number(inv.purchase_price) || 0;
            totalCurrent += currentVal;
            if (quantity > 0 && purchasePrice > 0) { totalPurchase += quantity * purchasePrice; }
        });
        const totalPL = totalCurrent - totalPurchase;
        return { totalCurrentValue: formatCurrency(totalCurrent), totalProfitLoss: (totalPL >= 0 ? '+' : '') + formatCurrency(totalPL), profitLossIsPositive: totalPL >= 0 };
    }, [investments]);

    // --- Manejadores Modales ---
    const handleOpenInvestmentModal = useCallback((mode = 'add', investment = null) => {
        setModalMode(mode); setSelectedInvestment(investment); setModalError('');
        setIsSaving(false); setIsInvestmentModalOpen(true);
    }, []);
    const handleCloseInvestmentModal = useCallback(() => { setIsInvestmentModalOpen(false); setSelectedInvestment(null); setModalError(''); }, []);

    // Submit Modal Inversión
    const handleInvestmentFormSubmit = useCallback(async (submittedFormData) => {
        if (!user?.id) { toast.error("Error: Usuario no identificado."); return; }
        setModalError(''); setIsSaving(true);
        const toastId = toast.loading(modalMode === 'edit' ? 'Guardando...' : 'Creando...');
        try {
            // Validaciones básicas ya hechas en modal, pero re-parseamos
            const currentValue = parseFloat(submittedFormData.current_value);
            const quantity = submittedFormData.quantity ? parseFloat(submittedFormData.quantity) : null;
            const purchasePrice = submittedFormData.purchase_price ? parseFloat(submittedFormData.purchase_price) : null;

            if (isNaN(currentValue) || currentValue < 0) throw new Error('Valor Actual inválido.');
            if (quantity !== null && (isNaN(quantity) || quantity < 0)) throw new Error('Cantidad inválida.');
            if (purchasePrice !== null && (isNaN(purchasePrice) || purchasePrice < 0)) throw new Error('Precio Compra inválido.');

            const dataToSave = {
                type: submittedFormData.type, name: submittedFormData.name.trim(),
                symbol: submittedFormData.symbol.trim() || null, quantity: quantity,
                purchase_price: purchasePrice, purchase_date: submittedFormData.purchase_date || null,
                current_value: currentValue, broker: submittedFormData.broker.trim() || null,
                notes: submittedFormData.notes.trim() || null,
            };

            let error;
            if (modalMode === 'edit' && selectedInvestment?.id) {
                const { error: uError } = await supabase.from('investments')
                    .update({ ...dataToSave, updated_at: new Date() })
                    .eq('id', selectedInvestment.id).eq('user_id', user.id); error = uError;
            } else {
                const { error: iError } = await supabase.from('investments')
                    .insert([{ ...dataToSave, user_id: user.id }]); error = iError;
            }
            if (error) throw error;

            toast.success('¡Inversión guardada!', { id: toastId });
            handleCloseInvestmentModal();
            fetchData(user.id); // Recargar
        } catch (err) {
            console.error('Error guardando inversión:', err);
            setModalError(`Error: ${err.message}`);
            toast.error(`Error: ${err.message}`, { id: toastId });
        } finally { setIsSaving(false); }
    }, [user, modalMode, selectedInvestment, supabase, handleCloseInvestmentModal, fetchData]);

    // Manejador Eliminación
    const handleDeleteInvestment = (investmentId, investmentName) => {
        if (!investmentId || !investmentName) return;
        setInvestmentToDelete({ id: investmentId, name: investmentName });
        setIsConfirmModalOpen(true);
    };

    const confirmDeleteHandler = useCallback(async () => {
        if (!investmentToDelete || !user?.id) { toast.error("Faltan datos."); return; }
        const { id: investmentId, name: investmentName } = investmentToDelete;
        setIsConfirmModalOpen(false);
        const toastId = toast.loading(`Eliminando "${investmentName}"...`);
        try {
            const { error } = await supabase.from('investments').delete()
                .eq('id', investmentId).eq('user_id', user.id);
            if (error) throw error;
            toast.success('Inversión eliminada.', { id: toastId });
            fetchData(user.id); // Recargar
        } catch (err) {
            console.error('Error eliminando inversión:', err);
            toast.error(`Error: ${err.message}`, { id: toastId });
        } finally { setInvestmentToDelete(null); }
    }, [user, investmentToDelete, supabase, fetchData]);

    // Otros manejadores
    const handleBack = useCallback(() => navigate('/dashboard'), [navigate]); // Volver siempre a dashboard?
    const scrollToTop = useCallback(() => window.scrollTo({ top: 0, behavior: 'smooth' }), []);

    // --- Renderizado ---
    // ... (JSX completo similar al anterior, SIN sidebar) ...
    return (
      <div style={{ display: 'flex' }}>
                  {/* Sidebar */}
            <Sidebar
                // Pasar estado de carga/guardado si quieres deshabilitar botones mientras ocurre algo
                isProcessing={isLoading || isSaving /* ...o el estado relevante */}
            />
            <div className="page-container">
                {/* Cabecera */}
                <div className="page-header investments-header">
                   {/* ... Cabecera JSX ... */}
                   <button onClick={handleBack} id="backButton" className="btn-icon" aria-label="Volver"><i className="fas fa-arrow-left"></i></button>
                   <div className="header-title-group"> <img id="userAvatarHeader" src={avatarUrl} alt="Avatar" className="header-avatar-small" /> <h1>Mis Inversiones</h1> </div>
                   <button onClick={() => handleOpenInvestmentModal('add')} id="addInvestmentBtn" className="btn btn-primary btn-add green-btn"> <i className="fas fa-plus"></i> Añadir </button>
                </div>

                {/* Lista Inversiones */}
                <div id="investmentListContainer" className="investment-list-grid">
                    {isLoading && <p>Cargando...</p>}
                    {error && <p style={{ color: 'red' }}>{error}</p>}
                    {!isLoading && investments.length === 0 && !error && ( /* Mensaje vacío */
                       <div id="noInvestmentsMessage" className="empty-list-message">
                            <img src={emptyMascot} alt="Mascota FinAi"/>
                            <p>Registra tus inversiones.</p>
                            <button onClick={() => handleOpenInvestmentModal('add')} id="addInvestmentFromEmptyBtn" className="btn btn-primary green-btn"> <i className="fas fa-plus"></i> Añadir Inversión </button>
                        </div>
                    )}
                    {!isLoading && investments.map(inv => (
                        <InvestmentCard
                            key={inv.id}
                            investment={inv}
                            onEdit={() => handleOpenInvestmentModal('edit', inv)}
                            onDelete={() => handleDeleteInvestment(inv.id, inv.name)}
                        />
                    ))}
                </div>

                {/* Footer Resumen */}
                {showSummaryFooter && !isLoading && !error && (
                   <div id="investmentSummaryFooter" className="summary-footer">
                       {/* ... Footer Summary JSX ... */}
                       <div className="summary-box green"> <span className="summary-label">Valor Total</span> <strong id="totalCurrentValue">{summary.totalCurrentValue}</strong> </div>
                       <div className={`summary-box ${summary.profitLossIsPositive ? 'blue' : 'red'}`}> <span className="summary-label">Gan./Pérd.</span> <strong id="totalProfitLoss" className={summary.profitLossIsPositive ? 'positive' : 'negative'}>{summary.totalProfitLoss}</strong> </div>
                   </div>
                )}
            </div> {/* Fin page-container */}

            {/* Modales */}
            <InvestmentModal
                isOpen={isInvestmentModalOpen} onClose={handleCloseInvestmentModal} onSubmit={handleInvestmentFormSubmit}
                mode={modalMode} initialData={selectedInvestment} isSaving={isSaving} error={modalError}
            />
            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => { setIsConfirmModalOpen(false); setInvestmentToDelete(null); }}
                onConfirm={confirmDeleteHandler} title="Confirmar Eliminación"
                message={`¿Seguro eliminar la inversión "${investmentToDelete?.name || ''}"?`}
                confirmText="Eliminar" cancelText="Cancelar" isDanger={true}
            />

            {/* Botón Scroll-Top */}
            {showScrollTop && ( <button onClick={scrollToTop} id="scrollTopBtn" className="scroll-top-btn green-btn visible" title="Volver arriba"> <i className="fas fa-arrow-up"></i> </button> )}
        </div>
    );
}
export default Investments;

