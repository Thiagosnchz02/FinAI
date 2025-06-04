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
        // ... (tu handleSubmit sin cambios en su lógica interna,
        // pero asegúrate que 'category_id' se envíe correctamente) ...
        e.preventDefault();
        setLocalError(''); 
        const amount = parseFloat(formData.amount);
        if (isNaN(amount) || amount <= 0) { setLocalError('Importe debe ser positivo.'); return; }
        if (!formData.transaction_date) { setLocalError('Fecha es obligatoria.'); return; }
        if (!formData.description?.trim()) { setLocalError('Descripción es obligatoria.'); return; }
        if (!formData.account_id) { setLocalError(transactionType === 'transferencia' ? 'Cuenta Origen es obligatoria.' : 'Cuenta es obligatoria.'); return; }
        if (transactionType === 'transferencia') {
            if (!formData.account_destination_id) { setLocalError('Cuenta Destino es obligatoria.'); return; }
            if (formData.account_id === formData.account_destination_id) { setLocalError('Cuentas origen y destino deben ser diferentes.'); return; }
        } else { // Gasto o Ingreso
            if (!formData.category_id) { // Hacer categoría obligatoria para gasto/ingreso
                setLocalError('Selecciona una categoría.'); return;
            }
        }
        onSubmit({ ...formData, type: transactionType, amount: amount });
    };

  // Filtrar categorías según el tipo seleccionado (gasto o ingreso)
  const formattedAndFilteredCategories = useMemo(() => {
        if (transactionType === 'transferencia' || !categories || categories.length === 0) {
            return [];
        }
        
        // 1. Filtrar por el tipo de transacción actual (ingreso o gasto)
        const relevantTypeCategories = categories.filter(cat => cat.type === transactionType && !cat.is_archived); // Excluir archivadas

        // 2. Construir la jerarquía
        const allCategoryIdsInType = new Set(relevantTypeCategories.map(cat => cat.id));

        const topLevelCategories = relevantTypeCategories.filter(
            cat => !cat.parent_category_id || !allCategoryIdsInType.has(cat.parent_category_id) // Es padre si no tiene padre O su padre no es del mismo tipo/lista
        ).sort((a, b) => a.name.localeCompare(b.name));
        
        const subCategories = relevantTypeCategories.filter(
            cat => cat.parent_category_id && allCategoryIdsInType.has(cat.parent_category_id)
        ).sort((a, b) => a.name.localeCompare(b.name));

        const options = [];
        topLevelCategories.forEach(parent => {
            options.push({ 
                id: parent.id, 
                name: parent.name, 
                // Podrías añadir un indicador si es default:
                // displayName: `${parent.name}${parent.is_default ? ' (Default)' : ''}`
            });
            const children = subCategories.filter(sub => sub.parent_category_id === parent.id);
            children.forEach(child => {
                options.push({ 
                    id: child.id, 
                    name: `  ↳ ${child.name}` // Indentación con prefijo
                });
            });
        });
        console.log(`TransactionModal: Categorías formateadas para tipo '${transactionType}':`, options);
        return options;
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
                <select 
                  id="modalCategoryId" 
                  name="category_id" // El name debe ser category_id para que handleChange lo actualice
                  required // Hacerlo obligatorio para gasto/ingreso
                  value={formData.category_id} 
                  onChange={handleChange} 
                  disabled={isSaving || formattedAndFilteredCategories.length === 0}
                >
                  <option value="">Selecciona una categoría...</option> {/* Opción para "sin categoría" o placeholder */}
                    {formattedAndFilteredCategories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {/* El 'name' ya viene con "↳ " si es subcategoría */}
                  </option>
                  ))}
                  {transactionType !== '' && formattedAndFilteredCategories.length === 0 && (
                  <option disabled>No hay categorías de {transactionType}</option>
                  )}
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