import React, { useMemo } from 'react';
import { formatCurrency, formatDate, getTripStatusInfo } from '../../utils/formatters.js';
import { getIconForTrip } from '../../utils/iconUtils.js'; // Asume que mueves getIconForTrip a iconUtils
import { 
    differenceInDays, 
    formatDistanceToNowStrict, 
    isFuture, 
    isPast, 
    isToday, 
    parseISO, 
    startOfDay,
    isValid, // Para verificar si la fecha es válida
    differenceInCalendarMonths
} from 'date-fns';
import { es } from 'date-fns/locale';

// Recibe el objeto 'trip' y los handlers como props
function TripCard({ 
    trip, 
    onViewDetail, 
    onEdit, 
    //onDelete, 
    onAddExpense, 
    onViewSummary,
    onArchive,      // Para viajes activos
    onUnarchive     // Para viajes archivados
    }) {
    const { id, name, destination, start_date, end_date, budget, saved_amount, status, is_archived } = trip;

    // Lógica de cálculo y formato (igual que antes, pero usa utils importados)
    const iconClass = useMemo(() => getIconForTrip(name, destination), [name, destination]);
    const formattedBudget = useMemo(() => formatCurrency(budget), [budget]);
    const formattedSaved = useMemo(() => formatCurrency(saved_amount), [saved_amount]);
    //const formattedStartDate = useMemo(() => formatDate(start_date), [start_date]);
    //const formattedEndDate = useMemo(() => formatDate(end_date), [end_date]);
    const statusInfo = getTripStatusInfo(status);
    const progress = useMemo(() => {
        const numBudget = parseFloat(budget) || 0;
        const numSaved = parseFloat(saved_amount) || 0;
        return numBudget > 0 ? Math.min(100, Math.max(0, (numSaved / numBudget) * 100)) : 0;
    }, [budget, saved_amount]);
    const progressBarColor = 'var(--accent-orange)'; // O podrías hacerlo dinámico

    // --- NUEVO: useMemo para el texto dinámico de fechas ---
    const tripTimingInfo = useMemo(() => {
        const today = startOfDay(new Date());
        const sDate = start_date && isValid(parseISO(start_date)) ? startOfDay(parseISO(start_date)) : null;
        const eDate = end_date && isValid(parseISO(end_date)) ? startOfDay(parseISO(end_date)) : null;

        if (!sDate && !eDate) return { text: "Fechas no definidas", isUpcoming: false };
        if (sDate && !eDate) return `Inicia: ${formatDate(start_date)}`; // Solo fecha de inicio
        if (!sDate && eDate) return `Finaliza: ${formatDate(end_date)}`; // Solo fecha de fin (raro, pero posible)

        // Si tenemos ambas fechas
        const formattedStart = formatDate(start_date);
        const formattedEnd = formatDate(end_date);

        if (status === 'finalizado' || (eDate && isPast(eDate) && !isToday(eDate))) {
            return { text: `Finalizó ${formatDistanceToNowStrict(eDate, { addSuffix: true, locale: es })}`, isUpcoming: false };
        }
        if (status === 'en curso' || (sDate && eDate && !isFuture(sDate) && isFuture(eDate)) || (sDate && isToday(sDate)) || (eDate && isToday(eDate) && !isFuture(sDate))) {
            if (isToday(eDate)) return { text: `¡Finaliza hoy! (${formattedEnd})`, isUpcoming: false };
            return { text: `En curso (hasta ${formattedEnd})`, isUpcoming: false };
        }
        if (sDate && isFuture(sDate)) {
            if (isToday(sDate)) return { text: `¡Empieza hoy! (${formattedStart})`, isUpcoming: true };
            const daysUntilStart = differenceInDays(sDate, today);
            if (daysUntilStart <= 30) { // Mostrar "en X días" si es en menos de un mes
                 return { text: `Empieza ${formatDistanceToNowStrict(sDate, { addSuffix: true, locale: es })}`, isUpcoming: true };
            }
            return { text: `Inicia: ${formattedStart}`, isUpcoming: true };
        }
        
        // Fallback por si alguna lógica no cubre el caso, muestra el rango
        return { text: `${formattedStart} - ${formattedEnd}`, isUpcoming: isFuture(sDate) };

    }, [start_date, end_date, status]);
    // ----------------------------------------------------

    // --- NUEVO: useMemo para la sugerencia de ahorro mensual ---
    const savingSuggestionInfo = useMemo(() => {
        const numBudget = parseFloat(budget) || 0;
        const numSaved = parseFloat(saved_amount) || 0;
        const amountToSave = numBudget - numSaved;

        // No mostrar sugerencia si ya se ahorró lo necesario, no hay presupuesto, o el viaje no es futuro/planificado
        if (amountToSave <= 0 || numBudget <= 0 || status === 'finalizado' || status === 'en curso' || !tripTimingInfo.isUpcoming) {
            return null; 
        }

        const today = startOfDay(new Date());
        const sDate = start_date && isValid(parseISO(start_date)) ? startOfDay(parseISO(start_date)) : null;

        if (!sDate || !isFuture(sDate)) { // Si no hay fecha de inicio o ya pasó (aunque tripTimingInfo.isUpcoming debería cubrir esto)
            return null;
        }

        const monthsRemaining = differenceInCalendarMonths(sDate, today) + 1; // Incluye el mes actual como periodo de ahorro

        if (monthsRemaining <= 0) { // Si vence este mes o ya pasó (improbable si isUpcoming es true)
            if (amountToSave > 0) {
                return { text: `¡Ahorra ${formatCurrency(amountToSave)} este mes para tu viaje!` };
            }
            return null;
        }

        const monthlySuggestion = amountToSave / monthsRemaining;

        if (monthlySuggestion <= 0) return null; // No sugerir si ya está cubierto o es negativo

        return {
            text: `Ahorro sugerido: ${formatCurrency(monthlySuggestion)}/mes (${monthsRemaining} ${monthsRemaining === 1 ? 'mes' : 'meses'})`
        };

    }, [budget, saved_amount, start_date, status, tripTimingInfo.isUpcoming]); // Depende de estos datos
    // --- FIN NUEVO useMemo ---

    return (
        <div className={`trip-card ${is_archived ? 'archived' : ''}`} data-id={id} data-status={status || 'unknown'}>
            <div className="trip-icon-container" title={`Icono para ${name}`}>
                <i className={iconClass}></i>
            </div>
            <div className="trip-info" title={`Información sobre ${name}`}>
                <div className="trip-name-status-line">
                    <h3 className="trip-name">{name || 'Viaje sin nombre'}</h3>
                    {/* El badge de estado ahora está aquí, junto al nombre */}
                    {statusInfo && !is_archived && ( 
                        <span className={`trip-status-badge ${statusInfo.className}`}>
                            {statusInfo.text}
                        </span>
                    )}
                    {is_archived && (
                        <span className="trip-status-badge status-archived">Archivado</span>
                    )}
                </div>
                {destination && <p className="trip-destination">{destination}</p>}
                <p className="trip-dates dynamic-dates">{tripTimingInfo.text}</p>
                <div className="trip-budget-saved">
                    <span>Presup.: <strong>{formattedBudget}</strong> / Ahorrado: <strong>{formattedSaved}</strong></span>
                </div>
                <div className="trip-progress-bar-container">
                    <div 
                        className="trip-progress-bar" 
                        style={{ width: `${progress.toFixed(1)}%`, 
                        backgroundColor: progressBarColor }} 
                        title={`${progress.toFixed(1)}% Ahorrado`}></div>
                </div>
                {/* --- MOSTRAR SUGERENCIA DE AHORRO --- */}
                    {savingSuggestionInfo && (
                        <div className="trip-saving-suggestion">
                            <small>
                                <i className="fas fa-piggy-bank" style={{ marginRight: '5px', fontSize: '0.9em', opacity: 0.8 }}></i>
                                {savingSuggestionInfo.text}
                            </small>
                        </div>
                    )}
                    {/* ----------------------------------- */}
            </div>
            <div className="trip-actions">
                {/* Botones condicionales para viajes ACTIVOS */}
                {!is_archived && (
                    <>
                        {status !== 'finalizado' && onAddExpense && (
                            <button className="btn-icon btn-add-expense-card" aria-label="Añadir Gasto" onClick={(e) => { e.stopPropagation(); onAddExpense('add', null, trip); }} title="Añadir Gasto al Viaje">
                                <i className="fas fa-plus-circle"></i>
                            </button>
                        )}
                        {status === 'finalizado' && onViewSummary && (
                             <button className="btn-icon btn-view-summary-card" aria-label="Ver Resumen" onClick={(e) => { e.stopPropagation(); onViewSummary(trip); }} title="Ver Resumen del Viaje">
                                <i className="fas fa-chart-pie"></i>
                            </button>
                        )}
                        <button className="btn-icon btn-view-expenses" aria-label="Ver Detalles" onClick={(e) => { e.stopPropagation(); onViewDetail(trip); }} title="Ver Gastos y Detalle">
                            <i className="fas fa-receipt"></i>
                        </button>
                        {onEdit && ( // Solo mostrar si onEdit existe y no está archivado
                            <button className="btn-icon btn-edit-trip" aria-label="Editar Viaje" onClick={(e) => { e.stopPropagation(); onEdit(trip); }} title="Editar Viaje">
                                <i className="fas fa-pencil-alt"></i>
                            </button>
                        )}
                        {onArchive && ( // Botón para ARCHIVAR
                            <button className="btn-icon btn-archive-trip" aria-label="Archivar Viaje" onClick={(e) => { e.stopPropagation(); onArchive(trip); }} title="Archivar Viaje">
                                <i className="fas fa-archive"></i>
                            </button>
                        )}
                    </>
                )}

                {/* Botón para DESARCHIVAR viajes archivados */}
                {is_archived && onUnarchive && (
                    <button 
                        className="btn-icon btn-unarchive-trip" 
                        aria-label="Desarchivar Viaje" 
                        onClick={(e) => { e.stopPropagation(); onUnarchive(trip); }} 
                        title="Desarchivar Viaje"
                    >
                        <i className="fas fa-box-open"></i>
                    </button>
                )}
                {/* El botón de eliminar original se reemplaza por archivar/desarchivar */}
            </div>
        </div>
    );
}

export default TripCard;