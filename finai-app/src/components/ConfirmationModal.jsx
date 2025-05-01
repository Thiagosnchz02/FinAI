import React from 'react';

function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirmar Acción", // Título por defecto
  message = "¿Estás seguro?", // Mensaje por defecto
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  isDanger = false // Para cambiar color del botón confirmar (opcional)
}) {

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="modal-overlay small active" // Usa 'small' si tienes esa clase definida
      style={{ display: 'flex', zIndex: 1050 }} // Asegura que esté por encima de otros modales si es necesario
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`modal-content confirmation-modal-content ${isDanger ? 'danger-modal' : ''}`}>
        <h2><i className={`fas ${isDanger ? 'fa-exclamation-triangle' : 'fa-question-circle'}`}></i> {title}</h2>
        <p className="modal-instructions" style={{ textAlign: 'center', margin: '25px 0', lineHeight: '1.6' }}>
          {message}
        </p>
        <div className="modal-actions">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            // Aplicar clase 'btn-danger' si isDanger es true
            className={`btn ${isDanger ? 'btn-danger' : 'btn-primary'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationModal;