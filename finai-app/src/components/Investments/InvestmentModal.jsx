import React, { useState, useEffect } from 'react';

function InvestmentModal({ isOpen, onClose, onSubmit, mode, initialData, isSaving, error }) {
  // Estado interno del formulario
  const [formData, setFormData] = useState({
    type: '', name: '', symbol: '', quantity: '', purchase_price: '',
    purchase_date: '', current_value: '', broker: '', notes: ''
  });
  const [localError, setLocalError] = useState('');

  // Sincronizar estado con props
  useEffect(() => {
    setLocalError(error); // Mostrar error del padre
    if (isOpen) {
      if (mode === 'edit' && initialData) {
        setFormData({
          type: initialData.type || '',
          name: initialData.name || '',
          symbol: initialData.symbol || '',
          quantity: initialData.quantity ?? '',
          purchase_price: initialData.purchase_price ?? '',
          purchase_date: initialData.purchase_date ? initialData.purchase_date.split('T')[0] : '',
          current_value: initialData.current_value ?? '',
          broker: initialData.broker || '',
          notes: initialData.notes || ''
        });
      } else { // add
        setFormData({ type: '', name: '', symbol: '', quantity: '', purchase_price: '', purchase_date: '', current_value: '', broker: '', notes: '' });
      }
    } else {
      setLocalError(''); // Limpiar al cerrar
    }
  }, [isOpen, mode, initialData, error]);

  // Manejador de cambios interno
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (localError) setLocalError('');
  };

  // Manejador de submit interno
  const handleSubmit = (e) => {
    e.preventDefault();
    // Validaciones básicas internas
    const currentValue = parseFloat(formData.current_value);
    const quantity = formData.quantity ? parseFloat(formData.quantity) : null;
    const purchasePrice = formData.purchase_price ? parseFloat(formData.purchase_price) : null;

    if (!formData.type || !formData.name.trim()) {
      setLocalError('Tipo y Nombre del Activo son obligatorios.'); return;
    }
    if (formData.current_value === '' || isNaN(currentValue) || currentValue < 0) {
      setLocalError('El Valor Actual Total es obligatorio y no puede ser negativo.'); return;
    }
    if (formData.quantity && (isNaN(quantity) || quantity < 0)) {
      setLocalError('La Cantidad debe ser un número positivo o estar vacía.'); return;
    }
    if (formData.purchase_price && (isNaN(purchasePrice) || purchasePrice < 0)) {
      setLocalError('El Precio de Compra debe ser un número positivo o estar vacío.'); return;
    }
    if (formData.purchase_date && isNaN(new Date(formData.purchase_date).getTime())) {
       setLocalError('Formato de Fecha de Compra inválido.'); return;
    }

    setLocalError('');
    // Pasa los datos validados al padre
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay active" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget && !isSaving) onClose(); }}>
      <div className="modal-content">
        <h2>{mode === 'add' ? 'Añadir Nueva Inversión' : 'Editar Inversión'}</h2>
        <form onSubmit={handleSubmit}>
          <input type="hidden" name="investmentId" value={initialData?.id || ''} readOnly/>
          <div className="input-group"> <label htmlFor="investmentTypeM">Tipo</label> <select id="investmentTypeM" name="type" required value={formData.type} onChange={handleChange} disabled={isSaving}><option value="" disabled>Selecciona...</option><option value="acciones">Acciones</option><option value="fondo">Fondo</option><option value="crypto">Criptomoneda</option><option value="inmueble">Inmueble</option><option value="otro">Otro</option></select> </div>
          <div className="input-group"> <label htmlFor="investmentNameM">Nombre Activo</label> <input type="text" id="investmentNameM" name="name" required value={formData.name} onChange={handleChange} disabled={isSaving}/> </div>
          <div className="input-group"> <label htmlFor="investmentSymbolM">Símbolo/Ticker</label> <input type="text" id="investmentSymbolM" name="symbol" value={formData.symbol} onChange={handleChange} disabled={isSaving}/> </div>
          <div className="input-group"> <label htmlFor="investmentQuantityM">Cantidad/Unidades</label> <input type="number" id="investmentQuantityM" name="quantity" step="any" min="0" value={formData.quantity} onChange={handleChange} disabled={isSaving}/> </div>
          <div className="input-group"> <label htmlFor="investmentPurchasePriceM">Precio Compra Unit. (€)</label> <input type="number" id="investmentPurchasePriceM" name="purchase_price" step="any" min="0" value={formData.purchase_price} onChange={handleChange} disabled={isSaving}/> </div>
          <div className="input-group"> <label htmlFor="investmentPurchaseDateM">Fecha Compra</label> <input type="date" id="investmentPurchaseDateM" name="purchase_date" value={formData.purchase_date} onChange={handleChange} disabled={isSaving}/> </div>
          <div className="input-group"> <label htmlFor="investmentCurrentValueM">Valor Actual TOTAL (€) (Manual)</label> <input type="number" id="investmentCurrentValueM" name="current_value" required step="any" min="0" value={formData.current_value} onChange={handleChange} disabled={isSaving}/> <small>Valor total actual del activo.</small> </div>
          <div className="input-group"> <label htmlFor="investmentBrokerM">Broker/Plataforma</label> <input type="text" id="investmentBrokerM" name="broker" value={formData.broker} onChange={handleChange} disabled={isSaving}/> </div>
          <div className="input-group"> <label htmlFor="investmentNotesM">Notas</label> <textarea id="investmentNotesM" name="notes" rows={2} value={formData.notes} onChange={handleChange} disabled={isSaving}></textarea> </div>

          {(localError || error) && <p className="error-message">{localError || error}</p>}

          <div className="modal-actions"> <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSaving}>Cancelar</button> <button type="submit" className="btn btn-primary green-btn" disabled={isSaving}>{isSaving ? 'Guardando...' : 'Guardar Inversión'}</button> </div>
        </form>
      </div>
    </div>
  );
}

export default InvestmentModal;