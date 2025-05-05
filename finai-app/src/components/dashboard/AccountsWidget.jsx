import React from 'react';
import { Link } from 'react-router-dom';
// Formato de moneda y icono ya aplicados en los datos pasados

function AccountsWidget({ data, isLoading, error }) {
  const { items = [], hasMore = false, noData = false } = data;

  return (
    <div className="panel accounts-summary-panel">
      <h3>Resumen Cuentas <Link to="/accounts" className="panel-link" aria-label="Ver Cuentas"><i className="fas fa-arrow-right"></i></Link></h3>
      <div id="accountsSummaryContent">
        {isLoading && <p className="panel-loading">Cargando...</p>}
        {error && <p className="panel-loading error-text">Error</p>}
        {noData && !isLoading && !error && <p className="panel-loading no-data">Sin cuentas</p>}
        {!isLoading && !error && !noData && items.map(acc => (
          <div key={acc.id} className="account-summary-item">
            <span className="account-summary-icon"><i className={acc.icon}></i></span>
            <span className="account-summary-name">{acc.name}</span>
            <span className={`account-summary-balance ${acc.balanceClass}`}>{acc.balance}</span>
          </div>
        ))}
        {hasMore && !isLoading && !error && !noData && (
             <Link to="/accounts" className="panel-link more-link">Ver todas...</Link>
         )}
      </div>
    </div>
  );
}

export default AccountsWidget;