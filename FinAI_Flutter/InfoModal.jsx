import React from 'react';

/**
 * Modal genérico para mostrar información al usuario.
 * @param {boolean} isOpen - Controla si el modal está visible.
 * @param {function} onClose - Función para cerrar el modal.
 * @param {object} config - Configuración del modal:
 * @param {string} [config.title='Información'] - Título del modal.
 * @param {string} config.message - Mensaje a mostrar.
 * @param {string} [config.closeButtonText='Aceptar'] - Texto del botón de cierre.
 */
function InfoModal({ isOpen, onClose, config }) {
  const { title = 'Información', message, closeButtonText = 'Aceptar' } = config;

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="modal-overlay small active" // Usa tu clase base
      style={{ display: 'flex', zIndex: 1050 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-content info-modal-content"> {/* Clase específica opcional */}
        <h2 id="infoModalTitle">
          <i className="fas fa-info-circle" style={{ marginRight: '8px', color: 'var(--primary-color)' }}></i>
          {title}
        </h2>
        <p id="infoModalMessage" className="modal-instructions" style={{ textAlign: 'center', margin: '25px 0', lineHeight: '1.6' }}>
          {message || 'No hay mensaje para mostrar.'}
        </p>
        <div className="modal-actions" style={{ justifyContent: 'center' }}>
          <button
            type="button"
            onClick={onClose}
            id="infoModalCloseBtn"
            className="btn btn-primary" // Estilo primario para el único botón
          >
            {closeButtonText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default InfoModal;