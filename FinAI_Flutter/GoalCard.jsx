import React, { useMemo } from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters.js'; // Ajusta ruta si es necesario
import { getIconClass } from '../../utils/iconUtils.js'; // Ajusta ruta si es necesario
import { 
    formatDistanceToNowStrict, 
    isToday, 
    isFuture, 
    isPast, 
    differenceInCalendarDays,
    differenceInCalendarMonths, 
    parseISO,
    isValid, // Para verificar si la fecha es válida
    startOfDay
} from 'date-fns';
import { es } from 'date-fns/locale';

function GoalCard({ 
    goal, 
    onAddSavings, 
    onEdit, 
    //onDelete,
    onArchive,   // <-- NUEVA PROP
    onUnarchive,   // <-- NUEVA PROP
    onViewHistory
}) {
  const targetAmount = Number(goal.target_amount) || 0;
  const currentAmount = Number(goal.current_amount) || 0;
  const remainingToSave = targetAmount - currentAmount;
  const percentage = targetAmount > 0 ? Math.max(0, Math.min((currentAmount / targetAmount) * 100, 100)) : (currentAmount > 0 ? 100 : 0);
  
  
  const isComplete = currentAmount >= targetAmount && targetAmount > 0;
  const isArchived = goal.is_archived;

  const progressBarColor = useMemo(() => {
        if (isArchived) return 'var(--color-text-muted, #A0AEC0)';
        if (isComplete) return 'var(--accent-green, #4CAF50)';
        if (percentage >= 85) return 'var(--accent-orange, #ff9800)'; // Naranja más intenso para casi completo
        if (percentage >= 50) return 'var(--accent-yellow, #ecc94b)'; // Amarillo para progreso medio
        return 'var(--accent-blue, #4299e1)'; // Azul para progreso inicial o tu color base de progreso
  }, [isComplete, percentage]);
  
  const remainingText = isComplete 
        ? "¡Meta Conseguida!" 
        : (targetAmount > 0 ? `Restante: ${formatCurrency(remainingToSave)}` : "Objetivo no definido"); 
  const remainingClass = isComplete ? 'complete' : (remainingToSave <= 0 && targetAmount > 0 ? 'complete' : 'positive');
  const iconClass = getIconClass(goal.icon || 'default-goal-icon');

  const timeInfo = useMemo(() => {
        if (isArchived) {
            return { text: `Archivada ${goal.archived_at ? 'el ' + formatDate(goal.archived_at, 'P') : ''}`, className: "date-archived"};
        }
        if (!goal.target_date) {
            return { text: "Sin fecha objetivo", className: "no-date" };
        }
        try {
            const targetDateObj = parseISO(goal.target_date);
            if (!isValid(targetDateObj)) { // Verificar si la fecha es válida
                 return { text: "Fecha inválida", className: "error-date" };
            }
            const today = new Date();
            
            if (isComplete) { // Si ya está completa, no mostrar tiempo restante
                return { text: `Completada`, className: "date-complete" };
            }
            if (isToday(targetDateObj)) {
                return { text: "¡Vence Hoy!", className: "due-today" };
            }
            if (isFuture(targetDateObj)) {
                const daysDiff = differenceInCalendarDays(targetDateObj, today);
                if (daysDiff === 1) return { text: "Vence Mañana", className: "due-soon" };
                if (daysDiff <= 30) return { text: `Vence en ${daysDiff} días`, className: "due-soon" };
                return { text: `Vence ${formatDistanceToNowStrict(targetDateObj, { addSuffix: true, locale: es })}`, className: "due-future" };
            }
            if (isPast(targetDateObj)) {
                return { text: `Venció ${formatDistanceToNowStrict(targetDateObj, { addSuffix: true, locale: es })}`, className: "due-past" };
            }
            return { text: formatDate(goal.target_date, 'P'), className: "due-normal" }; // Fallback
        } catch(e) {
            console.error("Error parsing target_date for goal:", goal.name, goal.target_date, e);
            return { text: "Fecha no válida", className: "error-date" };
        }
    }, [goal.target_date, isComplete]);

  const savingSuggestion = useMemo(() => {
        if (isComplete || !goal.target_date || remainingToSave <= 0) {
            return null; // No mostrar sugerencia si está completa, sin fecha, o no queda nada por ahorrar
        }

        try {
            const targetDateObj = parseISO(goal.target_date);
            const today = startOfDay(new Date()); // Comparar con el inicio del día de hoy

            if (!isValid(targetDateObj) || !isFuture(targetDateObj)) {
                return null; // No mostrar si la fecha es inválida o ya pasó
            }

            const monthsLeft = differenceInCalendarMonths(targetDateObj, today);
            
            if (monthsLeft >= 1) {
                const amountPerMonth = remainingToSave / monthsLeft;
                return `Ahorra aprox. ${formatCurrency(amountPerMonth)}/mes`;
            } else {
                // Si falta menos de un mes, calcular por días
                const daysLeft = differenceInCalendarDays(targetDateObj, today);
                if (daysLeft > 0) {
                    const amountPerDay = remainingToSave / daysLeft;
                    // Si es muy poco por día, quizás mostrar el total restante o una sugerencia semanal
                    if (daysLeft <= 7 && daysLeft > 0) {
                         const amountPerWeek = remainingToSave / (daysLeft / 7); // Aproximado
                         return `Ahorra aprox. ${formatCurrency(amountPerWeek)}/semana`;
                    }
                    return `Ahorra aprox. ${formatCurrency(amountPerDay)}/día`;
                }
            }
            return null; // No se pudo calcular una sugerencia útil
        } catch (e) {
            console.error("Error calculando sugerencia de ahorro:", e);
            return null;
        }
    }, [isComplete, goal.target_date, remainingToSave]);

  return (
    <div className={`goal-card ${isComplete && !isArchived ? 'is-complete' : ''} ${isArchived ? 'is-archived' : ''}`} data-id={goal.id}>
      <div className="card-header">
                {/* --- CORRECCIÓN: Quitar backgroundColor que usaba 'category' --- */}
                <span 
                    className="goal-icon" 
                    style={{ 
                        backgroundColor: isComplete ? 'transparent' : 'transparent' 
                    }}
                >
                    <i className={iconClass}></i>
                </span>
                <div className="header-text">
                    <h3 className="goal-name">{goal.name}</h3>
                    <p className={`goal-target-date ${timeInfo.className}`}>
                        {timeInfo.icon && <i className={`${timeInfo.icon} time-icon`}></i>}
                        {timeInfo.text}
                    </p>
                </div>
                {isComplete && !isArchived && (
                    <span className="goal-complete-badge" title="¡Meta Conseguida!">
                        <i className="fas fa-trophy"></i>
                    </span>
                )}
                {isArchived && ( // Badge específico para archivadas
                    <span className="goal-archived-badge" title="Meta Archivada">
                        <i className="fas fa-archive"></i>
                    </span>
                )}
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
                    <div 
                        className="progress-bar" 
                        style={{ 
                            width: `${percentage}%`, 
                            backgroundColor: progressBarColor // Usar la variable calculada
                        }}
                    ></div>
                    <span className="progress-percentage">{percentage.toFixed(1)}%</span>
                </div>
                <div className={`amount-remaining ${remainingClass}`}>
                    {isComplete ? (
                        <>
                            <i className="fas fa-check-circle" style={{ marginRight: '5px', color: 'var(--accent-green)' }}></i>
                            {remainingText}
                        </>
                    ) : (
                        remainingText
                    )}
                </div>
            </div>
              
            {savingSuggestion && !isComplete && !isArchived && (
                    <div className="saving-suggestion-text">
                        <small>
                            <i className="fas fa-lightbulb" style={{ marginRight: '5px', color: 'var(--accent-yellow, #ecc94b)'}}></i>
                            {savingSuggestion}
                        </small>
                    </div>
                )}

        <div className="card-actions">
                {!isComplete && !isArchived && onAddSavings && (
                    <button onClick={() => onAddSavings(goal)} className="btn-icon btn-add-savings" aria-label="Añadir Ahorro" title="Añadir Ahorro">
                        <i className="fas fa-plus-circle"></i>
                    </button>
                )}
                {/* Botón "Editar": solo si no está archivada */}
                {!isArchived && onEdit && (
                    <button onClick={() => onEdit(goal)} className="btn-icon btn-edit" aria-label="Editar Meta" title="Editar Meta">
                        <i className="fas fa-pencil-alt"></i>
                    </button>
                )}

                {/* --- NUEVO BOTÓN DE HISTORIAL --- */}
                {onViewHistory && ( // Mostrar siempre que la función exista (se pasa para activas y archivadas)
                    <button 
                        onClick={() => onViewHistory(goal)} 
                        className="btn-icon btn-view-history" // Clase específica para estilo
                        aria-label="Ver Historial de Aportaciones" 
                        title="Ver Historial de Aportaciones"
                    >
                        <i className="fas fa-history"></i> {/* O fas fa-list-alt */}
                    </button>
                )}
                {/* ------------------------------- */}
                
                {/* --- BOTONES DE ARCHIVAR/DESARCHIVAR --- */}
                {!isArchived && onArchive && ( // Mostrar "Archivar" para metas activas
                    <button onClick={() => onArchive(goal.id, goal.name)} className="btn-icon btn-archive-goal" aria-label="Archivar Meta" title="Archivar Meta">
                        <i className="fas fa-archive"></i>
                    </button>
                )}
                {isArchived && onUnarchive && ( // Mostrar "Desarchivar" para metas archivadas
                    <button onClick={() => onUnarchive(goal.id, goal.name)} className="btn-icon btn-unarchive-goal" aria-label="Restaurar Meta" title="Restaurar Meta">
                        <i className="fas fa-box-open"></i>
                    </button>
                )}
            </div>
    </div>
  );
}

export default GoalCard;