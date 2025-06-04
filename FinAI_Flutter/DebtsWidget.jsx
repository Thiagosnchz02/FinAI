import React from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatters.js'; // Ajusta ruta
// Icono es fijo o podrías añadir lógica si quieres

function DebtsWidget({ data, isLoading, error }) {
    const { items = [], hasMore = false } = data;

    return (
        <div className="panel debts-summary-panel">
            <h3>Deudas <Link to="/debts" className="panel-link" aria-label="Ver Deudas"><i className="fas fa-arrow-right"></i></Link></h3>
            <div id="debtsSummaryContent">
                {isLoading && <p className="panel-loading">Cargando...</p>}
                {error && <p className="panel-loading error-text">Error al cargar</p>}
                {!isLoading && !error && items.length === 0 && <p className="panel-loading no-data">Sin deudas activas</p>}
                {!isLoading && !error && items.map(debt => (
                    <div key={debt.id} className="debt-item goal-item" title={`${debt.percentage.toFixed(1)}% Pagado`}>
                        <span className="goal-icon"><i className={debt.icon || 'fas fa-file-invoice-dollar'}></i></span> {/* Usar icono pasado o default */}
                        <div className="goal-info">
                            <span className="goal-name">{debt.name}</span> {/* Acreedor */}
                            <div className="progress-bar-container mini">
                                <div className="progress-bar mini" style={{ width: `${debt.percentage}%`, backgroundColor: debt.color }}></div>
                            </div>
                        </div>
                        <span className="goal-amount expense">{formatCurrency(debt.balance)}</span> {/* Pendiente */}
                    </div>
                ))}
                {hasMore && !isLoading && !error && items.length > 0 && (
                    <Link to="/debts" className="panel-link more-link">Ver todas...</Link>
                )}
            </div>
        </div>
    );
}

export default DebtsWidget;