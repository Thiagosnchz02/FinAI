import React from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency, formatDate } from '../../utils/formatters.js'; // Ajusta ruta
import { getIconClass } from '../../utils/iconUtils.js'; // Ajusta ruta

function UpcomingPaymentsWidget({ data, isLoading, error }) {
  const { items = [] } = data;

  return (
    <div className="panel upcoming-payments-panel">
      <h3>Próximos Pagos <Link to="/fixed-expenses" className="panel-link"><i className="fas fa-arrow-right"></i></Link></h3>
      <div id="upcomingPaymentsList">
        {isLoading && <p className="panel-loading">Cargando...</p>}
        {error && <p className="panel-loading error-text">Error al cargar</p>}
        {!isLoading && !error && items.length === 0 && <p className="panel-loading no-data">Sin pagos próximos</p>}
        {!isLoading && !error && items.map(p => (
          <div key={p.id} className="payment-item"> {/* Usa una clase específica */}
            <span className="payment-icon"><i className={getIconClass(p.categories?.icon)}></i></span> {/* Icono de categoría */}
            <span className="payment-desc">{p.description}</span>
            <span className="payment-date">{formatDate(p.next_due_date)}</span> {/* Fecha formateada */}
            <span className="payment-amount expense">{formatCurrency(p.amount)}</span> {/* Siempre gasto */}
          </div>
        ))}
      </div>
    </div>
  );
}

export default UpcomingPaymentsWidget;