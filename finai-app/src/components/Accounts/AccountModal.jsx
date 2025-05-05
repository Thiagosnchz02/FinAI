import React, { useState, useEffect } from 'react';

// El componente recibe el estado y los manejadores como props
function AccountModal({ isOpen, onClose, onSubmit, mode = 'add', initialData = null, isSaving = false, error = '' }) {
  const [formData, setFormData] = useState({
    accountName: '',
    accountBank: '',
    accountType: '',
    accountBalance: '0.00', // Solo relevante para 'add'
    accountCurrency: 'EUR',
  });
  const [localError, setLocalError] = useState('');

  // Efecto para sincronizar el formulario con initialData cuando se abre o cambia
  useEffect(() => {
    setLocalError(error); // Sincronizar error del padre
    if (isOpen) {
      if (mode === 'edit' && initialData) {
        setFormData({
          accountName: initialData.name || '',
          accountBank: initialData.bank_name || '',
          accountType: initialData.type || '',
          accountBalance: '0.00', // No editable en edit
          accountCurrency: initialData.currency || 'EUR',
        });
      } else { // Modo 'add' o sin initialData
        setFormData({
          accountName: '', accountBank: '', accountType: '',
          accountBalance: '0.00', accountCurrency: 'EUR',
        });
      }
    } else {
        setLocalError(''); // Limpiar error local al cerrar
    }
  }, [isOpen, mode, initialData, error]); // Depender también de 'error'

  // Manejador local de cambios
  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
    if (localError) setLocalError(''); // Limpiar error al escribir
  };

  // Manejador local de submit que llama al onSubmit del padre
  const handleSubmit = (event) => {
    event.preventDefault();
    // Validaciones (pueden hacerse aquí o en el padre antes de llamar onSubmit)
    if (!formData.accountName || !formData.accountType || !formData.accountCurrency || formData.accountCurrency.length !== 3) {
      setLocalError('Nombre, Tipo y Moneda (3 letras, ej: EUR) son obligatorios.'); return;
    }
    if (mode === 'add' && (isNaN(parseFloat(formData.accountBalance)) || formData.accountBalance === '')) {
       if (formData.accountBalance !== '0' && formData.accountBalance !== '0.00') {
          setLocalError('El saldo inicial debe ser un número válido (puede ser 0).'); return;
       }
    }
    setLocalError('');
    // Llama a la función onSubmit pasada desde Accounts.jsx
    onSubmit(formData);
  };

  // No renderizar nada si el modal no está abierto
  if (!isOpen) {
    return null;
  }

  // Renderizado del JSX del modal (similar al que tenías en Accounts.jsx)
  return (
    <div className="modal-overlay active" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget && !isSaving) onClose(); }}>
      <div className="modal-content">
        <h2>{mode === 'add' ? 'Añadir Nueva Cuenta' : 'Editar Cuenta'}</h2>
        <form onSubmit={handleSubmit}>
          <input type="hidden" name="accountId" value={initialData?.id || ''} readOnly/>

          <div className="input-group">
            <label htmlFor="modalAccountName">Nombre</label> {/* Cambiar IDs si es necesario */}
            <input type="text" id="modalAccountName" name="accountName" required value={formData.accountName} onChange={handleInputChange} disabled={isSaving} />
          </div>
          <div className="input-group">
            <label htmlFor="modalAccountBank">Banco</label>
            <input type="text" id="modalAccountBank" name="accountBank" value={formData.accountBank} onChange={handleInputChange} disabled={isSaving} />
          </div>
          <div className="input-group">
            <label htmlFor="modalAccountType">Tipo</label>
            <select id="modalAccountType" name="accountType" required value={formData.accountType} onChange={handleInputChange} disabled={isSaving}>
              <option value="" disabled>Selecciona...</option>
              <option value="nomina">Nómina</option>
              <option value="corriente">Corriente</option>
              <option value="ahorro">Ahorro</option>
              <option value="ahorro_colchon">Ahorro Colchón</option>
              <option value="viajes">Viajes</option>
              <option value="inversion">Inversión</option>
              <option value="tarjeta_credito">Tarjeta de Crédito</option>
              <option value="efectivo">Efectivo</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          {mode === 'add' && (
            <div className="input-group">
              <label htmlFor="modalAccountBalance">Saldo Inicial</label>
              <input type="number" id="modalAccountBalance" name="accountBalance" required step="0.01" value={formData.accountBalance} onChange={handleInputChange} disabled={isSaving} />
              <small>Saldo actual al crear.</small>
            </div>
          )}

          <div className="input-group">
            <label htmlFor="modalAccountCurrency">Moneda (ISO)</label>
            <input type="text" id="modalAccountCurrency" name="accountCurrency" required maxLength={3} placeholder="EUR" value={formData.accountCurrency} onChange={handleInputChange} disabled={isSaving} />
          </div>

          {localError && ( <p className="error-message">{localError}</p> )}

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSaving}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? (mode === 'add' ? 'Creando...' : 'Guardando...') : 'Guardar Cuenta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AccountModal;