import React, { useState, useEffect } from 'react';

function GoalModal({ isOpen, onClose, onSubmit, mode, initialData, accounts = [], isSaving, error }) {
  const [formData, setFormData] = useState({
    name: '', target_amount: '', current_amount: '0.00', target_date: '',
    icon: '', related_account_id: '', notes: ''
  });
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    setLocalError(error);
    if (isOpen) {
      if (mode === 'edit' && initialData) {
        setFormData({
          name: initialData.name || '',
          target_amount: initialData.target_amount || '',
          // current_amount NO es editable en modo 'edit' aquí
          current_amount: initialData.current_amount || '0.00',
          target_date: initialData.target_date ? initialData.target_date.split('T')[0] : '',
          icon: initialData.icon || '',
          related_account_id: initialData.related_account_id || '',
          notes: initialData.notes || ''
        });
      } else { // add
        setFormData({ name: '', target_amount: '', current_amount: '0.00', target_date: '', icon: '', related_account_id: '', notes: '' });
      }
    } else {
        setLocalError('');
    }
  }, [isOpen, mode, initialData, error]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (localError) setLocalError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const targetAmount = parseFloat(formData.target_amount);
    const currentAmountInitial = parseFloat(formData.current_amount); // Solo para 'add'

    if (!formData.name.trim() || isNaN(targetAmount) || targetAmount <= 0) {
      setLocalError('Nombre y Objetivo (>0) son obligatorios.'); return;
    }
    if (mode === 'add' && (isNaN(currentAmountInitial) || currentAmountInitial < 0)) {
      setLocalError('El Ahorrado Inicial debe ser un número válido (0 o más).'); return;
    }
    setLocalError('');
    onSubmit(formData); // Envía los datos al padre
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay active" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget && !isSaving) onClose(); }}>
      <div className="modal-content">
        <h2>{mode === 'add' ? 'Añadir Nueva Meta' : 'Editar Meta'}</h2>
        <form onSubmit={handleSubmit}>
          <input type="hidden" name="goalId" value={initialData?.id || ''} readOnly />
          <div className="input-group"> <label htmlFor="goalNameM">Nombre</label> <input type="text" id="goalNameM" name="name" required value={formData.name} onChange={handleChange} disabled={isSaving}/> </div>
          <div className="input-group"> <label htmlFor="goalTargetAmountM">Importe Objetivo (€)</label> <input type="number" id="goalTargetAmountM" name="target_amount" required step="0.01" min="0.01" value={formData.target_amount} onChange={handleChange} disabled={isSaving}/> </div>

          {/* Ahorrado Inicial solo en modo 'add' */}
          {mode === 'add' && (
              <div className="input-group"> <label htmlFor="goalCurrentAmountM">Ahorrado Inicialmente (€)</label> <input type="number" id="goalCurrentAmountM" name="current_amount" step="0.01" min="0" value={formData.current_amount} onChange={handleChange} disabled={isSaving}/> <small>Si ya tienes algo.</small> </div>
          )}
          {/* Mostrar Ahorrado Actual en modo 'edit' pero no editable */}
           {mode === 'edit' && initialData && (
                <div className="input-group">
                    <label>Ahorrado Actualmente (€)</label>
                    <input type="text" value={formatCurrency(initialData.current_amount)} readOnly disabled style={{backgroundColor: '#eee'}} />
                     <small>Se actualiza añadiendo ahorro.</small>
                </div>
            )}

          <div className="input-group"> <label htmlFor="goalTargetDateM">Fecha Objetivo</label> <input type="date" id="goalTargetDateM" name="target_date" value={formData.target_date} onChange={handleChange} disabled={isSaving}/> </div>
          <div className="input-group"> <label htmlFor="goalIconM">Icono (Font Awesome)</label> <input type="text" id="goalIconM" name="icon" placeholder="Ej: fas fa-plane-departure" value={formData.icon} onChange={handleChange} disabled={isSaving}/> <small>Busca en <a href="https://fontawesome.com/search?m=free&s=solid" target="_blank" rel="noopener noreferrer">Font Awesome</a>.</small> </div>
          <div className="input-group"> <label htmlFor="goalAccountM">Cuenta Asociada</label> <select id="goalAccountM" name="related_account_id" value={formData.related_account_id} onChange={handleChange} disabled={isSaving}><option value="">(Ninguna)</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select> <small>Dónde guardas el dinero.</small> </div>
          <div className="input-group"> <label htmlFor="goalNotesM">Notas</label> <textarea id="goalNotesM" name="notes" rows={2} value={formData.notes} onChange={handleChange} disabled={isSaving}></textarea> </div>

          {(localError || error) && <p className="error-message">{localError || error}</p>}

          <div className="modal-actions"> <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSaving}>Cancelar</button> <button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? 'Guardando...' : 'Guardar Meta'}</button> </div>
        </form>
      </div>
    </div>
  );
}

export default GoalModal;