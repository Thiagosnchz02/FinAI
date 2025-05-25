import React, { useMemo } from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters.js'; // Ajusta ruta
import { getIconClass } from '../../utils/iconUtils.js'; // Ajusta ruta
import { formatDistanceToNow, isToday, isTomorrow, isPast, differenceInDays, parseISO, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale'; // Para formato en español

// Recibe el gasto fijo 'expense', la 'category' encontrada (opcional) y los handlers
function FixedExpenseRow({ expense, category, onEdit, onDelete, onToggle, onViewHistory }) {
  const { 
        id, 
        description, 
        amount, 
        frequency, 
        next_due_date, 
        notification_enabled, 
        is_active,
        last_payment_processed_on // <-- NUEVA PROP IMPLÍCITA (viene dentro de expense)
    } = expense;

  const categoryName = category?.name || '(Sin Cat.)';
  const categoryIcon = getIconClass(category?.icon || 'default'); // Usa icono de categoría o default

  const paymentStatus = useMemo(() => {
        if (!is_active) {
            return { text: 'Inactivo', icon: null, color: 'grey', title: 'Este gasto fijo está inactivo.' };
        }
        if (!last_payment_processed_on || !next_due_date) {
            // Si no hay fecha de último pago o próxima fecha, no podemos determinar mucho.
            // Podría ser un gasto nuevo que aún no ha tenido su primer vencimiento.
            // O si next_due_date es hoy o en el pasado, y no hay last_payment_processed_on, está pendiente.
            const today = new Date().toISOString().split('T')[0];
            if (next_due_date <= today) {
                 return { text: 'Pendiente', icon: 'fas fa-hourglass-half', color: 'var(--accent-orange)', title: `Pago para ${formatDate(next_due_date, 'P')} pendiente o en proceso.` };
            }
            return { text: 'Programado', icon: null, color: 'inherit', title: `Programado para ${formatDate(next_due_date, 'P')} (aún no procesado).` };
        }

        // Calcular la fecha de vencimiento que DEBERÍA haberse procesado para que 'last_payment_processed_on' sea válido.
        // Esto es un poco inverso: si next_due_date es la futura, restamos la frecuencia para obtener la que acaba de pasar.
        const currentNextDueDate = new Date(next_due_date + 'T00:00:00Z'); // Trabajar con la fecha futura
        let previousExpectedDueDate = new Date(currentNextDueDate.getTime());

        switch (frequency) {
            case 'mensual': previousExpectedDueDate.setUTCMonth(previousExpectedDueDate.getUTCMonth() - 1); break;
            case 'anual': previousExpectedDueDate.setUTCFullYear(previousExpectedDueDate.getUTCFullYear() - 1); break;
            case 'semanal': previousExpectedDueDate.setUTCDate(previousExpectedDueDate.getUTCDate() - 7); break;
            case 'quincenal': previousExpectedDueDate.setUTCDate(previousExpectedDueDate.getUTCDate() - 14); break;
            case 'bimestral': previousExpectedDueDate.setUTCMonth(previousExpectedDueDate.getUTCMonth() - 2); break;
            case 'trimestral': previousExpectedDueDate.setUTCMonth(previousExpectedDueDate.getUTCMonth() - 3); break;
            case 'semestral': previousExpectedDueDate.setUTCMonth(previousExpectedDueDate.getUTCMonth() - 6); break;
            case 'unico': 
                // Para 'unico', si last_payment_processed_on existe y es igual a next_due_date (que no debería cambiar), está pagado.
                // Pero tu Edge Function lo desactiva, así que el primer if lo manejaría.
                // Si llegamos aquí y es 'unico' y activo, es raro.
                if (last_payment_processed_on === next_due_date) { // Asumiendo que next_due_date no se reprograma para 'unico'
                     return { text: 'Pagado', icon: 'fas fa-check-circle', color: 'var(--accent-green)', title: `Pago único procesado el ${formatDate(last_payment_processed_on, 'P')}` };
                }
                break;
            default: break;
        }
        
        const previousExpectedDueDateString = previousExpectedDueDate.toISOString().split('T')[0];

        if (last_payment_processed_on === previousExpectedDueDateString) {
            return { 
                text: 'Pagado', 
                icon: 'fas fa-check-circle', 
                color: '#4CAF50', 
                title: `Pago del ciclo de ${formatDate(last_payment_processed_on, 'P')} procesado.` 
            };
        } else {
            // Esto podría indicar un desfase o un pago aún no procesado para el ciclo que llevó a la next_due_date actual.
            // O si el gasto es nuevo y next_due_date es la primera.
            const today = new Date().toISOString().split('T')[0];
            if (next_due_date <= today && last_payment_processed_on < previousExpectedDueDateString ) { // Si la fecha de vencimiento ya pasó y el último pago es más antiguo
                 return { text: 'Pendiente', icon: 'fas fa-hourglass-half', color: '#ff9800', title: `Pago para el ciclo que termina en ${formatDate(next_due_date, 'P')} parece pendiente.` };
            }
            return { text: 'Programado', icon: null, color: 'inherit', title: `Programado para ${formatDate(next_due_date, 'P')}` };
        }

    }, [is_active, last_payment_processed_on, next_due_date, frequency]);

  const formattedNextDueDate = useMemo(() => {
        if (!next_due_date) return "N/A";
        try {
            const dueDate = parseISO(next_due_date); // Parsea la fecha string a objeto Date
            const today = startOfDay(new Date());     // Hoy, al inicio del día

            if (isToday(dueDate)) {
                return { text: "Hoy", className: "due-today" };
            }
            if (isTomorrow(dueDate)) {
                return { text: "Mañana", className: "due-tomorrow" };
            }
            if (isPast(dueDate) && paymentStatus.text !== 'Pagado' && is_active) { // Solo si está activo y no pagado
                const daysPast = differenceInDays(today, dueDate);
                return { text: `Vencido hace ${daysPast} día(s)`, className: "due-past" };
            }
            if (dueDate > today) {
                const daysFuture = differenceInDays(dueDate, today);
                if (daysFuture <= 7) { // Si es en los próximos 7 días
                    return { text: `En ${daysFuture} día(s)`, className: "due-soon" };
                }
            }
            return { text: formatDate(next_due_date, 'P'), className: "due-normal" }; // Formato 'dd/MM/yyyy' o el que uses
        } catch (e) {
            console.error("Error formateando next_due_date:", next_due_date, e);
            return { text: next_due_date, className: "due-normal" }; // Fallback a la fecha original
        }
    }, [next_due_date, paymentStatus.text, is_active]);

  // No llamar a onToggle directamente desde onChange del input
  // para permitir que el componente padre maneje la lógica asíncrona
  const handleToggleChange = (field, checked) => {
    onToggle(expense.id, field, checked);
  };

  return (
    <tr key={expense.id} data-id={expense.id} style={{ opacity: expense.is_active ? 1 : 0.6 }}>
      <td><span className="trans-desc">{expense.description || '-'}</span>
      </td>
      <td className="amount-col">
        <span className="trans-amount expense">{formatCurrency(expense.amount)}
        </span>
      </td>
      <td>
        <span className="trans-cat"><i className={categoryIcon}></i> {categoryName}
        </span>
      </td>
      <td>{expense.frequency ? expense.frequency.charAt(0).toUpperCase() + expense.frequency.slice(1) : '-'}</td>
      <td>
        <span className={formattedNextDueDate.className}>
          {formattedNextDueDate.text}
        </span>
        {paymentStatus.icon && (
          <i 
            className={`${paymentStatus.icon} payment-status-icon`} 
            style={{ color: paymentStatus.color, marginLeft: '8px' }}
            title={paymentStatus.title}
          ></i>
        )}
      </td>
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
      <td className="actions-col">
          {/* --- NUEVO BOTÓN DE HISTORIAL --- */}
          {is_active && onViewHistory && ( // Mostrar solo si está activo y la función existe
            <button 
              onClick={() => onViewHistory(expense)} 
              className="btn-icon btn-history-fixed-expense" 
              title="Ver Historial de Pagos"
              aria-label="Ver historial de pagos"
            >
              <i className="fas fa-history"></i>
            </button>
          )}
          <button onClick={() => onEdit(expense)} className="btn-icon btn-edit" title="Editar"><i className="fas fa-pencil-alt"></i></button>
          <button onClick={() => onDelete(id, description)} className="btn-icon btn-delete" title="Eliminar"><i className="fas fa-trash-alt"></i></button>
        </td>
    </tr>
  );
}

export default FixedExpenseRow;