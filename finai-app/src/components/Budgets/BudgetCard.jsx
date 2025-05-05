import React from 'react';
import { formatCurrency } from '../../utils/formatters';
import { getIconClass } from '../../utils/iconUtils';

function BudgetCard({ budget, category, spentAmount, onEdit, onDelete }) {
  // --- Cálculos para la visualización ---
  const budgetAmount = Number(budget.amount) || 0;
  const spent = spentAmount || 0; // Gasto recibido como prop
  const remaining = budgetAmount - spent;
  // Asegurar que el porcentaje no exceda 100 si se gasta más
  const percentage = budgetAmount > 0 ? Math.min(100, Math.max(0, (spent / budgetAmount) * 100)) : 0;
  const overspent = spent > budgetAmount;
  const remainingClass = overspent ? 'negative' : (remaining === 0 ? 'neutral' : 'positive');

  // --- Colores de la barra de progreso ---
  let progressBarColor = '#48bb78'; // Verde por defecto
  if (overspent) progressBarColor = '#e53e3e'; // Rojo intenso si se pasa
  else if (percentage >= 95) progressBarColor = '#f56565'; // Rojo normal cerca del límite
  else if (percentage >= 75) progressBarColor = '#ecc94b'; // Amarillo/Naranja

  // --- Icono y Nombre ---
  const iconClass = getIconClass(category?.icon || 'default'); // Usa icono de categoría o default
  const categoryName = category?.name || 'Categoría Eliminada'; // Maneja si la categoría no se encuentra

  return (
    <div className={`budget-card ${overspent ? 'overspent' : ''}`} data-id={budget.id}>
      <div className="card-header">
        <span className="category-icon"><i className={iconClass}></i></span>
        <h3 className="category-name">{categoryName}</h3>
      </div>
      <div className="card-body">
        <div className="budget-amounts">
          <div>Presup.: <span className="amount budgeted">{formatCurrency(budget.amount)}</span></div>
          <div>Gastado: <span className="amount spent">{formatCurrency(spent)}</span></div>
          <div>Restante: <span className={`amount remaining ${remainingClass}`}>{formatCurrency(remaining)}</span></div>
        </div>
        <div className="progress-bar-container" title={`${percentage.toFixed(1)}% gastado`}>
          <div className="progress-bar" style={{ width: `${percentage}%`, backgroundColor: progressBarColor }}></div>
        </div>
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