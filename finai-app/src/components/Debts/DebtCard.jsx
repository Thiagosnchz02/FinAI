import React, { useMemo } from 'react'; // Añade useMemo
// Importa date-fns (asegúrate que esté instalado)
import { differenceInCalendarMonths, isFuture, parseISO, startOfDay, isValid } from 'date-fns'; 
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getIconForDebt } from '../../utils/iconUtils';
import { getStatusBadgeClass, getStatusText } from '../../utils/statusUtils';

function DebtCard({ debt, onEdit, onDelete, onAddPayment }) {
  const iconClass = getIconForDebt(debt.description, debt.creditor);
  const statusBadgeClass = getStatusBadgeClass(debt.status);
  const statusText = getStatusText(debt.status);

  // --- INICIO: CÁLCULO DE SUGERENCIA DE PAGO ---
  const paymentSuggestionInfo = useMemo(() => {
    const currentBalance = Number(debt?.current_balance) || 0;
    const annualRate = Number(debt?.interest_rate) || 0;
    const dueDateString = debt?.due_date;

    // Si ya está pagada o no hay balance, no mostrar sugerencia (texto null)
    if (currentBalance <= 0 || debt?.status === 'pagada') {
        return { amount: 0, text: null }; 
    }

    const today = startOfDay(new Date());
    const dueDate = dueDateString ? startOfDay(parseISO(dueDateString)) : null;

    if (!dueDate || !isValid(dueDate)) {
        return { amount: 0, text: "Fecha vencimiento inválida." };
    }

    // Si está vencida
    if (!isFuture(dueDate)) {
        return { amount: currentBalance, text: `¡Vencida! Pagar ${formatCurrency(currentBalance)}.` };
    }

    // Calcular meses restantes (N)
    const N = differenceInCalendarMonths(dueDate, today) + 1; 
    if (N <= 0) { // Vence este mes
        return { amount: currentBalance, text: `Vence este mes. Pagar ${formatCurrency(currentBalance)}.` };
    }

    // Calcular tasa mensual (r)
    const r = (annualRate / 100) / 12;
    let monthlyPayment = 0;

    if (annualRate === 0 || r === 0) {
        // Sin interés: promedio simple
        monthlyPayment = currentBalance / N;
    } else {
        // Con interés: fórmula amortización
        try { 
            const factor = Math.pow(1 + r, N);
            if (!isFinite(factor)) throw new Error("Factor inválido");
            const denominator = factor - 1;
            if (denominator === 0) throw new Error("Denominador cero");
            monthlyPayment = currentBalance * (r * factor) / denominator;
        } catch(calcError) {
            console.error("Error cálculo amortización:", calcError, {debt});
            return { amount: 0, text: "No se pudo calcular (tasa/plazo inválido)." };
        }
    }

    if (!isFinite(monthlyPayment) || monthlyPayment <= 0) {
        console.warn("Resultado de pago sugerido inválido o cero:", monthlyPayment, "N:", N);
        // Fallback si el cálculo falla o da <= 0
        const simpleAvg = currentBalance / N;
         return { amount: simpleAvg, text: `Pago > ${formatCurrency(simpleAvg)}/mes (aprox. sin interés).` };
    }

    // --- AÑADE ESTE CONSOLE.LOG ---
    console.log('Valores para texto de sugerencia:', {
      rawMonthlyPayment: monthlyPayment,
      formattedMonthlyPayment: formatCurrency(monthlyPayment),
      N_value: N,
      annualRate_value: annualRate
    });
    // ------------------------------

    // Devolver resultado formateado
    return {
      amount: monthlyPayment,
      // ESTA ES LA LÍNEA CORRECTA:
      text: `Pago sugerido: ${formatCurrency(monthlyPayment)}/mes (${N} meses con ${annualRate}% interés)`
  };
  
  }, [debt?.current_balance, debt?.interest_rate, debt?.due_date, debt?.status]);
// --- FIN: CÁLCULO DE SUGERENCIA DE PAGO ---

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
        {/* --- INICIO: MOSTRAR SUGERENCIA DE PAGO --- */}
        {/* Mostrar solo si hay texto de sugerencia */}
        {paymentSuggestionInfo.text && (
          <div className="info-item debt-payment-suggestion"> {/* Ocupa un espacio en el grid */}
             {/* Puedes omitir la label si prefieres */}
             <span className="info-label">Sugerencia</span>
             <span className="info-value suggestion-text"> {/* Clase para estilo */}
                <i className="fas fa-calculator" style={{ marginRight: '5px', fontSize: '0.9em', opacity: 0.8 }}></i> {/* Icono */}
                {paymentSuggestionInfo.text}
             </span>
          </div>
        )}
        {/* --- FIN: MOSTRAR SUGERENCIA DE PAGO --- */}
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