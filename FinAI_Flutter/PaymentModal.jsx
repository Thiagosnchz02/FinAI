import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/formatters';

function PaymentModal({
  isOpen,
  onClose,
  onSubmit, // Recibe { amount, date, accountId, categoryId, notes }
  selectedDebt, // La deuda a la que se aplica el pago
  accounts = [], // Lista de cuentas del usuario
  expenseCategories = [], // Lista de categorías de GASTO
  isSaving = false,
  error = ''
}) {

  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    accountId: '',
    categoryId: '', // Añadido para selección
    notes: ''
  });
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    setLocalError(error);
    if (isOpen) {
      // Resetear form al abrir
      setPaymentFormData({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        accountId: '',
        categoryId: '', // Resetear categoría
        notes: ''
      });
    } else {
        setLocalError('');
    }
  }, [isOpen, error]); // Depender de isOpen y error

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentFormData(prev => ({ ...prev, [name]: value }));
    if (localError) setLocalError('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    // Validaciones internas
    const paymentAmount = parseFloat(paymentFormData.amount);
    if (!paymentFormData.accountId) { setLocalError('Selecciona la cuenta de origen.'); return; }
    if (!paymentFormData.date) { setLocalError('Selecciona la fecha del pago.'); return; }
    if (!paymentFormData.categoryId) { setLocalError('Selecciona la categoría del pago.'); return; } // Validar categoría
    if (isNaN(paymentAmount) || paymentAmount <= 0) { setLocalError('El importe debe ser positivo.'); return; }

    // Opcional: Añadir confirmación aquí si paga más de lo debido
    const currentBalance = Number(selectedDebt?.current_balance) || 0;
    if (paymentAmount > currentBalance) {
         if (!window.confirm(`Estás pagando ${formatCurrency(paymentAmount)}, más de lo pendiente (${formatCurrency(currentBalance)}). ¿Continuar?`)){
             return; // Cancela si el usuario no confirma
         }
    }

    setLocalError('');
    onSubmit(paymentFormData); // Enviar datos al padre
  };

  if (!isOpen || !selectedDebt) return null; // No mostrar si no hay deuda seleccionada

  return (
    <div className="modal-overlay small active" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget && !isSaving) onClose(); }}>
      <div className="modal-content">
        <h2>Registrar Pago</h2>
        <form onSubmit={handleSubmit}>
          <input type="hidden" name="paymentDebtId" value={selectedDebt.id} readOnly />
          <p>Deuda con: <strong>{selectedDebt.creditor || 'N/A'}</strong></p>
          <p>Saldo pendiente: <strong>{formatCurrency(selectedDebt.current_balance)}</strong></p>

          <div className="input-group"> <label htmlFor="paymentAmountM">Importe Pagado (€)</label> <input type="number" id="paymentAmountM" name="amount" required step="0.01" min="0.01" value={paymentFormData.amount} onChange={handleInputChange} disabled={isSaving}/> </div>
          <div className="input-group"> <label htmlFor="paymentDateM">Fecha del Pago</label> <input type="date" id="paymentDateM" name="date" required value={paymentFormData.date} onChange={handleInputChange} disabled={isSaving}/> </div>
          <div className="input-group"> <label htmlFor="paymentAccountM">Cuenta de Origen</label> <select id="paymentAccountM" name="accountId" required value={paymentFormData.accountId} onChange={handleInputChange} disabled={isSaving || accounts.length === 0}><option value="" disabled>Selecciona...</option>{accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select> </div>
          {/* --- Selector de Categoría --- */}
          <div className="input-group">
              <label htmlFor="paymentCategoryM">Categoría del Pago</label>
              <select id="paymentCategoryM" name="categoryId" required value={paymentFormData.categoryId} onChange={handleInputChange} disabled={isSaving || expenseCategories.length === 0}>
                  <option value="" disabled>Selecciona...</option>
                  {/* Mapear categorías de GASTO pasadas como prop */}
                  {expenseCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  {expenseCategories.length === 0 && <option disabled>No hay categorías de gasto</option>}
              </select>
              <small>(Elige la categoría de gasto para esta transacción)</small>
          </div>
          {/* --------------------------- */}
          <div className="input-group"> <label htmlFor="paymentNotesM">Notas del Pago</label> <textarea id="paymentNotesM" name="notes" rows={2} value={paymentFormData.notes} onChange={handleInputChange} disabled={isSaving}></textarea> </div>

          {(localError || error) && <p className="error-message">{localError || error}</p>}

          <div className="modal-actions"> <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSaving}>Cancelar</button> <button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? 'Registrando...' : 'Registrar Pago'}</button> </div>
        </form>
      </div>
    </div>
  );
}

export default PaymentModal;