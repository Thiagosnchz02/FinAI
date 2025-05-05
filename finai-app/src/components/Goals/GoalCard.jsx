import React from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters.js'; // Ajusta ruta si es necesario
import { getIconClass } from '../../utils/iconUtils.js'; // Ajusta ruta si es necesario

function GoalCard({ goal, onAddSavings, onEdit, onDelete }) {
  const targetAmount = Number(goal.target_amount) || 0;
  const currentAmount = Number(goal.current_amount) || 0;
  const remaining = targetAmount - currentAmount;
  const percentage = targetAmount > 0 ? Math.max(0, Math.min((currentAmount / targetAmount) * 100, 100)) : (currentAmount > 0 ? 100 : 0);
  const isComplete = currentAmount >= targetAmount && targetAmount > 0;
  let progressBarColor = '#48bb78'; // Verde por defecto
  if (isComplete) progressBarColor = '#8a82d5'; // Morado completado
  else if (percentage >= 75) progressBarColor = '#ecc94b'; // Amarillo/Naranja cerca
  const remainingClass = isComplete ? 'complete' : (remaining >= 0 ? 'positive' : 'negative');
  const remainingText = isComplete ? '¡Conseguido!' : `Restante: ${formatCurrency(remaining)}`;
  const iconClass = getIconClass(goal.icon || 'default'); // Icono de la meta o default
  const targetDateFormatted = formatDate(goal.target_date);

  return (
    <div className="goal-card" data-id={goal.id}>
      <div className="card-header">
        <span className="goal-icon"><i className={iconClass}></i></span>
        <div className="header-text">
          <h3 className="goal-name">{goal.name}</h3>
          {targetDateFormatted !== '--/--/----' && <p className="goal-target-date">Hasta: {targetDateFormatted}</p>}
        </div>
      </div>
      <div className="card-body">
        <div className="goal-amounts">
          <span className="amount-pair">
            <span className="label">Ahorrado:</span>
            <span className="amount current">{formatCurrency(currentAmount)}</span>
          </span>
          <span className="amount-pair">
            <span className="label">Objetivo:</span>
            <span className="amount target">{formatCurrency(targetAmount)}</span>
          </span>
        </div>
        <div className="progress-bar-container" title={`${percentage.toFixed(1)}% completado`}>
          <div className="progress-bar" style={{ width: `${percentage}%`, backgroundColor: progressBarColor }}></div>
          <span className="progress-percentage">{percentage.toFixed(1)}%</span>
        </div>
        <div className={`amount-remaining ${remainingClass}`}>{remainingText}</div>
      </div>
      <div className="card-actions">
        {!isComplete && onAddSavings && ( // Mostrar solo si no está completa
          <button onClick={() => onAddSavings(goal)} className="btn-icon btn-add-savings" aria-label="Añadir Ahorro" title="Añadir Ahorro">
            <i className="fas fa-plus-circle"></i>
          </button>
        )}
        <button onClick={() => onEdit(goal)} className="btn-icon btn-edit" aria-label="Editar Meta" title="Editar Meta">
          <i className="fas fa-pencil-alt"></i>
        </button>
        <button onClick={() => onDelete(goal.id, goal.name)} className="btn-icon btn-delete" aria-label="Eliminar Meta" title="Eliminar Meta">
          <i className="fas fa-trash-alt"></i>
        </button>
      </div>
    </div>
  );
}

export default GoalCard;