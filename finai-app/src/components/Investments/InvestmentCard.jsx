import React from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters.js'; // Asegúrate que la ruta es correcta
import { getIconForInvestmentType } from '../../utils/iconUtils.js'; // Asegúrate que la ruta es correcta

function InvestmentCard({ investment, onEdit, onDelete }) {
  const {
    id,
    type,
    name,
    symbol,
    quantity,
    purchase_price,
    purchase_date,
    current_value,
    broker
  } = investment;

  // Cálculos para mostrar
  const iconClass = getIconForInvestmentType(type);
  const numQuantity = Number(quantity) || 0;
  const numPurchasePrice = Number(purchase_price) || 0;
  const numCurrentValue = Number(current_value) || 0;
  const purchaseTotalValue = numQuantity * numPurchasePrice;
  const profitLoss = numCurrentValue - purchaseTotalValue;
  const profitLossClass = profitLoss > 0 ? 'profit' : (profitLoss < 0 ? 'loss' : 'neutral');
  const profitLossSign = profitLoss > 0 ? '+' : '';

  // Determinar si se pueden calcular las pérdidas/ganancias con sentido
  // Solo si tenemos precio de compra y cantidad (o si cantidad es 0 pero precio no)
  const showPL = (numQuantity > 0 && numPurchasePrice > 0) || (numQuantity === 0 && numPurchasePrice === 0 && numCurrentValue !== 0);


  return (
    <div className="investment-card" data-id={id} data-type={type}>
      <div className="investment-card-header">
        <div className="investment-icon-container"><i className={iconClass}></i></div>
        <div className="investment-header-info">
          <h3 className="investment-name">{name}</h3>
          {symbol && <span className="investment-symbol">{symbol}</span>}
          <span className="investment-type-badge">{type}</span>
        </div>
      </div>
      <div className="investment-card-body">
        {/* Mostrar cantidad y precios solo si aplican (no para inmuebles, por ejemplo) */}
        {numQuantity > 0 && (
            <>
             <div className="info-item"> <span className="info-label">Cantidad</span> <span className="info-value">{numQuantity.toLocaleString('es-ES')}</span> </div>
             <div className="info-item"> <span className="info-label">P. Compra U.</span> <span className="info-value">{formatCurrency(numPurchasePrice)}</span> </div>
             <div className="info-item"> <span className="info-label">V. Compra Total</span> <span className="info-value">{formatCurrency(purchaseTotalValue)}</span> </div>
            </>
        )}
        <div className="info-item"> <span className="info-label">V. Actual Total</span> <span className="info-value important">{formatCurrency(numCurrentValue)}</span> </div>
        {/* Mostrar P/L solo si tiene sentido */}
        {showPL && (
             <div className="info-item"> <span className="info-label">Gan./Pérd.</span> <span className={`info-value ${profitLossClass}`}>{profitLossSign}{formatCurrency(profitLoss)}</span> </div>
        )}
        <div className="info-item"> <span className="info-label">F. Compra</span> <span className="info-value">{formatDate(purchase_date)}</span> </div>
      </div>
      <div className="investment-card-footer">
        <span className="investment-broker">{broker || ''}</span>
        <div className="investment-actions">
          <button onClick={() => onEdit(investment)} className="btn-icon btn-edit" title="Editar"><i className="fas fa-pencil-alt"></i></button>
          <button onClick={() => onDelete(id, name)} className="btn-icon btn-delete" title="Eliminar"><i className="fas fa-trash-alt"></i></button>
        </div>
      </div>
    </div>
  );
}

export default InvestmentCard;