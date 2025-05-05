import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/formatters.js'; // Ajusta ruta

function CollectionModal({
  isOpen,
  onClose,
  onSubmit, // Recibe { amount, date, accountId, categoryId, notes }
  selectedLoan, // El préstamo sobre el que se cobra
  accounts = [], // Lista de cuentas del usuario (destino)
  incomeCategories = [], // Lista de categorías de INGRESO
  isSaving = false,
  error = ''
}) {

  const [collectionFormData, setCollectionFormData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    accountId: '', // Cuenta DESTINO
    categoryId: '', // Categoría de INGRESO
    notes: ''
  });
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    setLocalError(error);
    if (isOpen) {
      setCollectionFormData({ // Resetear form al abrir
        amount: '', date: new Date().toISOString().split('T')[0],
        accountId: '', categoryId: '', notes: ''
      });
    } else {
        setLocalError('');
    }
  }, [isOpen, error]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCollectionFormData(prev => ({ ...prev, [name]: value }));
    if (localError) setLocalError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const collectionAmount = parseFloat(collectionFormData.amount);
    if (!collectionFormData.accountId) { setLocalError('Selecciona la cuenta destino.'); return; }
    if (!collectionFormData.date) { setLocalError('Selecciona la fecha del cobro.'); return; }
    if (!collectionFormData.categoryId) { setLocalError('Selecciona la categoría del ingreso.'); return; } // Validar categoría
    if (isNaN(collectionAmount) || collectionAmount <= 0) { setLocalError('El importe debe ser positivo.'); return; }

    // Confirmación cobro excesivo (sigue usando window.confirm por ahora)
    const currentBalance = Number(selectedLoan?.current_balance) || 0;
    if (collectionAmount > currentBalance) {
         if (!window.confirm(`Registrando cobro de <span class="math-inline">\{formatCurrency\(collectionAmount\)\}, más de lo pendiente \(</span>{formatCurrency(currentBalance)}).\n¿Continuar? (Saldo quedará en 0).`)){
             return; // Cancela
         }
    }

    setLocalError('');
    onSubmit(collectionFormData); // Enviar datos al padre
  };

  if (!isOpen || !selectedLoan) return null;

  return (
    <div className="modal-overlay small active" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget && !isSaving) onClose(); }}>
      <div className="modal-content">
        <h2>Registrar Cobro</h2>
        <form onSubmit={handleSubmit}>
          <input type="hidden" name="collectionLoanId" value={selectedLoan.id} readOnly />
          <p>Cobro del préstamo a: <strong>{selectedLoan.debtor || 'N/A'}</strong></p>
          <p>Pendiente por cobrar: <strong>{formatCurrency(selectedLoan.current_balance)}</strong></p>

          <div className="input-group"> <label htmlFor="collectionAmountM">Importe Cobrado (€)</label> <input type="number" id="collectionAmountM" name="amount" required step="0.01" min="0.01" value={collectionFormData.amount} onChange={handleInputChange} disabled={isSaving} autoFocus/> </div>
          <div className="input-group"> <label htmlFor="collectionDateM">Fecha del Cobro</label> <input type="date" id="collectionDateM" name="date" required value={collectionFormData.date} onChange={handleInputChange} disabled={isSaving}/> </div>
          <div className="input-group"> <label htmlFor="collectionAccountM">Cuenta Destino</label> <select id="collectionAccountM" name="accountId" required value={collectionFormData.accountId} onChange={handleInputChange} disabled={isSaving || accounts.length === 0}><option value="" disabled>Selecciona...</option>{accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select> </div>

          {/* --- Selector de Categoría de INGRESO --- */}
          <div className="input-group">
              <label htmlFor="collectionCategoryM">Categoría del Ingreso</label>
              <select id="collectionCategoryM" name="categoryId" required value={collectionFormData.categoryId} onChange={handleInputChange} disabled={isSaving || incomeCategories.length === 0}>
                  <option value="" disabled>Selecciona...</option>
                  {/* Mapear incomeCategories pasadas como prop */}
                  {incomeCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  {incomeCategories.length === 0 && <option disabled>No hay categorías de ingreso</option>}
              </select>
              <small>(Categoría para registrar esta entrada de dinero)</small>
          </div>
          {/* --------------------------- */}

          <div className="input-group"> <label htmlFor="collectionNotesM">Notas</label> <textarea id="collectionNotesM" name="notes" rows={2} value={collectionFormData.notes} onChange={handleInputChange} disabled={isSaving}></textarea> </div>

          {(localError || error) && <p className="error-message">{localError || error}</p>}

          <div className="modal-actions"> <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSaving}>Cancelar</button> <button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? 'Registrando...' : 'Registrar Cobro'}</button> </div>
        </form>
      </div>
    </div>
  );
}

export default CollectionModal;