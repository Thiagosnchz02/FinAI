import React, { useMemo } from 'react';
// Asegúrate que las rutas a tus utils sean correctas
import { formatCurrency, formatDate } from '../../utils/formatters.js';

// Recibe el objeto 'expense' y los handlers como props
function TripExpenseRow({ expense, onEdit, onDelete, actionsDisabled }) {
    const { id, expense_date, description, categories, amount } = expense;

    // Lógica de formato (igual que antes, usa utils importados)
    const formattedDate = useMemo(() => formatDate(expense_date), [expense_date]);
    const formattedAmount = useMemo(() => formatCurrency(amount), [amount]);

    const categoryName = categories?.name || '-';

    return (
        <tr data-id={id}>
            <td>{formattedDate}</td>
            <td>{description || '-'}</td>
            <td>{categoryName}</td>
            <td className="amount-col expense">{formattedAmount}</td>
            <td className="actions-col">
                {/* Llama a los handlers pasados como props */}
                <button 
                    className="btn-icon btn-edit-expense" 
                    aria-label="Editar Gasto" 
                    onClick={onEdit}
                    disabled={actionsDisabled} // <-- DESHABILITAR
                    title={actionsDisabled ? "Viaje finalizado" : "Editar Gasto"}
                >
                    <i className="fas fa-pencil-alt"></i>
                </button>
                <button 
                    className="btn-icon btn-delete-expense" 
                    aria-label="Eliminar Gasto" 
                    onClick={onDelete}
                    disabled={actionsDisabled} // <-- DESHABILITAR
                    title={actionsDisabled ? "Viaje finalizado" : "Eliminar Gasto"}
                >
                    <i className="fas fa-trash-alt"></i>
                </button>
            </td>
        </tr>
    );
}

export default TripExpenseRow;