import React, { useState, useEffect, useMemo } from 'react';

// Asegúrate que estos IDs sean correctos o pásalos como props/context
const TRANSFER_CATEGORY_ID_OUT = '2d55034c-0587-4d9c-9d93-5284d6880c76';
const TRANSFER_CATEGORY_ID_IN = '7547fdfa-f7b2-44f4-af01-f937bfcc5be3';

function TransactionModal({
  isOpen,
  onClose,
  onSubmit,
  mode,
  initialData,
  accounts = [],
  categories = [],
  isSaving,
  error,
  setError // Función para limpiar el error en el padre al cambiar input
}) {
  // Estado interno del formulario
  const [formData, setFormData] = useState({});
  // Estado local para el tipo, facilita la lógica condicional
  const [transactionType, setTransactionType] = useState('gasto');
  const [localError, setLocalError] = useState('');

  // Inicializar/Resetear formulario
  useEffect(() => {
    setLocalError(error); // Mostrar error del padre
    const today = new Date().toISOString().split('T')[0];
    let defaultData = {
        type: 'gasto', amount: '', transaction_date: today, description: '',
        account_id: '', account_destination_id: '', category_id: '', notes: ''
    };

    if (isOpen) {
        if (mode === 'edit' && initialData && initialData.type !== 'transferencia') {
            defaultData = {
                type: initialData.type || 'gasto',
                amount: Math.abs(initialData.amount || 0).toString(),
                transaction_date: initialData.transaction_date ? initialData.transaction_date.split('T')[0] : today,
                description: initialData.description || '',
                account_id: initialData.account_id || '',
                account_destination_id: '', // No editable
                category_id: initialData.category_id || '',
                notes: initialData.notes || ''
            };
        } else { // Add mode or if trying to edit a transfer (reset)
             defaultData.type = 'gasto'; // Default a gasto al añadir
        }
        setFormData(defaultData);
        setTransactionType(defaultData.type);
    } else {
        setLocalError(''); // Limpiar al cerrar
    }
  }, [isOpen, mode, initialData, error]); // Depender de error también

  // Manejador de cambios genérico
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'transactionType') { // Si cambia el tipo (radio button)
      setTransactionType(value);
      // Limpiar campos que no aplican al nuevo tipo
      if (value === 'transferencia') {
        setFormData(prev => ({ ...prev, category_id: '' }));
      } else {
        setFormData(prev => ({ ...prev, account_destination_id: '' }));
      }
    } else { // Otros inputs
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    if (localError) setLocalError(''); // Limpiar error local
    if (error && setError) setError(''); // Limpiar error del padre
  };

  // Manejador de submit interno
  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError(''); // Limpiar error local antes de validar

    // Validaciones internas
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) { setLocalError('Importe debe ser positivo.'); return; }
    if (!formData.transaction_date) { setLocalError('Fecha es obligatoria.'); return; }
    if (!formData.description?.trim()) { setLocalError('Descripción es obligatoria.'); return; }
    if (!formData.account_id) { setLocalError(transactionType === 'transferencia' ? 'Cuenta Origen es obligatoria.' : 'Cuenta es obligatoria.'); return; }

    if (transactionType === 'transferencia') {
      if (!formData.account_destination_id) { setLocalError('Cuenta Destino es obligatoria.'); return; }
      if (formData.account_id === formData.account_destination_id) { setLocalError('Cuentas origen y destino deben ser diferentes.'); return; }
       // No necesitamos categoría para transferencia (se usan las fijas)
    }
     // Categoría es opcional para gasto/ingreso, no validar aquí a menos que sea requisito

    // Llamar a la función onSubmit del padre con los datos validados
    onSubmit({ ...formData, type: transactionType, amount: amount });
  };

  // Filtrar categorías según el tipo seleccionado (gasto o ingreso)
  const filteredCategories = useMemo(() => {
    if (transactionType === 'transferencia' || !categories) return [];
    return categories.filter(cat => cat.type === transactionType);
  }, [transactionType, categories]);

  if (!isOpen) return null;

  const isTransfer = transactionType === 'transferencia';

  return (
    <div className="modal-overlay active" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget && !isSaving) onClose(); }}>
      <div className="modal-content">
        <h2>{mode === 'add' ? 'Añadir Movimiento' : 'Editar Transacción'}</h2>
        <form onSubmit={handleSubmit}>
          {mode === 'edit' && <input type="hidden" name="id" value={initialData?.id || ''} />}

          {/* Selector de Tipo */}
          <div className="input-group">
            <label>Tipo</label>
            <div className="radio-group type-toggle">
              <label className={`type-button expense-btn ${transactionType === 'gasto' ? 'active' : ''} ${mode === 'edit' ? 'disabled' : ''}`}>
                <input type="radio" name="transactionType" value="gasto" checked={transactionType === 'gasto'} onChange={handleChange} disabled={isSaving || mode === 'edit'}/> Gasto
              </label>
              <label className={`type-button income-btn ${transactionType === 'ingreso' ? 'active' : ''} ${mode === 'edit' ? 'disabled' : ''}`}>
                <input type="radio" name="transactionType" value="ingreso" checked={transactionType === 'ingreso'} onChange={handleChange} disabled={isSaving || mode === 'edit'}/> Ingreso
              </label>
              <label className={`type-button transfer-btn ${transactionType === 'transferencia' ? 'active' : ''} ${mode === 'edit' ? 'disabled' : ''}`}>
                <input type="radio" name="transactionType" value="transferencia" checked={transactionType === 'transferencia'} onChange={handleChange} disabled={isSaving || mode === 'edit'}/> Transferencia
              </label>
            </div>
             {mode === 'edit' && <small style={{display:'block', marginTop:'-5px', color:'#888'}}>El tipo no se puede cambiar al editar.</small>}
          </div>

          {/* Campos Comunes */}
          <div className="input-group"> <label htmlFor="modalAmount">Importe</label> <input type="number" id="modalAmount" name="amount" required step="0.01" min="0.01" value={formData.amount} onChange={handleChange} disabled={isSaving}/> </div>
          <div className="input-group"> <label htmlFor="modalDate">Fecha</label> <input type="date" id="modalDate" name="transaction_date" required value={formData.transaction_date} onChange={handleChange} disabled={isSaving}/> </div>
          <div className="input-group"> <label htmlFor="modalDescription">Descripción</label> <input type="text" id="modalDescription" name="description" required value={formData.description} onChange={handleChange} disabled={isSaving}/> </div>

          {/* Cuenta Origen / Cuenta Principal */}
          <div className="input-group">
            <label htmlFor="modalAccountId">{isTransfer ? 'Cuenta Origen' : 'Cuenta'}</label>
            <select id="modalAccountId" name="account_id" required value={formData.account_id} onChange={handleChange} disabled={isSaving || accounts.length === 0}>
                <option value="" disabled>{accounts.length === 0 ? 'No hay cuentas' : 'Selecciona...'}</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          {/* Cuenta Destino (Solo Transferencias) */}
          {isTransfer && (
            <div className="input-group">
              <label htmlFor="modalAccountDestinationId">Cuenta Destino</label>
              <select id="modalAccountDestinationId" name="account_destination_id" required={isTransfer} value={formData.account_destination_id} onChange={handleChange} disabled={isSaving || accounts.length === 0}>
                  <option value="" disabled>{accounts.length === 0 ? 'No hay cuentas' : 'Selecciona...'}</option>
                  {/* Excluir la cuenta origen de las opciones de destino */}
                  {accounts.filter(a => a.id !== formData.account_id).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          )}

          {/* Categoría (No para Transferencias) */}
          {!isTransfer && (
            <div className="input-group">
              <label htmlFor="modalCategoryId">Categoría</label>
              <select id="modalCategoryId" name="category_id" value={formData.category_id} onChange={handleChange} disabled={isSaving || filteredCategories.length === 0}>
                  <option value="">(Sin categoría)</option>
                  {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  {transactionType !== '' && filteredCategories.length === 0 && <option disabled>No hay categorías de {transactionType}</option>}
              </select>
            </div>
          )}

          {/* Notas */}
          <div className="input-group"> <label htmlFor="modalNotes">Notas</label> <textarea id="modalNotes" name="notes" rows={2} value={formData.notes} onChange={handleChange} disabled={isSaving}></textarea> </div>

          {/* Error y Acciones */}
          {(localError || error) && <p className="error-message">{localError || error}</p>}
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSaving}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
                {isSaving ? 'Guardando...' : (mode === 'add' ? 'Guardar' : 'Guardar Cambios')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TransactionModal;