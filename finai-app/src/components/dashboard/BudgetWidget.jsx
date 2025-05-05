import React from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatters.js'; // Ajusta ruta
import { getIconClass } from '../../utils/iconUtils.js'; // Ajusta ruta

function BudgetWidget({ data, isLoading, error }) {
  const { items = [] } = data;

  return (
    <div className="panel budget-summary-panel">
      <h3>Presupuestos Este Mes <Link to="/budgets" className="panel-link"><i className="fas fa-arrow-right"></i></Link></h3>
      <div id="budgetSummaryList">
        {isLoading && <p className="panel-loading">Cargando...</p>}
        {error && <p className="panel-loading error-text">Error al cargar</p>}
        {!isLoading && !error && items.length === 0 && <p className="panel-loading no-data">Sin presupuestos</p>}
        {!isLoading && !error && items.map(item => (
          <div key={item.id} className="budget-item">
            <span className="budget-icon"><i className={getIconClass(item.icon)}></i></span>
            <div className="budget-info">
              <span className="budget-name">{item.name}</span>
              <div className="progress-bar-container mini">
                <div className="progress-bar mini" style={{ width: `${item.percentage}%`, backgroundColor: item.color }}></div>
              </div>
            </div>
            <span className="budget-amount">{formatCurrency(item.spent)} / {formatCurrency(item.budget)}</span>
          </div>
        ))}
        {/* Añadir enlace "Ver todos" si items.length es el límite (ej. 5) */}
      </div>
    </div>
  );
}

export default BudgetWidget;