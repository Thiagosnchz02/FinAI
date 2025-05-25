import React, { useMemo } from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters.js'; // Ajusta ruta
import { getIconClass } from '../../utils/iconUtils.js'; // Ajusta ruta

// Recibe la transacción completa (con 'accounts' y 'categories' anidados desde la query)
function TransactionRow({ transaction, onEdit, onDelete }) {
  const { id, transaction_date, description, amount, type, accounts, categories } = transaction;

  const formattedDate = useMemo(() => formatDate(transaction_date), [transaction_date]);
  const accountName = accounts?.name || <span style={{ color: '#aaa' }}>N/A</span>; // Usa datos anidados
  const categoryName = categories?.name || <span style={{ color: '#aaa' }}>(Sin Cat.)</span>;
  const categoryIcon = getIconClass(categories?.icon || categories?.name); // Usa icono o nombre de categoría anidada
  const amountClass = type === 'ingreso' ? 'income' : (type === 'gasto' ? 'expense' : 'transfer');
  // Signo '+' solo para ingresos
  const amountSign = type === 'ingreso' ? '+' : '-';
  // Usar moneda de la cuenta o default EUR
  const formattedAmount = formatCurrency(Math.abs(amount), accounts?.currency || 'EUR');

  // Determinar si es parte de una transferencia (para deshabilitar edición)
  // Asumiendo que tienes constantes globales o pasas los IDs como props
  // const isTransfer = categories?.id === TRANSFER_CATEGORY_ID_IN || categories?.id === TRANSFER_CATEGORY_ID_OUT;
  // O simplemente basándose en el tipo 'transferencia' si lo guardas así consistentemente
  const isTransfer = type === 'transferencia';


  return (
    <tr data-id={id}>
      <td><span className="trans-date">{formattedDate}</span></td>
      <td><span className="trans-desc">{description || '-'}</span></td>
      <td><span className="trans-cat"><i className={categoryIcon}></i> {categoryName}</span></td>
      <td><span className="trans-acc">{accountName}</span></td>
      <td className="amount-col"><span className={`trans-amount ${amountClass}`}>{amountSign}{formattedAmount}</span></td>
      <td>
        {/* Deshabilitar edición si es transferencia */}
        <button
          className="btn-icon btn-edit"
          aria-label="Editar"
          onClick={onEdit}
          disabled={isTransfer}
          title={isTransfer ? "Las transferencias no se editan directamente" : "Editar"}
        >
          <i className="fas fa-pencil-alt"></i>
        </button>
        <button
          className="btn-icon btn-delete"
          aria-label="Eliminar"
          onClick={onDelete}
          title="Eliminar"
        >
          <i className="fas fa-trash-alt"></i>
        </button>
      </td>
    </tr>
  );
}

export default TransactionRow;