import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../../utils/formatters.js'; // Importar para tooltips
import { PREDEFINED_ICONS } from '../../utils/iconConstants.js';


function GoalModal({ isOpen, onClose, onSubmit, mode, initialData, accounts = [], isSaving, error }) {
  const defaultFormData = {
        name: '', target_amount: '', current_amount: '0.00', target_date: '',
        icon: '', related_account_id: '', notes: ''
    };
  const [formData, setFormData] = useState(defaultFormData);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
        setLocalError(error || ''); // Mostrar error del padre si existe
        if (isOpen) {
            // --- LÓGICA DE INICIALIZACIÓN MODIFICADA ---
            if (mode === 'edit' && initialData) {
                // Modo EDITAR: Cargar datos de la meta existente
                setFormData({
                    name: initialData.name || '',
                    target_amount: initialData.target_amount || '',
                    current_amount: initialData.current_amount || '0.00', // No editable aquí
                    target_date: initialData.target_date ? initialData.target_date.split('T')[0] : '',
                    icon: initialData.icon || '',
                    related_account_id: initialData.related_account_id || '',
                    notes: initialData.notes || ''
                });
            } else if (mode === 'add' && initialData) {
                // Modo AÑADIR, PERO CON DATOS INICIALES (ej. desde un viaje)
                console.log("GoalModal: Modo 'add' con initialData:", initialData);
                setFormData({
                    name: initialData.name || '', // Usar nombre del viaje
                    target_amount: initialData.target_amount || '', // Usar presupuesto del viaje
                    current_amount: initialData.current_amount || '0.00', // Podría ser 0 o un valor pasado
                    target_date: initialData.target_date ? initialData.target_date.split('T')[0] : '', // Usar fecha inicio del viaje
                    icon: initialData.icon || 'fas fa-flag-checkered', // Icono por defecto para meta de viaje
                    related_account_id: initialData.related_account_id || '', // Cuenta asociada si viene
                    notes: initialData.notes || `Meta para el viaje: ${initialData.name || ''}` // Nota por defecto
                });
            } else { 
                // Modo AÑADIR normal (sin datos iniciales) o si initialData es null
                setFormData(defaultFormData); // Resetear a valores por defecto
            }
            // --- FIN LÓGICA DE INICIALIZACIÓN ---
        } else {
            setLocalError(''); // Limpiar al cerrar
        }
    }, [isOpen, mode, initialData, error]); // Dependencias correctas

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (localError) setLocalError('');
  };

  // --- NUEVO: Manejador para cuando se selecciona un icono de la lista ---
    const handleIconSelect = (iconClassName) => {
        setFormData(prevData => ({
            ...prevData,
            icon: iconClassName, // Actualiza el campo 'icon' en formData
        }));
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
  const isDisabled = isSaving;

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
          <div className="input-group">
            <label htmlFor="goalIconM">Icono</label>
              <div className="icon-selector-container"> {/* Usa la misma clase que en CategoryModal */}
                {PREDEFINED_ICONS.map(iconObj => ( // Renombrado a iconObj para claridad
                  <button
                    type="button"
                    key={iconObj.className}
                    className={`icon-selector-btn ${formData.icon === iconObj.className ? 'selected' : ''}`}
                    title={iconObj.name} // Mostrar el nombre del icono en el hover
                    onClick={() => handleIconSelect(iconObj.className)}
                    disabled={isDisabled}
                  >
                    <i className={iconObj.className}></i>
                  </button>
                ))}
              </div>
                <input 
                type="text" 
                id="goalIconM" 
                name="icon" // El name debe ser 'icon' para que handleChange lo actualice
                placeholder="O pega una clase Font Awesome (ej: fas fa-piggy-bank)" 
                value={formData.icon} 
                onChange={handleChange} 
                disabled={isDisabled}
                style={{marginTop: '10px'}}
              />
              <small>Selecciona un icono de la lista o introduce una clase de <a href="https://fontawesome.com/search?m=free&s=solid" target="_blank" rel="noopener noreferrer">Font Awesome (Solid)</a>.</small>
            </div>
          <div className="input-group">
            <label htmlFor="goalAccountM">Cuenta Asociada</label>
            <select 
              id="goalAccountM" 
              name="related_account_id" 
              value={formData.related_account_id} 
              onChange={handleChange} 
              disabled={isSaving}
            >
            <option value="">(Ninguna - Meta abstracta)</option>
              {accounts.map(a => ( // Asumiendo que 'accounts' es la lista de cuentas activas
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <small className="input-field-description">
              Si vinculas una cuenta, tus ahorros para esta meta se reflejarán en ella y se registrarán como transferencias.
            </small>
          </div>
          <div className="input-group"> <label htmlFor="goalNotesM">Notas</label> <textarea id="goalNotesM" name="notes" rows={2} value={formData.notes} onChange={handleChange} disabled={isSaving}></textarea> </div>

          {(localError || error) && <p className="error-message">{localError || error}</p>}

          <div className="modal-actions"> <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSaving}>Cancelar</button> <button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? 'Guardando...' : 'Guardar Meta'}</button> </div>
        </form>
      </div>
    </div>
  );
}

export default GoalModal;