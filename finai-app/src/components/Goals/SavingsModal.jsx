import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../../utils/formatters.js'; // Ajusta ruta

function SavingsModal({ isOpen, onClose, onSubmit, selectedGoal, isSaving, error }) {
  const [amount, setAmount] = useState('');
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    setLocalError(error);
    if (isOpen) {
      setAmount(''); // Resetear importe al abrir
    } else {
        setLocalError('');
    }
  }, [isOpen, error]);

  const handleChange = (e) => {
    setAmount(e.target.value);
    if (localError) setLocalError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const amountToAdd = parseFloat(amount);
    if (isNaN(amountToAdd) || amountToAdd <= 0) {
      setLocalError('Introduce un importe positivo válido.'); return;
    }
    setLocalError('');
    onSubmit({ amount: amountToAdd }); // Enviar solo el importe al padre
  };

  if (!isOpen || !selectedGoal) return null;

  return (
    <div className="modal-overlay small active" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget && !isSaving) onClose(); }}>
      <div className="modal-content">
        <h2>Añadir Ahorro</h2>
        <form onSubmit={handleSubmit}>
          <input type="hidden" name="savingsGoalId" value={selectedGoal.id} readOnly />
          <p>¿Cuánto has ahorrado para "<strong id="savingsGoalName">{selectedGoal.name || 'N/A'}</strong>"?</p>
          <p>Actualmente: <strong>{formatCurrency(selectedGoal.current_amount)}</strong></p>
          <div className="input-group">
            <label htmlFor="savingsAmountM">Importe a Añadir (€)</label>
            <input type="number" id="savingsAmountM" name="amount" required step="0.01" min="0.01" value={amount} onChange={handleChange} disabled={isSaving} autoFocus />
          </div>
          {(localError || error) && <p className="error-message">{localError || error}</p>}
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSaving}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? 'Añadiendo...' : 'Añadir'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SavingsModal;