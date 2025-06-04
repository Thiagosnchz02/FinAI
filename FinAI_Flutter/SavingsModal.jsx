import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../../utils/formatters.js'; // Ajusta ruta

function SavingsModal({ isOpen, onClose, onSubmit, selectedGoal, accounts = [], isSaving, error = '' }) {
  const [collectionFormData, setCollectionFormData] = useState({ // Renombré a collectionFormData para consistencia con tu código
        amount: '',
        date: new Date().toISOString().split('T')[0],
        accountId: '', // Esta será la CUENTA DE ORIGEN si la meta está vinculada
        notes: ''
        // categoryId ya no se selecciona aquí, se usará una fija para transferencias
    });
    const [localError, setLocalError] = useState('');

    // Determinar si la meta actual está vinculada a una cuenta
    const isGoalLinkedToAccount = !!selectedGoal?.related_account_id;

    useEffect(() => {
        setLocalError(error);
        if (isOpen && selectedGoal) { // Asegurar que selectedGoal exista
            setCollectionFormData({
                amount: '', 
                date: new Date().toISOString().split('T')[0],
                accountId: '', // Resetear cuenta de origen
                notes: `Aportación a meta: ${selectedGoal.name || ''}` // Nota por defecto
            });
        } else {
            setLocalError('');
        }
    }, [isOpen, error, selectedGoal]); // selectedGoal como dependencia

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setCollectionFormData(prev => ({ ...prev, [name]: value }));
        if (localError) setLocalError('');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const collectionAmount = parseFloat(collectionFormData.amount);

        // Validaciones
        if (isNaN(collectionAmount) || collectionAmount <= 0) { 
            setLocalError('El importe debe ser positivo.'); return; 
        }
        if (!collectionFormData.date) { 
            setLocalError('Selecciona la fecha de la aportación.'); return; 
        }
        // Si la meta está vinculada, la cuenta de origen es obligatoria
        if (isGoalLinkedToAccount && !collectionFormData.accountId) {
            setLocalError('Selecciona la cuenta de origen de los fondos.'); return;
        }
        // Si la meta está vinculada y la cuenta de origen es la misma que la cuenta de la meta
        if (isGoalLinkedToAccount && collectionFormData.accountId === selectedGoal.related_account_id) {
            setLocalError('La cuenta de origen no puede ser la misma que la cuenta asociada a la meta para esta operación.'); return;
        }


        setLocalError('');
        // El objeto que se envía al padre ahora solo contiene los datos del formulario.
        // La lógica de qué hacer con ellos (crear transacción o no) estará en Goals.jsx
        onSubmit({
            amount: collectionAmount,
            date: collectionFormData.date,
            source_account_id: collectionFormData.accountId, // Renombrar para claridad
            notes: collectionFormData.notes
        });
    };

  if (!isOpen || !selectedGoal) return null;

  return (
    <div className="modal-overlay small active" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget && !isSaving) onClose(); }}>
      <div className="modal-content">
        <button onClick={onClose} className="modal-close-btn" aria-label="Cerrar modal" title="Cerrar" disabled={isSaving}>
          <i className="fas fa-times"></i>
        </button>
        <h2>Añadir Ahorro</h2>
        <p style={{textAlign: 'center', marginTop: '-10px', marginBottom: '15px'}}>
          ¿Cuánto has ahorrado para "<strong>{selectedGoal.name || 'esta meta'}</strong>"?<br/>
          <small>Saldo actual de la meta: <strong>{formatCurrency(selectedGoal.current_amount)}</strong></small>
        </p>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="savingsAmountM">Importe a Añadir (€)</label>
              <input type="number" id="savingsAmountM" name="amount" required step="0.01" min="0.01" 
                  value={collectionFormData.amount} onChange={handleInputChange} disabled={isSaving} autoFocus/>
          </div>
          <div className="input-group">
              <label htmlFor="savingsDateM">Fecha de la Aportación</label>
                <input type="date" id="savingsDateM" name="date" required 
                  value={collectionFormData.date} onChange={handleInputChange} disabled={isSaving}/>
          </div>
          {/* --- CAMPO CONDICIONAL: CUENTA DE ORIGEN --- */}
          {isGoalLinkedToAccount && (
            <div className="input-group">
              <label htmlFor="savingsSourceAccountM">Cuenta de Origen de Fondos</label>
                <select 
                  id="savingsSourceAccountM" 
                  name="accountId" // El estado es 'accountId'
                  required={isGoalLinkedToAccount} // Obligatorio si la meta está vinculada
                  value={collectionFormData.accountId} 
                  onChange={handleInputChange} 
                  disabled={isSaving || accounts.length === 0}
                >
                  <option value="" disabled>Selecciona una cuenta...</option>
                  {/* Filtrar para no mostrar la cuenta destino de la meta como opción de origen */}
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
                  <small>El dinero se moverá de esta cuenta a la cuenta asociada de la meta.</small>
            </div>
          )}
          {/* ----------------------------------------- */}
          <div className="input-group">
            <label htmlFor="savingsNotesM">Notas (Opcional)</label>
              <textarea id="savingsNotesM" name="notes" rows={2} 
                value={collectionFormData.notes} onChange={handleInputChange} disabled={isSaving}></textarea>
          </div>
          {(localError || error) && <p className="error-message">{localError || error}</p>}
            <div className="modal-actions">
              <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSaving}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={isSaving}>
                {isSaving ? 'Registrando...' : 'Añadir Ahorro'}
              </button>
            </div>
        </form>
      </div>
    </div>
  );
}

export default SavingsModal;