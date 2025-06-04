import React, { useState, useEffect } from 'react';

function FixedExpenseModal({
  isOpen,
  onClose,
  onSubmit,
  mode,
  initialData,
  accounts = [],
  categories = [], // Categorías de GASTO
  isSaving,
  error
}) {

  const [formData, setFormData] = useState({
    description: '', amount: '', categoryId: '', accountId: '',
    frequency: 'mensual', nextDueDate: new Date().toISOString().split('T')[0],
    notificationEnabled: true, isActive: true
  });
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    setLocalError(error); // Mostrar error del padre
    if (isOpen) {
      if (mode === 'edit' && initialData) {
        setFormData({
          description: initialData.description || '',
          amount: initialData.amount || '',
          categoryId: initialData.category_id || '',
          accountId: initialData.account_id || '',
          frequency: initialData.frequency || 'mensual',
          nextDueDate: initialData.next_due_date ? initialData.next_due_date.split('T')[0] : new Date().toISOString().split('T')[0],
          notificationEnabled: initialData.notification_enabled !== false, // Default true si es null/undefined
          isActive: initialData.is_active !== false, // Default true si es null/undefined
        });
      } else { // add
        setFormData({
          description: '', amount: '', categoryId: '', accountId: '',
          frequency: 'mensual', nextDueDate: new Date().toISOString().split('T')[0],
          notificationEnabled: true, isActive: true
        });
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
    // Validación interna
    const amount = parseFloat(formData.amount);
    if (!formData.description.trim() || isNaN(amount) || amount <= 0 || !formData.categoryId || !formData.frequency || !formData.nextDueDate) {
       setLocalError('Descripción, Importe (>0), Categoría, Frecuencia y Próxima Fecha son obligatorios.'); return;
    }
    // Aquí podrías añadir más validaciones si quieres

    setLocalError('');
    onSubmit(formData); // Llama al onSubmit del padre con los datos internos
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay active" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget && !isSaving) onClose(); }}>
      <div className="modal-content">
        <h2>{mode === 'add' ? 'Añadir Gasto Fijo' : 'Editar Gasto Fijo'}</h2>
        <form onSubmit={handleSubmit}>
          <input type="hidden" name="expenseId" value={initialData?.id || ''} readOnly />
          <div className="input-group"> <label htmlFor="expenseDescriptionM">Descripción</label> <input type="text" id="expenseDescriptionM" name="description" required value={formData.description} onChange={handleChange} disabled={isSaving}/> </div>
          <div className="input-group"> <label htmlFor="expenseAmountM">Importe (€)</label> <input type="number" id="expenseAmountM" name="amount" required step="0.01" min="0.01" value={formData.amount} onChange={handleChange} disabled={isSaving}/> </div>
          <div className="input-group"> 
            <label htmlFor="expenseCategoryM">Categoría</label> 
            <select id="expenseCategoryM" name="categoryId" required value={formData.categoryId} onChange={handleChange} disabled={isSaving || categories.length === 0}>
              <option value="" disabled>Selecciona una categoría...</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select> </div>
          <div className="input-group"> <label htmlFor="expenseAccountM">Cuenta de Cargo</label> <select id="expenseAccountM" name="accountId" required value={formData.accountId} onChange={handleChange} disabled={isSaving}><option value="">Selecciona una Cuenta...</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select><small>Cuenta de la que saldrá el importe.</small> </div>
          <div className="input-group"> <label htmlFor="expenseFrequencyM">Frecuencia</label> <select id="expenseFrequencyM" name="frequency" required value={formData.frequency} onChange={handleChange} disabled={isSaving}><option value="" disabled>Selecciona...</option><option value="mensual">Mensual</option><option value="anual">Anual</option><option value="trimestral">Trimestral</option><option value="semestral">Semestral</option><option value="bimestral">Bimestral</option><option value="semanal">Semanal</option><option value="quincenal">Quincenal</option><option value="unico">Una sola vez</option></select> </div>
          <div className="input-group"> <label htmlFor="expenseNextDueDateM">Próxima Fecha Vencimiento</label> <input type="date" id="expenseNextDueDateM" name="nextDueDate" required value={formData.nextDueDate} onChange={handleChange} disabled={isSaving}/> </div>
          <div className="input-group checkbox-group"> <input type="checkbox" id="expenseNotificationM" name="notificationEnabled" checked={formData.notificationEnabled} onChange={handleChange} disabled={isSaving}/> <label htmlFor="expenseNotificationM">Activar Recordatorio</label> </div>
          <div className="input-group checkbox-group"> <input type="checkbox" id="expenseActiveM" name="isActive" checked={formData.isActive} onChange={handleChange} disabled={isSaving}/> <label htmlFor="expenseActiveM">Gasto Activo</label> </div>

          {(localError || error) && <p className="error-message">{localError || error}</p>}

          <div className="modal-actions"> <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSaving}>Cancelar</button> <button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? 'Guardando...' : 'Guardar Gasto Fijo'}</button> </div>
        </form>
      </div>
    </div>
  );
}

export default FixedExpenseModal;