import React from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatters.js'; // Ajusta ruta

function LoansWidget({ data, isLoading, error }) {
    const { items = [], hasMore = false } = data;

    return (
        <div className="panel loans-summary-panel">
            <h3>Préstamos <Link to="/loans" className="panel-link" aria-label="Ver Préstamos"><i className="fas fa-arrow-right"></i></Link></h3>
            <div id="loansSummaryContent">
                {isLoading && <p className="panel-loading">Cargando...</p>}
                {error && <p className="panel-loading error-text">Error al cargar</p>}
                {!isLoading && !error && items.length === 0 && <p className="panel-loading no-data">Sin préstamos activos</p>}
                {!isLoading && !error && items.map(loan => (
                    <div key={loan.id} className="loan-item goal-item" title={`${loan.percentage.toFixed(1)}% Cobrado`}>
                        <span className="goal-icon"><i className={loan.icon || 'fas fa-hand-holding-usd'}></i></span>
                        <div className="goal-info">
                            <span className="goal-name">{loan.name}</span> {/* Deudor */}
                            <div className="progress-bar-container mini">
                                <div className="progress-bar mini" style={{ width: `${loan.percentage}%`, backgroundColor: loan.color }}></div>
                            </div>
                        </div>
                        <span className="goal-amount income">{formatCurrency(loan.balance)}</span> {/* Pendiente por cobrar */}
                    </div>
                ))}
                {hasMore && !isLoading && !error && items.length > 0 && (
                    <Link to="/loans" className="panel-link more-link">Ver todos...</Link>
                )}
            </div>
        </div>
    );
}

export default LoansWidget;