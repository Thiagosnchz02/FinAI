// src/components/FixedExpenses/FixedExpenseHistoryModal.jsx
import React from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters.js';

function FixedExpenseHistoryModal({
    isOpen,
    onClose,
    expense, // El objeto del gasto fijo programado
    transactions = [], // Array de transacciones de historial
    isLoading,
    error
}) {
    if (!isOpen || !expense) return null;

    return (
        <div className="modal-overlay active" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="modal-content small"> {/* Puedes usar 'small' o una clase de tamaño específico */}
                <button onClick={onClose} className="modal-close-btn" aria-label="Cerrar modal" title="Cerrar">
                    <i className="fas fa-times"></i>
                </button>
                <h2>Historial de Pagos para:</h2>
                <h3 className="expense-description-title">{expense.description}</h3>

                {isLoading && <p className="loading-message">Cargando historial...</p>}
                {error && <p className="error-message">{error}</p>}
                
                {!isLoading && !error && transactions.length === 0 && (
                    <p className="empty-message">No hay historial de pagos registrados para este gasto fijo.</p>
                )}

                {!isLoading && !error && transactions.length > 0 && (
                    <div className="transaction-history-list">
                        <table>
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Descripción (Transacción)</th>
                                    <th>Importe</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map(tx => (
                                    <tr key={tx.id}>
                                        <td>{formatDate(tx.transaction_date, 'P')}</td>
                                        <td>{tx.description} <small style={{display: 'block', color: '#777'}}>{tx.notes}</small></td>
                                        <td className="amount-col expense">{formatCurrency(tx.amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="modal-actions">
                    <button type="button" onClick={onClose} className="btn btn-secondary">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}

export default FixedExpenseHistoryModal;