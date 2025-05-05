import React, { useState, useEffect } from 'react';

function DebtModal({ isOpen, onClose, onSubmit, mode, initialData, isSaving, error }) {
  const [formData, setFormData] = useState({ creditor: '', description: '', initial_amount: '', current_balance: '', interest_rate: '', due_date: '', status: 'pendiente', notes: '' });
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    setLocalError(error); // Sincronizar error del padre
    if (isOpen) {
      if (mode === 'edit' && initialData) {
        setFormData({
          creditor: initialData.creditor || '', description: initialData.description || '',
          initial_amount: initialData.initial_amount || '', current_balance: initialData.current_balance || '',
          interest_rate: initialData.interest_rate || '',
          due_date: initialData.due_date ? initialData.due_date.split('T')[0] : '',
          status: initialData.status || 'pendiente', notes: initialData.notes || ''
        });
      } else { // add
        setFormData({ creditor: '', description: '', initial_amount: '', current_balance: '', interest_rate: '', due_date: '', status: 'pendiente', notes: '' });
      }
    } else {
        setLocalError('');
    }
  }, [isOpen, mode, initialData, error]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (localError) setLocalError('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    // Validación básica interna
    const initialAmount = parseFloat(formData.initial_amount);
    const currentBalance = parseFloat(formData.current_balance);
    if (!formData.creditor.trim() || isNaN(initialAmount) || initialAmount <= 0 || isNaN(currentBalance) || currentBalance < 0) {
         setLocalError('Acreedor, Importe Inicial (>0) y Saldo Pendiente (>=0) son obligatorios.'); return;
    }
    if (currentBalance > initialAmount) {
         setLocalError('Saldo Pendiente no puede ser mayor que Importe Inicial.'); return;
    }
    // Más validaciones si quieres (ej. tasa interés)
    setLocalError('');
    onSubmit(formData); // Llama al onSubmit del padre
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay active" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget && !isSaving) onClose(); }}>
      <div className="modal-content">
        <h2>{mode === 'add' ? 'Añadir Nueva Deuda' : 'Editar Deuda'}</h2>
        <form onSubmit={handleSubmit}>
          {/* ID no visible pero útil */}
          <input type="hidden" name="debtId" value={initialData?.id || ''} readOnly />
          <div className="input-group"> <label htmlFor="debtCreditorM">Acreedor</label> <input type="text" id="debtCreditorM" name="creditor" required value={formData.creditor} onChange={handleInputChange} disabled={isSaving}/> </div>
          <div className="input-group"> <label htmlFor="debtDescriptionM">Descripción</label> <input type="text" id="debtDescriptionM" name="description" value={formData.description} onChange={handleInputChange} disabled={isSaving}/> </div>
          <div className="input-group"> <label htmlFor="debtInitialAmountM">Importe Inicial (€)</label> <input type="number" id="debtInitialAmountM" name="initial_amount" required step="0.01" min="0.01" value={formData.initial_amount} onChange={handleInputChange} disabled={isSaving}/> </div>
          <div className="input-group"> <label htmlFor="debtCurrentBalanceM">Saldo Pendiente (€)</label> <input type="number" id="debtCurrentBalanceM" name="current_balance" required step="0.01" min="0" value={formData.current_balance} onChange={handleInputChange} disabled={isSaving}/> <small>Se actualizará con pagos.</small> </div>
          <div className="input-group"> <label htmlFor="debtInterestRateM">Tasa Interés Anual (%)</label> <input type="number" id="debtInterestRateM" name="interest_rate" step="0.01" min="0" value={formData.interest_rate} onChange={handleInputChange} disabled={isSaving}/> </div>
          <div className="input-group"> <label htmlFor="debtDueDateM">Fecha Vencimiento</label> <input type="date" id="debtDueDateM" name="due_date" value={formData.due_date} onChange={handleInputChange} disabled={isSaving}/> </div>
          <div className="input-group"> <label htmlFor="debtStatusM">Estado</label> <select id="debtStatusM" name="status" required value={formData.status} onChange={handleInputChange} disabled={isSaving}><option value="pendiente">Pendiente</option><option value="parcial">Parcialmente Pagada</option><option value="pagada">Pagada</option></select> </div>
          <div className="input-group"> <label htmlFor="debtNotesM">Notas</label> <textarea id="debtNotesM" name="notes" rows={2} value={formData.notes} onChange={handleInputChange} disabled={isSaving}></textarea> </div>

          {(localError || error) && <p className="error-message">{localError || error}</p>}

          <div className="modal-actions"> <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSaving}>Cancelar</button> <button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? 'Guardando...' : 'Guardar Deuda'}</button> </div>
        </form>
      </div>
    </div>
  );
}

export default DebtModal;