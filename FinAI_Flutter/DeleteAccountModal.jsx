import React, { useState, useEffect } from 'react';

function DeleteAccountModal({ isOpen, onClose, onConfirm, userEmail, isProcessing }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Limpiar al abrir/cerrar
    setPassword('');
    setError('');
  }, [isOpen]);

  // Llama al onConfirm del padre, pasando la contraseña
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!password) {
        setError('Introduce tu contraseña actual para confirmar.');
        return;
    }
    try {
        await onConfirm(password); // Llama al handler del padre que invoca la Edge Function
        // Si onConfirm tiene éxito, el usuario será deslogueado y redirigido.
        // Si falla, lanzará un error que se captura abajo.
    } catch (err) {
        // Captura el error re-lanzado por el padre para mostrarlo aquí
        console.error("Error caught in delete modal handler:", err);
        setError(err.message || 'Error al procesar la solicitud.');
    }
    // No ponemos setIsProcessing(false) aquí porque el padre lo controla
    // y si tiene éxito, el componente se desmontará.
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay small active" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget && !isProcessing) onClose(); }}>
      <div className="modal-content danger-modal"> {/* Añadir clase para estilo peligro */}
        <h2><i className="fas fa-exclamation-triangle"></i> Eliminar Cuenta</h2>
        <p className="modal-instructions danger-text">
          ¡Atención! Esta acción es irreversible. Se borrarán **todos** tus datos asociados a <strong>{userEmail || 'tu cuenta'}</strong>.
        </p>
        <p className="modal-instructions">Para confirmar, introduce tu contraseña actual.</p>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="deleteConfirmPassword">Contraseña Actual</label>
            <input
                type="password" id="deleteConfirmPassword" name="deleteConfirmPassword"
                required autoComplete="current-password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                disabled={isProcessing}
                autoFocus // Enfocar este campo al abrir
            />
          </div>
          {error && <p className="error-message">{error}</p>}
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isProcessing}>Cancelar</button>
            <button type="submit" className="btn btn-danger" disabled={isProcessing || !password}>
                {isProcessing ? 'Eliminando...' : 'Eliminar Mi Cuenta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DeleteAccountModal;