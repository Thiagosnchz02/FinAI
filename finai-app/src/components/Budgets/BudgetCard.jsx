import React, { useMemo } from 'react';
import { formatCurrency } from '../../utils/formatters';
import { getIconClass } from '../../utils/iconUtils';

function BudgetCard({ budget, category, spentAmount, onEdit, onDelete, previousMonthBudgetAmount, // Puede ser undefined si no hubo presupuesto
    previousMonthSpentAmount, rolloverAmount, isRolloverFeatureEnabled  }) {
  // --- Cálculos para la visualización ---
  const budgetAmount = Number(budget.amount) || 0;
  const spent = spentAmount || 0; // Gasto recibido como prop
  const actualRolloverAmount = isRolloverFeatureEnabled ? (Number(rolloverAmount) || 0) : 0;
  const availableBudget = budgetAmount + actualRolloverAmount;

  const remaining = availableBudget - spent;
  // Asegurar que el porcentaje no exceda 100 si se gasta más
  const percentage = availableBudget > 0 
        ? Math.min(100, Math.max(0, (spent / availableBudget) * 100)) 
        : (spent > 0 ? 100 : 0);
  const overspent = spent > availableBudget && availableBudget >= 0;

  const remainingClass = overspent 
        ? 'negative' 
        : (availableBudget === 0 && spent === 0) 
            ? 'neutral' // Si no hay presupuesto disponible ni gasto, neutral
            : (remaining === 0 && availableBudget > 0) 
                ? 'neutral' // Justo en el presupuesto
                : (remaining > 0 ? 'positive' : 'negative');

  // --- Colores de la barra de progreso ---
  let progressBarColor = '#48bb78'; // Verde por defecto
  if (overspent) progressBarColor = '#e53e3e'; // Rojo intenso si se pasa
  else if (percentage >= 85) progressBarColor = '#f56565'; // Rojo normal cerca del límite
  else if (percentage >= 65) progressBarColor = '#ecc94b'; // Amarillo/Naranja

  // --- Icono y Nombre ---
  const iconClass = getIconClass(category?.icon || 'default'); // Usa icono de categoría o default
  const categoryName = category?.name || 'Categoría Eliminada'; // Maneja si la categoría no se encuentra

  // --- LÓGICA PARA EL ICONO DE ESTADO DEL PRESUPUESTO ---
    const budgetStatusIcon = useMemo(() => {
        if (overspent) { // Presupuesto excedido
            return { icon: 'fas fa-exclamation-triangle', color: 'var(--accent-red-dark, #e53e3e)', title: '¡Presupuesto excedido!' };
        } else if (availableBudget > 0 && percentage >= 85) { // Cerca del límite (85% o más)
            return { icon: 'fas fa-exclamation-circle', color: 'var(--accent-red-light, #f56565)', title: 'Presupuesto casi agotado (más del 85%)' };
        } else if (availableBudget > 0 && percentage >= 65) { // Cuidado (65% a 84%)
             return { icon: 'fas fa-exclamation-circle', color: 'var(--accent-orange, #ecc94b)', title: 'Presupuesto avanzado (más del 65%)' };
        } else if (availableBudget > 0 && spent >= 0) { // Todo bien y hay presupuesto
            return { icon: 'fas fa-check-circle', color: 'var(--accent-green, #48bb78)', title: 'Presupuesto bajo control' };
        } else if (availableBudget <= 0 && spent > 0) { // Gasto sin presupuesto
            return { icon: 'fas fa-info-circle', color: 'var(--text-muted, #718096)', title: 'Gasto registrado sin presupuesto asignado' };
        }
        return null; // No mostrar icono en otros casos (ej. sin presupuesto y sin gasto)
    }, [overspent, percentage, availableBudget, spent]);
    // --- FIN LÓGICA ICONO ---

    // --- FORMATEAR DATOS DEL MES ANTERIOR (si existen) ---
    const prevMonthBudgetString = previousMonthBudgetAmount !== undefined 
        ? formatCurrency(previousMonthBudgetAmount) 
        : 'N/A';
    const prevMonthSpentString = previousMonthSpentAmount !== undefined 
        ? formatCurrency(previousMonthSpentAmount)
        : 'N/A';
    // Solo mostrar la sección si hay datos del presupuesto o gasto del mes anterior
    const showPreviousMonthInfo = previousMonthBudgetAmount !== undefined || previousMonthSpentAmount > 0;
    // ----------------------------------------------------

  return (
    <div className={`budget-card ${overspent ? 'overspent' : ''}`} data-id={budget.id}>
      <div className="card-header">
        <span className="category-icon"><i className={iconClass}></i></span>
        <h3 className="category-name">{categoryName}</h3>
      </div>
      <div className="card-body">
        <div className="budget-amounts">
          <div>Presup. Base: <span className="amount budgeted">{formatCurrency(budget.amount)}</span></div>
          {isRolloverFeatureEnabled && actualRolloverAmount !== 0 && (
            <div className={`rollover-amount ${actualRolloverAmount > 0 ? 'positive' : 'negative'}`}>
              Rollover Mes Ant.: 
              <span className="amount">
                {actualRolloverAmount > 0 ? '+' : ''}{formatCurrency(actualRolloverAmount)}
              </span>
            </div>
          )}
          {/* -------------------------------------------------------------------------- */}
          {/* Mostrar "Disponible" solo si el rollover está habilitado Y es diferente al base, o si siempre se quiere mostrar */}
          {isRolloverFeatureEnabled && budgetAmount !== availableBudget && (
            <div className="available-budget">
                Disponible: 
                  <span className="amount emphasis">{formatCurrency(availableBudget)}</span>
            </div>
          )}
          {/* Si el rollover está desactivado, el "Presupuesto Base" es el disponible, así que no repetimos "Disponible" */}

          <div>Gastado: <span className="amount spent">{formatCurrency(spent)}</span></div>
          <div>
              Restante: 
                <span className={`amount remaining ${remainingClass}`}>
                  {formatCurrency(remaining)}
                  {budgetStatusIcon && (
                    <i 
                      className={`${budgetStatusIcon.icon} budget-status-indicator-icon`} 
                      style={{ color: budgetStatusIcon.color }} // El marginLeft se manejará con SCSS
                      title={budgetStatusIcon.title}
                    ></i>
                  )}
                </span>
            </div>
        </div>
        <div className="progress-bar-container" title={`${percentage.toFixed(1)}% gastado`}>
          <div className="progress-bar" style={{ width: `${percentage}%`, backgroundColor: progressBarColor }}></div>
        </div>
        {/* --- NUEVO: Mostrar Información del Mes Anterior --- */}
        {showPreviousMonthInfo && (
          <div className="previous-month-info">
            <small>
              Mes Anterior: 
              Presup. {prevMonthBudgetString} / 
              Gastado {prevMonthSpentString}
            </small>
          </div>
        )}
        {overspent && <div className="overspent-indicator">¡Presupuesto excedido!</div>}
      </div>
      <div className="card-actions">
        {/* Llama a las funciones pasadas por props */}
        <button onClick={() => onEdit(budget)} className="btn-icon btn-edit" aria-label="Editar Importe"><i className="fas fa-pencil-alt"></i></button>
        <button onClick={() => onDelete(budget.id, categoryName)} className="btn-icon btn-delete" aria-label="Eliminar Presupuesto"><i className="fas fa-trash-alt"></i></button>
      </div>
    </div>
  );
}

export default BudgetCard;