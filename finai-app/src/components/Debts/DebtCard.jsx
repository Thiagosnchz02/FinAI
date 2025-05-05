import React from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getIconForDebt } from '../../utils/iconUtils';
import { getStatusBadgeClass, getStatusText } from '../../utils/statusUtils';

function DebtCard({ debt, onEdit, onDelete, onAddPayment }) {
  const iconClass = getIconForDebt(debt.description, debt.creditor);
  const statusBadgeClass = getStatusBadgeClass(debt.status);
  const statusText = getStatusText(debt.status);

  return (
    <div key={debt.id} className="debt-card" data-id={debt.id} data-status={debt.status}>
      <div className="debt-icon-status">
        <div className="debt-icon-bg"><i className={iconClass}></i></div>
        <span className={`debt-status-badge ${statusBadgeClass}`}>{statusText}</span>
      </div>
      <div className="debt-info">
        <h3 className="debt-creditor">{debt.creditor}</h3>
        <p className="debt-description">{debt.description || 'Sin descripción'}</p>
        <div className="info-item"><span className="info-label">Importe Inicial</span><span className="info-value">{formatCurrency(debt.initial_amount)}</span></div>
        <div className="info-item"><span className="info-label">Vencimiento</span><span className="info-value">{formatDate(debt.due_date)}</span></div>
        <div className="info-item"><span className="info-label">Saldo Pendiente</span><span className="info-value balance">{formatCurrency(debt.current_balance)}</span></div>
        {/* Quitado Estado de aquí, ya está en el badge */}
        {/* <div className="info-item"><span className="info-label">Estado</span><span className="info-value status-text">{statusText}</span></div> */}
      </div>
      <div className="debt-actions">
        {/* Botón añadir pago solo si no está pagada */}
        {debt.status !== 'pagada' && onAddPayment && (
          <button onClick={() => onAddPayment(debt)} className="btn-icon btn-add-payment" aria-label="Añadir Pago" title="Añadir Pago">
            <i className="fas fa-dollar-sign"></i>
          </button>
        )}
        {/* Botones editar y eliminar */}
        <button onClick={() => onEdit(debt)} className="btn-icon btn-edit" aria-label="Editar"><i className="fas fa-pencil-alt"></i></button>
        <button onClick={() => onDelete(debt.id, debt.creditor)} className="btn-icon btn-delete" aria-label="Eliminar"><i className="fas fa-trash-alt"></i></button>
      </div>
    </div>
  );
}

export default DebtCard;