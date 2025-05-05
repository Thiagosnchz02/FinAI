import React from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatters.js'; // Ajusta ruta
// Icono viene en los datos

function EvaluationWidget({ data, isLoading, error }) {
  const { items = [], noData = false } = data;

  return (
    <div className="panel evaluation-summary-panel">
      <h3>Planificación Mes <Link to="/evaluations" className="panel-link" aria-label="Ver Planificación"><i className="fas fa-arrow-right"></i></Link></h3>
      <div id="evaluationSummaryContent">
        {isLoading && <p className="panel-loading">Cargando...</p>}
        {error && <p className="panel-loading error-text">Error</p>}
        {noData && !isLoading && !error && <p className="panel-loading no-data">Sin planificar</p>}
        {!isLoading && !error && !noData && items.map((item, index) => (
          <div key={index} className="evaluation-item">
            <span className="evaluation-icon"><i className={item.icon}></i></span>
            <span className="evaluation-label">{item.label}</span>
            <span className={`evaluation-amount ${item.amountClass}`}>{item.formattedAmount}</span>
          </div>
        ))}
        {/* Enlace ver/editar */}
      </div>
    </div>
  );
}

export default EvaluationWidget;