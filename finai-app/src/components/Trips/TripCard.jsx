import React, { useMemo } from 'react';
// Asegúrate que las rutas a tus utils sean correctas
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import { getIconForTrip } from '../../utils/iconUtils.js'; // Asume que mueves getIconForTrip a iconUtils

// Recibe el objeto 'trip' y los handlers como props
function TripCard({ trip, onViewDetail, onEdit, onDelete }) {
    const { id, name, destination, start_date, end_date, budget, saved_amount } = trip;

    // Lógica de cálculo y formato (igual que antes, pero usa utils importados)
    const iconClass = useMemo(() => getIconForTrip(name, destination), [name, destination]);
    const formattedBudget = useMemo(() => formatCurrency(budget), [budget]);
    const formattedSaved = useMemo(() => formatCurrency(saved_amount), [saved_amount]);
    const formattedStartDate = useMemo(() => formatDate(start_date), [start_date]);
    const formattedEndDate = useMemo(() => formatDate(end_date), [end_date]);
    const progress = useMemo(() => {
        const numBudget = parseFloat(budget) || 0;
        const numSaved = parseFloat(saved_amount) || 0;
        return numBudget > 0 ? Math.min(100, Math.max(0, (numSaved / numBudget) * 100)) : 0;
    }, [budget, saved_amount]);
    const progressBarColor = 'var(--accent-orange)'; // O podrías hacerlo dinámico

    return (
        <div className="trip-card" data-id={id}>
            <div className="trip-icon-container">
                <i className={iconClass}></i>
            </div>
            <div className="trip-info">
                <h3 className="trip-name">{name || 'Viaje sin nombre'}</h3>
                {destination && <p className="trip-destination">{destination}</p>}
                <p className="trip-dates">{formattedStartDate} - {formattedEndDate}</p>
                <div className="trip-budget-saved">
                    <span>Presup.: <strong>{formattedBudget}</strong> / Ahorrado: <strong>{formattedSaved}</strong></span>
                </div>
                <div className="trip-progress-bar-container">
                    <div className="trip-progress-bar" style={{ width: `${progress.toFixed(1)}%`, backgroundColor: progressBarColor }} title={`${progress.toFixed(1)}% Ahorrado`}></div>
                </div>
            </div>
            <div className="trip-actions">
                {/* Llama a los handlers pasados como props */}
                <button className="btn-icon btn-view-expenses" aria-label="Ver Gastos" onClick={onViewDetail} title="Ver Gastos"><i className="fas fa-receipt"></i></button>
                <button className="btn-icon btn-edit-trip" aria-label="Editar Viaje" onClick={onEdit} title="Editar Viaje"><i className="fas fa-pencil-alt"></i></button>
                <button className="btn-icon btn-delete-trip" aria-label="Eliminar Viaje" onClick={onDelete} title="Eliminar Viaje"><i className="fas fa-trash-alt"></i></button>
            </div>
        </div>
    );
}

export default TripCard;