import React from 'react';
// Opcional: Importa un archivo CSS específico si lo creas: import './Spinner.css';

/**
 * Un componente simple de spinner de carga basado en CSS.
 * Requiere que los estilos CSS para .loading-spinner estén definidos globalmente
 * o importados (ej. en Spinner.css o global.scss).
 */
function Spinner({ size = '40px', color = 'var(--primary-color, #4a90e2)' }) {
  // Usa estilos inline para permitir personalización fácil de tamaño y color vía props
  const spinnerStyle = {
    width: size,
    height: size,
    borderTopColor: color, // Color del borde que gira
    // Otros bordes son más claros para el efecto
    borderRightColor: 'rgba(0, 0, 0, 0.1)',
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    borderLeftColor: 'rgba(0, 0, 0, 0.1)',
  };

  return (
    <div className="spinner-container" aria-label="Cargando"> {/* Contenedor opcional para centrar */}
      <div className="loading-spinner" style={spinnerStyle}></div>
    </div>
  );
}

export default Spinner;