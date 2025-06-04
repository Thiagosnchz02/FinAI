import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency, formatDate, timeAgo } from '../../utils/formatters.js'; // Ajusta ruta
import { getIconClass } from '../../utils/iconUtils.js'; // Ajusta ruta

function RecentActivityWidget({ data, isLoading, error }) {
  const { items = [] } = data;

  return (
    <div className="panel recent-activity-panel">
      <h3>Actividad Reciente <Link to="/transactions" className="panel-link"><i className="fas fa-arrow-right"></i></Link></h3>
      <div id="recentActivityList">
        {isLoading && <p className="panel-loading">Cargando...</p>}
        {error && <p className="panel-loading error-text">Error al cargar</p>}
        {!isLoading && !error && items.length === 0 && <p className="panel-loading no-data">Sin actividad</p>}
        {!isLoading && !error && items.map(tx => {
          const amountClass = tx.type === 'ingreso' ? 'income' : tx.type === 'gasto' ? 'expense' : 'transfer';
          const amountSign = tx.type === 'ingreso' ? '+' : (tx.type === 'gasto' ? '-' : '');
          // Obtener icono desde categoría anidada (si existe) o default
          const icon = getIconClass(tx.categories?.icon || tx.categories?.name);

          return (
            <div key={tx.id} className="activity-item">
              <span className={`activity-icon ${amountClass}`}><i className={icon}></i></span>
              <span className="activity-desc">{tx.description || 'Sin descripción'}</span>
              {/* Usar timeAgo para fechas recientes */}
              <span className="activity-date">{timeAgo(tx.transaction_date) || formatDate(tx.transaction_date)}</span>
              <span className={`activity-amount ${amountClass}`}>{amountSign}{formatCurrency(Math.abs(tx.amount))}</span>
            </div>
          );
        })}
        {/* Podrías añadir enlace "Ver todas" aquí si items.length >= 5 */}
      </div>
    </div>
  );
}

export default RecentActivityWidget;