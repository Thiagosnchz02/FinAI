import React, { useState, useEffect } from 'react';

function BudgetModal({
  isOpen,
  onClose,
  onSubmit, // Función que recibe los datos del formulario al guardar
  mode = 'add',
  initialData = null, // { categoryId: '', amount: '' } o null
  isSaving = false,
  error = '',
  availableCategories = [], // Lista de categorías que se pueden seleccionar
  displayPeriod = '' // Para mostrar en el título
}) {

  const [formData, setFormData] = useState({ categoryId: '', amount: '' });
  const [localError, setLocalError] = useState('');

  // Sincronizar estado interno con props cuando el modal se abre o cambian los datos iniciales/error
  useEffect(() => {
    setLocalError(error); // Mostrar error pasado desde el padre
    if (isOpen) {
      if (mode === 'edit' && initialData) {
        setFormData({
          categoryId: initialData.category_id || '', // Asegúrate que initialData tenga category_id
          amount: initialData.amount || '',
        });
      } else { // Modo 'add' o sin datos
        setFormData({ categoryId: '', amount: '' });
      }
    } else {
      setLocalError(''); // Limpiar error local al cerrar
    }
  }, [isOpen, mode, initialData, error]);

  // Manejador local de cambios
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (localError) setLocalError(''); // Limpiar error al escribir
  };

  // Manejador local de submit
  const handleSubmit = (event) => {
    event.preventDefault();
    // Validaciones básicas (se pueden reforzar en el padre también)
    if (!formData.categoryId) {
      setLocalError('Selecciona una categoría.'); return;
    }
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      setLocalError('El importe debe ser mayor que cero.'); return;
    }
    setLocalError('');
    onSubmit(formData); // Llama a la función onSubmit del padre con los datos actuales
  };

  // No renderizar si no está abierto
  if (!isOpen) return null;

  return (
    <div className="modal-overlay active" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget && !isSaving) onClose(); }}>
      <div className="modal-content">
        {/* Título dinámico */}
        <h2>{mode === 'add' ? `Añadir Presupuesto (${displayPeriod})` : `Editar Presupuesto (${displayPeriod})`}</h2>
        <form onSubmit={handleSubmit}>
          {/* Campo oculto para ID (aunque no se use directamente aquí, puede ser útil) */}
          <input type="hidden" name="budgetId" value={initialData?.id || ''} readOnly />

          <div className="input-group">
            <label htmlFor="modalBudgetCategory">Categoría (Gasto)</label>
            <select
              id="modalBudgetCategory"
              name="categoryId"
              required
              value={formData.categoryId}
              onChange={handleInputChange}
              disabled={mode === 'edit' || isSaving} // Deshabilitar categoría al editar
            >
              {/* Opción por defecto */}
              <option value="" disabled>Selecciona...</option>

              {/* Si editamos, mostramos la categoría actual (aunque no esté en availableCategories) */}
              {mode === 'edit' && initialData?.category_data && (
                 <option value={initialData.category_id}>
                     {initialData.category_data.name} {/* Asume que pasas category_data en initialData */}
                 </option>
              )}

              {/* Mostramos las categorías disponibles */}
              {availableCategories.map(cat => (
                 // Evitar duplicar la opción si estamos editando
                 (mode !== 'edit' || cat.id !== initialData?.category_id) && (
                     <option key={cat.id} value={cat.id}>{cat.name}</option>
                 )
              ))}

              {/* Mensaje si no hay categorías disponibles (solo en modo 'add') */}
              {mode === 'add' && availableCategories.length === 0 && (
                 <option disabled>No hay más categorías disponibles.</option>
              )}
            </select>
            <small>Un presupuesto por categoría/mes.</small>
          </div>

          <div className="input-group">
            <label htmlFor="modalBudgetAmount">Importe Presupuestado (€)</label>
            <input
              type="number" id="modalBudgetAmount" name="amount"
              required step="0.01" placeholder="0.00" min="0.01"
              value={formData.amount} onChange={handleInputChange}
              disabled={isSaving}
            />
          </div>

          {/* Mostrar error local o el pasado por props */}
          {(localError || error) && (
            <p className="error-message">{localError || error}</p>
          )}

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSaving}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? 'Guardando...' : (mode === 'edit' ? 'Actualizar Importe' : 'Guardar Presupuesto')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BudgetModal;