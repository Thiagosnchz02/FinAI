import React from 'react';

/**
 * Modal genérico para seleccionar una opción de una lista.
 * @param {boolean} isOpen - Controla si el modal está visible.
 * @param {function} onClose - Función para cerrar el modal (sin seleccionar nada).
 * @param {function} onSave - Función que se llama con la opción seleccionada ({id, name}).
 * @param {object} config - Configuración del modal:
 * @param {string} config.title - Título del modal.
 * @param {Array<{id: string | number, name: string}>} config.options - Array de objetos opción.
 * @param {string | number} config.currentValue - El ID de la opción actualmente seleccionada.
 * @param {boolean} [config.isLoading=false] - Muestra un indicador de carga si es true.
 */
function SelectionModal({ isOpen, onClose, onSave, config }) {
  const { title, options = [], currentValue, isLoading = false } = config;

  if (!isOpen) {
    return null;
  }

  const handleOptionClick = (option) => {
    onSave(option); // Llama al callback del padre con la opción completa
  };

  return (
    <div
      className="modal-overlay small active" // Usa 'small' o tu clase base para tamaño
      style={{ display: 'flex', zIndex: 1050 }} // Asegura que esté visible
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} // Cierra al hacer clic fuera
    >
      <div className="modal-content">
        <h2 id="selectionModalTitle">{title || 'Seleccionar Opción'}</h2>

        <div id="selectionOptionsContainer" className="selection-options list-options">
          {isLoading && <p>Cargando opciones...</p>}
          {!isLoading && options.length === 0 && <p>No hay opciones disponibles.</p>}
          {!isLoading && options.map(option => (
            <button
              type="button"
              key={option.id}
              onClick={() => handleOptionClick(option)}
              // Resalta la opción activa
              className={`btn btn-option ${option.id === currentValue ? 'active' : ''}`}
            >
              {option.name}
            </button>
          ))}
        </div>

        {/* Error display area (optional, if config included an error message) */}
        {/* {config.error && <p className="error-message">{config.error}</p>} */}

        <div className="modal-actions">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancelar
          </button>
          {/* No necesitamos botón "Guardar" si la selección es directa al hacer clic */}
        </div>
      </div>
    </div>
  );
}

export default SelectionModal;