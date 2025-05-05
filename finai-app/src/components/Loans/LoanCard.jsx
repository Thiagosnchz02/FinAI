import React from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters.js'; // Ajusta ruta
import { getIconForLoan } from '../../utils/iconUtils.js'; // Ajusta ruta
import { getStatusBadgeClassLoan, getStatusTextLoan } from '../../utils/statusUtils.js'; // Ajusta ruta

function LoanCard({ loan, onEdit, onDelete, onAddCollection }) {
  const iconClass = getIconForLoan(loan.description);
  const statusBadgeClass = getStatusBadgeClassLoan(loan.status);
  const statusText = getStatusTextLoan(loan.status);

  return (
    <div className="loan-card" data-id={loan.id} data-status={loan.status}> {/* Usa clase específica si la tienes */}
      <div className="loan-icon-status"> {/* Ajusta clases CSS */}
        <div className="loan-icon-bg"><i className={iconClass}></i></div>
        <span className={`loan-status-badge ${statusBadgeClass}`}>{statusText}</span>
      </div>
      <div className="loan-info">
        <span className="loan-debtor">{loan.debtor}</span>
        <span className="loan-amount">{formatCurrency(loan.current_balance)}</span>
         <span className="loan-description">{loan.description || ''}</span>
        {/* Puedes añadir más info si quieres como fecha vencimiento */}
         <span className="loan-date">Vence: {formatDate(loan.due_date)}</span>
         {/* <span className="loan-status-text">{statusText}</span> quitado, ya está en badge */}
      </div>
      <div className="loan-actions">
        {loan.status !== 'cobrado' && onAddCollection && (
          <button onClick={() => onAddCollection(loan)} className="btn-icon btn-add-collection" title="Registrar Cobro">
            <i className="fas fa-hand-holding-usd"></i> {/* Icono diferente para cobro */}
          </button>
        )}
        <button onClick={() => onEdit(loan)} className="btn-icon btn-edit-loan" title="Editar"><i className="fas fa-pencil-alt"></i></button>
        <button onClick={() => onDelete(loan.id, loan.debtor)} className="btn-icon btn-delete-loan" title="Eliminar"><i className="fas fa-trash-alt"></i></button>
      </div>
    </div>
  );
}

export default LoanCard;