import React from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatters.js'; // Ajusta ruta
import { getIconClass } from '../../utils/iconUtils.js'; // Ajusta ruta

function GoalsWidget({ data, isLoading, error }) {
  const { items = [], hasMore = false } = data;

  return (
    <div className="panel goals-progress-panel">
      <h3>Progreso Metas <Link to="/goals" className="panel-link"><i className="fas fa-arrow-right"></i></Link></h3>
      <div id="goalsProgressList">
        {isLoading && <p className="panel-loading">Cargando...</p>}
        {error && <p className="panel-loading error-text">Error al cargar</p>}
        {!isLoading && !error && items.length === 0 && <p className="panel-loading no-data">Sin metas activas</p>}
        {!isLoading && !error && items.map(g => (
          <div key={g.id} className="goal-item" title={`${g.percentage.toFixed(1)}% Completado`}>
            <span className="goal-icon"><i className={getIconClass(g.icon)}></i></span>
            <div className="goal-info">
              <span className="goal-name">{g.name}</span>
              <div className="progress-bar-container mini">
                <div className="progress-bar mini" style={{ width: `${g.percentage}%`, backgroundColor: g.color }}></div>
              </div>
            </div>
            <span className="goal-amount">{formatCurrency(g.current)} / {formatCurrency(g.target)}</span>
          </div>
        ))}
        {hasMore && !isLoading && !error && items.length > 0 && (
             <Link to="/goals" className="panel-link more-link">Ver todas...</Link>
         )}
      </div>
    </div>
  );
}

export default GoalsWidget;