import React, { useState, useEffect } from 'react';

function LoanModal({ isOpen, onClose, onSubmit, mode, initialData, isSaving, error }) {
  const [formData, setFormData] = useState({ debtor: '', description: '', initial_amount: '', current_balance: '', interest_rate: '', due_date: '', status: 'pendiente', reminder_enabled: false, notes: '' });
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    setLocalError(error);
    if (isOpen) {
      if (mode === 'edit' && initialData) {
        setFormData({
          debtor: initialData.debtor || '', description: initialData.description || '',
          initial_amount: initialData.initial_amount || '', current_balance: initialData.current_balance || '',
          interest_rate: initialData.interest_rate || '',
          due_date: initialData.due_date ? initialData.due_date.split('T')[0] : '',
          status: initialData.status || 'pendiente',
          reminder_enabled: initialData.reminder_enabled || false,
          notes: initialData.notes || ''
        });
      } else { // add
        setFormData({ debtor: '', description: '', initial_amount: '', current_balance: '', interest_rate: '', due_date: '', status: 'pendiente', reminder_enabled: false, notes: '' });
      }
    } else {
        setLocalError('');
    }
  }, [isOpen, mode, initialData, error]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (localError) setLocalError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Validaciones básicas internas
    const initialAmount = parseFloat(formData.initial_amount);
    const currentBalance = parseFloat(formData.current_balance);
    if (!formData.debtor.trim() || isNaN(initialAmount) || initialAmount <= 0 || isNaN(currentBalance) || currentBalance < 0) {
         setLocalError('Deudor, Importe Inicial (>0) y Saldo Pendiente (>=0) obligatorios.'); return;
    }
    if (mode === 'add' && currentBalance > initialAmount) { // Solo al añadir, saldo no puede ser mayor
         setLocalError('Saldo pendiente no puede ser mayor que inicial al crear.'); return;
    }
    if (formData.interest_rate && (isNaN(parseFloat(formData.interest_rate)) || parseFloat(formData.interest_rate) < 0)) {
         setLocalError('Tasa de interés inválida.'); return;
    }
    // Más validaciones...
    setLocalError('');
    onSubmit(formData); // Llama al onSubmit del padre
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay active" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget && !isSaving) onClose(); }}>
      <div className="modal-content">
        <h2>{mode === 'add' ? 'Añadir Préstamo' : 'Editar Préstamo'}</h2>
        <form onSubmit={handleSubmit}>
          <input type="hidden" name="loanId" value={initialData?.id || ''} readOnly/>
          <div className="input-group"> <label htmlFor="loanDebtorM">Deudor</label> <input type="text" id="loanDebtorM" name="debtor" required value={formData.debtor} onChange={handleChange} disabled={isSaving}/> </div>
          <div className="input-group"> <label htmlFor="loanDescriptionM">Descripción</label> <input type="text" id="loanDescriptionM" name="description" value={formData.description} onChange={handleChange} disabled={isSaving}/> </div>
          <div className="input-group"> <label htmlFor="loanInitialAmountM">Importe Prestado (€)</label> <input type="number" id="loanInitialAmountM" name="initial_amount" required step="0.01" min="0.01" value={formData.initial_amount} onChange={handleChange} disabled={isSaving}/> </div>
          <div className="input-group"> <label htmlFor="loanCurrentBalanceM">Saldo Pendiente (€)</label> <input type="number" id="loanCurrentBalanceM" name="current_balance" required step="0.01" min="0" value={formData.current_balance} onChange={handleChange} disabled={isSaving}/> <small>Lo que te deben actualmente.</small> </div>
          <div className="input-group"> <label htmlFor="loanInterestRateM">Tasa Interés Anual (%)</label> <input type="number" id="loanInterestRateM" placeholder='0.00'  name="interest_rate" step="0.01" min="0" value={formData.interest_rate} onChange={handleChange} disabled={isSaving}/> <small>Introduce el % (ej: 2 para 2%) anual. Deja 0 o vacío si no hay interés.</small> </div>
          <div className="input-group"> <label htmlFor="loanDueDateM">Fecha Vencimiento</label> <input type="date" id="loanDueDateM" name="due_date" value={formData.due_date} onChange={handleChange} disabled={isSaving}/> </div>
          <div className="input-group"> <label htmlFor="loanStatusM">Estado</label> <select id="loanStatusM" name="status" required value={formData.status} onChange={handleChange} disabled={isSaving}><option value="pendiente">Pendiente</option><option value="parcial">Parcialmente Cobrado</option><option value="cobrado">Cobrado</option></select> </div>
          <div className="input-group checkbox-group"> <input type="checkbox" id="loanReminderEnabledM" name="reminder_enabled" checked={formData.reminder_enabled} onChange={handleChange} disabled={isSaving}/> <label htmlFor="loanReminderEnabledM">Activar Recordatorio</label> </div>
          <div className="input-group"> <label htmlFor="loanNotesM">Notas</label> <textarea id="loanNotesM" name="notes" rows={2} value={formData.notes} onChange={handleChange} disabled={isSaving}></textarea> </div>

          {(localError || error) && <p className="error-message">{localError || error}</p>}

          <div className="modal-actions"> <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSaving}>Cancelar</button> <button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? 'Guardando...' : 'Guardar Préstamo'}</button> </div>
        </form>
      </div>
    </div>
  );
}

export default LoanModal;