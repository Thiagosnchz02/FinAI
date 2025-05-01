/*
Archivo: src/pages/Investments.jsx
Propósito: Componente para la página de gestión de inversiones.
*/
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Link no se usa si no hay sidebar
import { supabase } from '../services/supabaseClient'; // Importa cliente Supabase

// Importa imágenes
import defaultAvatar from '../assets/avatar_predeterminado.png';
import emptyMascot from '../assets/monstruo_pixar.png';

// --- Funciones de Utilidad --- (Mover a /utils)
// --- Funciones de Utilidad --- (Mover a /utils)
/**
 * Formatea un número como moneda en formato español (EUR por defecto).
 * @param {number | string | null | undefined} value El valor numérico a formatear.
 * @param {string} [currency='EUR'] El código de moneda ISO 4217.
 * @returns {string} El valor formateado como moneda o 'N/A' si la entrada no es válida.
 */
const formatCurrency = (value, currency = 'EUR') => {
  const numberValue = Number(value);
  if (isNaN(numberValue) || value === null || value === undefined) {
      return 'N/A';
  }
  try {
      return new Intl.NumberFormat('es-ES', {
          style: 'currency',
          currency: currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
      }).format(numberValue);
  } catch (e) {
      console.error("Error formatting currency:", value, currency, e);
      return `${numberValue.toFixed(2)} ${currency}`;
  }
};

/**
* Formatea una cadena de fecha (YYYY-MM-DD o ISO) a formato DD/MM/YYYY.
* @param {string | null | undefined} dateString La cadena de fecha.
* @returns {string} La fecha formateada o '--/--/----' si no es válida.
*/
const formatDate = (dateString) => {
  if (!dateString) return '--/--/----';
  try {
      const date = new Date(dateString);
      const offset = date.getTimezoneOffset();
      const adjustedDate = new Date(date.getTime() + (offset * 60 * 1000));
      if (isNaN(adjustedDate.getTime())) return '--/--/----';
      const day = String(adjustedDate.getDate()).padStart(2, '0');
      const month = String(adjustedDate.getMonth() + 1).padStart(2, '0');
      const year = adjustedDate.getFullYear();
      return `${day}/${month}/${year}`;
  } catch (e) {
      console.error("Error formateando fecha:", dateString, e);
      return '--/--/----';
  }
};
const getIconForInvestmentType = (type) => {
    switch (type?.toLowerCase()) {
        case 'acciones': return 'fas fa-chart-line';
        case 'fondo': return 'fas fa-seedling';
        case 'crypto': return 'fab fa-bitcoin'; // Requiere FA Brands
        case 'inmueble': return 'fas fa-home';
        case 'otro': return 'fas fa-question-circle';
        default: return 'fas fa-dollar-sign';
    }
};
// --- Fin Funciones de Utilidad ---

