import React from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters.js'; // Ajusta ruta
import { getIconClass } from '../../utils/iconUtils.js'; // Ajusta ruta

// Recibe el gasto fijo 'expense', la 'category' encontrada (opcional) y los handlers
function FixedExpenseRow({ expense, category, onEdit, onDelete, onToggle }) {

  const categoryName = category?.name || '(Sin Cat.)';
  const categoryIcon = getIconClass(category?.icon || 'default'); // Usa icono de categoría o default

  // No llamar a onToggle directamente desde onChange del input
  // para permitir que el componente padre maneje la lógica asíncrona
  const handleToggleChange = (field, checked) => {
    onToggle(expense.id, field, checked);
  };

  return (
    <tr key={expense.id} data-id={expense.id} style={{ opacity: expense.is_active ? 1 : 0.6 }}>
      <td><span className="trans-desc">{expense.description || '-'}</span></td>
      <td className="amount-col"><span className="trans-amount expense">{formatCurrency(expense.amount)}</span></td>
      <td><span className="trans-cat"><i className={categoryIcon}></i> {categoryName}</span></td>
      <td>{expense.frequency ? expense.frequency.charAt(0).toUpperCase() + expense.frequency.slice(1) : '-'}</td>
      <td>{formatDate(expense.next_due_date)}</td>
      <td>
        {/* Toggle para Activo */}
        <label className="toggle-switch">
          <input
            type="checkbox"
            className="toggle-active"
            checked={expense.is_active}
            onChange={(e) => handleToggleChange('is_active', e.target.checked)}
          />
          <span className="toggle-slider"></span>
        </label>
      </td>
      <td>
        {/* Toggle para Recordatorio */}
        <label className="toggle-switch">
          <input
            type="checkbox"
            className="toggle-notification"
            checked={expense.notification_enabled}
            onChange={(e) => handleToggleChange('notification_enabled', e.target.checked)}
          />
          <span className="toggle-slider"></span>
        </label>
      </td>
      <td>
        {/* Botones de Acción */}
        <button onClick={() => onEdit(expense)} className="btn-icon btn-edit" aria-label="Editar"><i className="fas fa-pencil-alt"></i></button>
        <button onClick={() => onDelete(expense.id, expense.description)} className="btn-icon btn-delete" aria-label="Eliminar"><i className="fas fa-trash-alt"></i></button>
      </td>
    </tr>
  );
}

export default FixedExpenseRow;