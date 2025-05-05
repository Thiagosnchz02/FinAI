import React from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency, formatDate } from '../../utils/formatters.js'; // Ajusta ruta
import { getIconClass } from '../../utils/iconUtils.js'; // Ajusta ruta

function TripWidget({ data, isLoading, error }) {
  const { trip } = data; // El objeto trip ya viene procesado

  return (
    <div className="panel trips-summary-panel">
      <h3>Próximo Viaje <Link to="/trips" className="panel-link" aria-label="Ver Viajes"><i className="fas fa-arrow-right"></i></Link></h3>
      <div id="nextTripSummaryContent">
        {isLoading && <p className="panel-loading">Buscando...</p>}
        {error && <p className="panel-loading error-text">Error al cargar</p>}
        {!isLoading && !error && !trip && <p className="panel-loading no-data">Sin viajes próximos</p>}
        {!isLoading && !error && trip && (
          <div className="trip-summary-item" title={`${trip.percentage.toFixed(1)}% Ahorrado`}>
            <span className="trip-summary-icon"><i className={getIconClass(trip.icon)}></i></span>
            <div className="trip-summary-info">
              <span className="trip-summary-name">{trip.name}</span>
              {trip.destination && <span className="trip-summary-destination">{trip.destination}</span>}
              <span className="trip-summary-dates">{trip.formattedStartDate} - {trip.formattedEndDate}</span>
              <div className="progress-bar-container mini">
                <div className="progress-bar mini" style={{ width: `${trip.percentage}%`, backgroundColor: trip.color }}></div>
              </div>
            </div>
            <span className="trip-summary-amount">{trip.formattedSaved} / {trip.formattedBudget}</span>
          </div>
        )}
        {/* Podrías añadir un enlace a "Ver todos" si hubiera lógica de hasMore */}
      </div>
    </div>
  );
}

export default TripWidget;