function Investments() {
    // --- Estado del Componente ---
    const [userId, setUserId] = useState(null);
    const [avatarUrl, setAvatarUrl] = useState(defaultAvatar);
    const [investments, setInvestments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    // Modal
    const [isInvestmentModalOpen, setIsInvestmentModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [selectedInvestment, setSelectedInvestment] = useState(null);
    const [formData, setFormData] = useState({ type: '', name: '', symbol: '', quantity: '', purchase_price: '', purchase_date: '', current_value: '', broker: '', notes: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [modalError, setModalError] = useState('');
    // Resumen Footer
    const [showSummaryFooter, setShowSummaryFooter] = useState(false);
    // UI
    const [showScrollTop, setShowScrollTop] = useState(false);

    const navigate = useNavigate();

    // --- Efectos ---
    useEffect(() => {
        // Carga inicial: usuario, avatar, inversiones
        const loadInitialData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // 1. Obtener usuario (Simulado)
                const simulatedUserId = 'USER_ID_PLACEHOLDER'; // Reemplazar
                setUserId(simulatedUserId);

                // 2. Cargar perfil e inversiones en paralelo
                const [profileRes, investmentsRes] = await Promise.all([
                    supabase.from('profiles').select('avatar_url').eq('id', simulatedUserId).single(),
                    supabase.from('investments').select('*').eq('user_id', simulatedUserId).order('name')
                ]);

                // Procesar perfil
                if (profileRes.error && profileRes.status !== 406) throw profileRes.error;
                setAvatarUrl(profileRes.data?.avatar_url || defaultAvatar);

                // Procesar inversiones
                if (investmentsRes.error) throw investmentsRes.error;
                const fetchedInvestments = investmentsRes.data || [];
                setInvestments(fetchedInvestments);
                setShowSummaryFooter(fetchedInvestments.length > 0);

            } catch (err) {
                console.error("Error cargando datos iniciales (Investments):", err);
                setError(err.message || "Error al cargar datos.");
            } finally {
                setIsLoading(false);
            }
        };
        loadInitialData();

        // Scroll-top listener
        const handleScroll = () => setShowScrollTop(window.scrollY > 300);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [navigate, supabase]); // Dependencias

    // --- Cálculo Resumen Footer (useMemo) ---
    const summary = useMemo(() => {
        let totalCurrent = 0;
        let totalPurchase = 0;
        investments.forEach(inv => {
            const currentVal = Number(inv.current_value) || 0;
            const quantity = Number(inv.quantity) || 0;
            const purchasePrice = Number(inv.purchase_price) || 0;
            totalCurrent += currentVal;
            // Solo sumar al valor de compra si hay cantidad y precio
            if (quantity > 0 && purchasePrice > 0) {
                totalPurchase += quantity * purchasePrice;
            } else if (quantity === 0 && purchasePrice === 0) {
                // Si cantidad y precio son 0, podemos asumir que el valor de compra es el valor actual?
                // O quizás el valor de compra inicial fue 0? Depende de tu lógica.
                // Por simplicidad, si no hay datos de compra, no lo sumamos al total de compra.
            } else {
                 // Si solo falta uno de los dos (cantidad o precio), el valor de compra es ambiguo.
                 // Podríamos intentar estimar, pero es mejor no incluirlo en el total de compra.
                 console.warn(`Datos de compra incompletos para ${inv.name}, no se incluye en P/L total.`);
            }
        });
        const totalPL = totalCurrent - totalPurchase;
        return {
            totalCurrentValue: formatCurrency(totalCurrent),
            totalProfitLoss: (totalPL >= 0 ? '+' : '') + formatCurrency(totalPL),
            profitLossIsPositive: totalPL >= 0,
        };
    }, [investments]); // Recalcular si cambian las inversiones

    // --- Manejadores Modales ---
    const handleOpenInvestmentModal = useCallback((mode = 'add', investment = null) => {
        setModalMode(mode);
        setSelectedInvestment(investment);
        setModalError('');
        setIsSaving(false);
        if (mode === 'edit' && investment) {
            setFormData({
                type: investment.type || '',
                name: investment.name || '',
                symbol: investment.symbol || '',
                quantity: investment.quantity ?? '', // Usar ?? para mantener '' si es null/undefined
                purchase_price: investment.purchase_price ?? '',
                purchase_date: investment.purchase_date ? investment.purchase_date.split('T')[0] : '',
                current_value: investment.current_value ?? '',
                broker: investment.broker || '',
                notes: investment.notes || ''
            });
        } else {
            setFormData({ type: '', name: '', symbol: '', quantity: '', purchase_price: '', purchase_date: '', current_value: '', broker: '', notes: '' });
        }
        setIsInvestmentModalOpen(true);
    }, []);

    const handleCloseInvestmentModal = useCallback(() => setIsInvestmentModalOpen(false), []);

    const handleFormChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (modalError) setModalError('');
    }, [modalError]);

    // Submit Modal Inversión
    const handleInvestmentFormSubmit = useCallback(async (event) => {
        event.preventDefault();
        if (!userId) return;

        // Validaciones
        const currentValue = parseFloat(formData.current_value);
        const quantity = formData.quantity ? parseFloat(formData.quantity) : null;
        const purchasePrice = formData.purchase_price ? parseFloat(formData.purchase_price) : null;

        if (!formData.type || !formData.name.trim()) { setModalError('Tipo y Nombre del Activo son obligatorios.'); return; }
        if (formData.current_value === '' || isNaN(currentValue) || currentValue < 0) { setModalError('El Valor Actual Total es obligatorio y no puede ser negativo.'); return; }
        if (formData.quantity && (isNaN(quantity) || quantity < 0)) { setModalError('La Cantidad debe ser un número positivo o estar vacía.'); return; }
        if (formData.purchase_price && (isNaN(purchasePrice) || purchasePrice < 0)) { setModalError('El Precio de Compra debe ser un número positivo o estar vacío.'); return; }
        // Opcional: Validar formato fecha
        if (formData.purchase_date && isNaN(new Date(formData.purchase_date).getTime())) { setModalError('Formato de Fecha de Compra inválido.'); return; }

        setModalError('');
        setIsSaving(true);

        try {
            const dataToSave = {
                user_id: userId,
                type: formData.type,
                name: formData.name.trim(),
                symbol: formData.symbol.trim() || null,
                quantity: quantity, // Guardar número o null
                purchase_price: purchasePrice, // Guardar número o null
                purchase_date: formData.purchase_date || null,
                current_value: currentValue, // Guardar número
                broker: formData.broker.trim() || null,
                notes: formData.notes.trim() || null,
            };

            let error;
            if (modalMode === 'edit' && selectedInvestment) {
                dataToSave.updated_at = new Date();
                delete dataToSave.user_id; // No necesario en update con RLS
                const { error: updateError } = await supabase.from('investments')
                    .update(dataToSave).eq('id', selectedInvestment.id).eq('user_id', userId);
                error = updateError;
            } else {
                const { error: insertError } = await supabase.from('investments').insert([dataToSave]);
                error = insertError;
            }

            if (error) throw error;

            handleCloseInvestmentModal();
            // Recargar inversiones
            const { data: refreshedData, error: refreshError } = await supabase.from('investments').select('*').eq('user_id', userId).order('name');
            if (refreshError) throw refreshError;
            setInvestments(refreshedData || []);
            setShowSummaryFooter((refreshedData || []).length > 0);

        } catch (err) {
            console.error('Error guardando inversión:', err);
            setModalError(`Error: ${err.message}`);
        } finally {
            setIsSaving(false);
        }
    }, [userId, modalMode, selectedInvestment, formData, supabase, handleCloseInvestmentModal]); // Dependencias

    // Manejador Eliminación
    const handleDeleteInvestment = useCallback(async (investmentId, investmentName) => {
        if (!userId) return;
        if (!window.confirm(`¿Seguro eliminar inversión "${investmentName}"?`)) return;
        try {
            const { error } = await supabase.from('investments').delete().eq('id', investmentId).eq('user_id', userId);
            if (error) throw error;
            alert('Inversión eliminada.');
            setInvestments(prev => prev.filter(inv => inv.id !== investmentId));
            // El resumen se recalculará
        } catch (error) { console.error('Error eliminando inversión:', error); alert(`Error: ${error.message}`); }
    }, [userId, supabase]);

    // Otros manejadores
    const handleBack = useCallback(() => navigate('/dashboard'), [navigate]); // Volver siempre a dashboard?
    const scrollToTop = useCallback(() => window.scrollTo({ top: 0, behavior: 'smooth' }), []);

    // --- Renderizado ---
    // ... (JSX completo similar al anterior, SIN sidebar) ...
    return (
      <div style={{ display: 'flex' }}>
                  {/* Sidebar */}
                   <aside className="sidebar">
                        <div className="sidebar-logo"> <img src={finAiLogo} alt="FinAi Logo Small" /> </div>
                        <nav className="sidebar-nav">
                            <Link to="/dashboard" className="nav-button" title="Dashboard"><i className="fas fa-home"></i> <span>Dashboard</span></Link>
                            <Link to="/accounts" className="nav-button" title="Cuentas"><i className="fas fa-wallet"></i> <span>Cuentas</span></Link>
                            <Link to="/budgets" className="nav-button" title="Presupuestos"><i className="fas fa-chart-pie"></i> <span>Presupuestos</span></Link>
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
                            <Link to="/goals" className="nav-button active" title="Metas"><i className="fas fa-bullseye"></i> <span>Metas</span></Link> {/* Active */}
                        </nav>
                        <button className="nav-button logout-button" onClick={handleLogout} title="Cerrar Sesión"><i className="fas fa-sign-out-alt"></i> <span>Salir</span></button>
                   </aside>
          <div className="page-container"> {/* Asume clase raíz */}

            {/* Cabecera */}
            <div className="page-header investments-header">
                <button onClick={handleBack} id="backButton" className="btn-icon" aria-label="Volver"><i className="fas fa-arrow-left"></i></button>
                <div className="header-title-group"> <img id="userAvatarHeader" src={avatarUrl} alt="Avatar" className="header-avatar-small" /> <h1>Mis Inversiones</h1> </div>
                <button onClick={() => handleOpenInvestmentModal('add')} id="addInvestmentBtn" className="btn btn-primary btn-add green-btn"> <i className="fas fa-plus"></i> Añadir Inversión </button>
            </div>

            {/* Lista Inversiones */}
            <div id="investmentListContainer" className="investment-list-grid">
                {isLoading && ( <p id="loadingInvestmentsMessage" style={{ textAlign: 'center', padding: '20px', color: '#666', gridColumn: '1 / -1' }}>Cargando...</p> )}
                {error && !isLoading && ( <p style={{ textAlign: 'center', padding: '20px', color: 'red', gridColumn: '1 / -1' }}>{error}</p> )}
                {!isLoading && !error && investments.length === 0 && (
                    <div id="noInvestmentsMessage" className="empty-list-message" style={{ gridColumn: '1 / -1' }}>
                        <img src={emptyMascot} alt="Mascota FinAi Estrella" className="empty-mascot" />
                        <p>Aún no has registrado ninguna inversión.</p>
                        <p>¡Añade tus activos para empezar a seguir su evolución!</p>
                        <button onClick={() => handleOpenInvestmentModal('add')} id="addInvestmentFromEmptyBtn" className="btn btn-primary green-btn"> <i className="fas fa-plus"></i> Añadir Mi Primera Inversión </button>
                    </div>
                )}
                {!isLoading && !error && investments.length > 0 && (
                    investments.map(inv => {
                        const iconClass = getIconForInvestmentType(inv.type);
                        const quantity = Number(inv.quantity) || 0;
                        const purchasePrice = Number(inv.purchase_price) || 0;
                        const currentValue = Number(inv.current_value) || 0;
                        const purchaseTotalValue = quantity * purchasePrice;
                        const profitLoss = currentValue - purchaseTotalValue;
                        const profitLossClass = profitLoss > 0 ? 'profit' : (profitLoss < 0 ? 'loss' : 'neutral');
                        const profitLossSign = profitLoss > 0 ? '+' : '';

                        return (
                            <div key={inv.id} className="investment-card" data-id={inv.id} data-type={inv.type}>
                                <div className="investment-card-header">
                                    <div className="investment-icon-container"><i className={iconClass}></i></div>
                                    <div className="investment-header-info">
                                        <h3 className="investment-name">{inv.name}</h3>
                                        {inv.symbol && <span className="investment-symbol">{inv.symbol}</span>}
                                        <span className="investment-type-badge">{inv.type}</span>
                                    </div>
                                </div>
                                <div className="investment-card-body">
                                    <div className="info-item"> <span className="info-label">Cantidad</span> <span className="info-value">{quantity.toLocaleString('es-ES')}</span> </div>
                                    <div className="info-item"> <span className="info-label">P. Compra U.</span> <span className="info-value">{formatCurrency(purchasePrice)}</span> </div>
                                    <div className="info-item"> <span className="info-label">V. Compra</span> <span className="info-value">{formatCurrency(purchaseTotalValue)}</span> </div>
                                    <div className="info-item"> <span className="info-label">V. Actual</span> <span className="info-value important">{formatCurrency(currentValue)}</span> </div>
                                    <div className="info-item"> <span className="info-label">Gan./Pérd.</span> <span className={`info-value ${profitLossClass}`}>{profitLossSign}{formatCurrency(profitLoss)}</span> </div>
                                    <div className="info-item"> <span className="info-label">F. Compra</span> <span className="info-value">{formatDate(inv.purchase_date)}</span> </div>
                                </div>
                                <div className="investment-card-footer">
                                    <span className="investment-broker">{inv.broker || ''}</span>
                                    <div className="investment-actions">
                                        <button onClick={() => handleOpenInvestmentModal('edit', inv)} className="btn-icon btn-edit" title="Editar"><i className="fas fa-pencil-alt"></i></button>
                                        <button onClick={() => handleDeleteInvestment(inv.id, inv.name)} className="btn-icon btn-delete" title="Eliminar"><i className="fas fa-trash-alt"></i></button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
              </div>
         

              {/* Footer Resumen */}
              {showSummaryFooter && !isLoading && !error && (
                  <div id="investmentSummaryFooter" className="summary-footer">
                      <div className="summary-box green"> <span className="summary-label">Valor Total Actual</span> <strong id="totalCurrentValue">{summary.totalCurrentValue}</strong> </div>
                      <div className="summary-box blue"> <span className="summary-label">Ganancia/Pérdida Total</span> <strong id="totalProfitLoss" className={summary.profitLossIsPositive ? 'positive' : 'negative'}>{summary.totalProfitLoss}</strong> </div>
                  </div>
              )}
            </div>

            {/* Modal */}
             {isInvestmentModalOpen && (
                <div id="investmentModal" className="modal-overlay active" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget) handleCloseInvestmentModal(); }}>
                    <div className="modal-content">
                        <h2 id="modalTitleInvestment">{modalMode === 'add' ? 'Añadir Nueva Inversión' : 'Editar Inversión'}</h2>
                        <form id="investmentForm" onSubmit={handleInvestmentFormSubmit}>
                            <input type="hidden" name="investmentId" value={selectedInvestment?.id || ''} />
                            <div className="input-group"> <label htmlFor="investmentType">Tipo</label> <select id="investmentType" name="type" required value={formData.type} onChange={handleFormChange} disabled={isSaving}><option value="" disabled>Selecciona...</option><option value="acciones">Acciones</option><option value="fondo">Fondo</option><option value="crypto">Criptomoneda</option><option value="inmueble">Inmueble</option><option value="otro">Otro</option></select> </div>
                            <div className="input-group"> <label htmlFor="investmentName">Nombre Activo</label> <input type="text" id="investmentName" name="name" required value={formData.name} onChange={handleFormChange} disabled={isSaving}/> </div>
                            <div className="input-group"> <label htmlFor="investmentSymbol">Símbolo/Ticker</label> <input type="text" id="investmentSymbol" name="symbol" value={formData.symbol} onChange={handleFormChange} disabled={isSaving}/> </div>
                            <div className="input-group"> <label htmlFor="investmentQuantity">Cantidad/Unidades</label> <input type="number" id="investmentQuantity" name="quantity" step="any" min="0" value={formData.quantity} onChange={handleFormChange} disabled={isSaving}/> </div>
                            <div className="input-group"> <label htmlFor="investmentPurchasePrice">Precio Compra Unit. (€)</label> <input type="number" id="investmentPurchasePrice" name="purchase_price" step="any" min="0" value={formData.purchase_price} onChange={handleFormChange} disabled={isSaving}/> </div>
                            <div className="input-group"> <label htmlFor="investmentPurchaseDate">Fecha Compra</label> <input type="date" id="investmentPurchaseDate" name="purchase_date" value={formData.purchase_date} onChange={handleFormChange} disabled={isSaving}/> </div>
                            <div className="input-group"> <label htmlFor="investmentCurrentValue">Valor Actual TOTAL (€) (Manual)</label> <input type="number" id="investmentCurrentValue" name="current_value" required step="any" min="0" value={formData.current_value} onChange={handleFormChange} disabled={isSaving}/> <small>Valor total actual.</small> </div>
                            <div className="input-group"> <label htmlFor="investmentBroker">Broker/Plataforma</label> <input type="text" id="investmentBroker" name="broker" value={formData.broker} onChange={handleFormChange} disabled={isSaving}/> </div>
                            <div className="input-group"> <label htmlFor="investmentNotes">Notas</label> <textarea id="investmentNotes" name="notes" rows={2} value={formData.notes} onChange={handleFormChange} disabled={isSaving}></textarea> </div>
                            {modalError && <p className="error-message">{modalError}</p>}
                            <div className="modal-actions"> <button type="button" onClick={handleCloseInvestmentModal} className="btn btn-secondary" disabled={isSaving}>Cancelar</button> <button type="submit" id="saveInvestmentButton" className="btn btn-primary green-btn" disabled={isSaving}>{isSaving ? 'Guardando...' : 'Guardar Inversión'}</button> </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Scroll-Top */}
            {showScrollTop && ( <button onClick={scrollToTop} id="scrollTopBtn" className="scroll-top-btn green-btn visible" title="Volver arriba"> <i className="fas fa-arrow-up"></i> </button> )}

        </div> // Fin page-container
    );
}
export default Investments;

