import React from 'react';
import { formatCurrency } from '../../utils/formatters.js'; // Ajusta ruta

function SummaryPanel({ userName, summaryData, onAddTransaction, onAddTripExpense }) {
  const { variableRemaining = 'N/A', variablePercentage = 0, progressBarColor = '#eee', loading, error } = summaryData || {};

  return (
    <div className="panel summary-panel">
      <h3>¡Hola{userName ? `, ${userName}` : ''}!</h3>
      {loading ? <p className="panel-loading small">Cargando resumen...</p> : error ? <p className="panel-loading error-text small">Error</p> : <>
        <p className="summary-amount">{variableRemaining}</p>
        <div className="progress-bar-container" style={{ marginTop: '5px', marginBottom: '15px' }}>
          <div className="progress-bar" style={{ width: `${variablePercentage}%`, backgroundColor: progressBarColor, height: '10px', borderRadius: '5px' }} title={`${variablePercentage.toFixed(1)}% Gasto Variable Usado`}></div>
          <small style={{ display: 'block', textAlign: 'center', marginTop: '4px' }}>Gasto Variable Restante (Plan)</small>
        </div>
      </>}
      <div className="panel quick-actions-panel">
        {/* <h3>Acciones Rápidas</h3> */}
        <div className="quick-actions-buttons">
            {/* Llamar a handlers del padre pasados por props */}
          <button onClick={() => onAddTransaction('gasto')} className="btn btn-action red-btn"><i className="fas fa-minus"></i> Gasto</button>
          <button onClick={() => onAddTransaction('ingreso')} className="btn btn-action green-btn"><i className="fas fa-plus"></i> Ingreso</button>
          {/* Opcional: Botón rápido para Gasto Viaje si se usa mucho */}
          {/* <button onClick={onAddTripExpense} className="btn btn-action blue-btn"><i className="fas fa-plane"></i> G. Viaje</button> */}
        </div>
      </div>
    </div>
  );
}

export default SummaryPanel;