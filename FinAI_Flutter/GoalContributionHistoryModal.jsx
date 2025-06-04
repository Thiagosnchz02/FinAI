// src/components/Goals/GoalContributionHistoryModal.jsx
import React, { useMemo } from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters.js'; // Ajusta la ruta si es necesario

function GoalContributionHistoryModal({
    isOpen,
    onClose,
    goal, // El objeto de la meta seleccionada
    transactions = [], // Array de transacciones de aportación para esta meta
    isLoading, // Booleano para indicar si el historial está cargando
    error // String con mensaje de error si la carga falló
}) {
    if (!isOpen || !goal) return null;

    // Las transacciones de aportación a una meta vinculada deberían ser:
    // - Un gasto desde la cuenta origen (con related_goal_id = goal.id)
    // - Un ingreso a la cuenta destino de la meta (con related_goal_id = goal.id)
    // Para este historial, probablemente queramos mostrar las transacciones de INGRESO
    // a la cuenta de la meta, o ambas si las puedes distinguir.
    // Por ahora, asumiremos que las 'transactions' pasadas son las aportaciones directas (positivas).
    // Si tu RPC trae ambas (gasto e ingreso), necesitarás filtrar o mostrar de forma diferente.

    // Filtraremos para mostrar solo los ingresos si ambas vienen, o ajusta según cómo tu RPC traiga los datos
    const contributions = transactions.filter(tx => tx.type === 'ingreso' && tx.amount > 0);
    // O si todas las transacciones pasadas ya son las aportaciones correctas (ej. solo los ingresos a la cuenta de la meta):
    // const contributions = transactions;

    const totalContributionsAmount = useMemo(() => {
        return contributions.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
    }, [contributions]);


    return (
        <div className="modal-overlay active" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget && !isLoading) onClose(); }}>
            <div className="modal-content small goal-history-modal-content"> {/* Clase específica para estilo */}
                <button 
                    onClick={onClose} 
                    className="modal-close-btn" 
                    aria-label="Cerrar modal" 
                    title="Cerrar"
                    disabled={isLoading}
                >
                    <i className="fas fa-times"></i>
                </button>
                
                <h2>Historial de Aportaciones</h2>
                <h3 className="goal-name-header">{goal.name}</h3>
                
                {isLoading && <p className="loading-message"><i className="fas fa-spinner fa-spin"></i> Cargando historial...</p>}
                {error && <p className="error-message">{error}</p>}
                
                {!isLoading && !error && contributions.length === 0 && (
                    <p className="empty-message">No hay aportaciones registradas para esta meta.</p>
                )}

                {!isLoading && !error && contributions.length > 0 && (
                  <>  
                    <div className="transaction-history-list">
                       
                        <table>
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Descripción/Nota</th>
                                    <th style={{textAlign: 'right'}}>Importe</th>
                                </tr>
                            </thead>
                            <tbody>
                                {contributions.map(tx => (
                                    <tr key={tx.id}>
                                        <td>{formatDate(tx.transaction_date, 'P')}</td>
                                        <td>
                                            {tx.description}
                                            {tx.notes && <small style={{display: 'block', color: '#777', marginTop: '3px'}}>{tx.notes}</small>}
                                        </td>
                                        <td style={{textAlign: 'right', color: 'var(--accent-green)'}}>
                                            {formatCurrency(tx.amount, goal.currency)} {/* Asumir misma moneda que la meta */}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="history-summary-total">
                            <strong>Total Aportado (en esta lista):</strong>
                            <span className="total-amount">
                                {formatCurrency(totalContributionsAmount, goal.currency)}
                            </span>
                    </div>
                    <p style={{ fontSize: '0.8em', color: '#666', textAlign: 'center', marginBottom: '10px' }}>
                            Mostrando las últimas {contributions.length} aportaciones.
                    </p>
                  </>  
                )}

                <div className="modal-actions">
                    <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isLoading}>
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}

export default GoalContributionHistoryModal;