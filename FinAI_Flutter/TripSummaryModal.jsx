// src/components/Trips/TripSummaryModal.jsx
import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto'; // Para el gráfico
import { formatCurrency, formatDate } from '../../utils/formatters'; // Tus funciones de formato
import { isColorDark } from '../../utils/colorUtils'; // Tus funciones de formato


function TripSummaryModal({ isOpen, onClose, summaryData }) {
    const chartRef = useRef(null); // Ref para el canvas del gráfico
    const chartInstance = useRef(null); // Ref para la instancia de Chart.js

    useEffect(() => {
        if (isOpen && summaryData && summaryData.chart && summaryData.chart.labels && summaryData.chart.labels.length > 0 && chartRef.current) {
            const ctx = chartRef.current.getContext('2d');
            if (!ctx) return;

            // Destruir instancia anterior si existe
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }

            // Opciones del gráfico
            const chartOptions = {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 800, // Animación suave
                    easing: 'easeInOutQuart',
                },
                plugins: {
                    legend: {
                        position: 'bottom', // Posición de la leyenda
                        labels: {
                            padding: 20,
                            boxWidth: 12,
                            font: {
                                size: 13,
                                family: 'Nunito, sans-serif',
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.75)',
                        titleFont: { size: 14, family: 'Inter, sans-serif' },
                        bodyFont: { size: 12, family: 'Inter, sans-serif' },
                        padding: 10,
                        cornerRadius: 4,
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                const value = context.parsed;
                                if (value !== null && typeof value !== 'undefined') {
                                    label += formatCurrency(value);
                                    const total = context.dataset.data.reduce((acc, val) => acc + val, 0);
                                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                    label += ` (${percentage}%)`;
                                }
                                return label;
                            }
                        }
                    }
                }
            };

            // Crear nueva instancia del gráfico
            chartInstance.current = new Chart(ctx, {
                type: 'doughnut', // O 'pie'
                data: {
                    labels: summaryData.chart.labels,
                    datasets: summaryData.chart.datasets.map(dataset => ({
                        ...dataset,
                        hoverOffset: 8, // Efecto al pasar el ratón
                        borderWidth: 2, // Borde entre segmentos
                        borderColor: '#ffffff' // Borde blanco para separar segmentos (o el color de fondo de tu modal)
                    }))
                },
                options: chartOptions
            });
        } else if (chartInstance.current) {
            // Si no hay datos o el modal no está abierto, destruye el gráfico
            chartInstance.current.destroy();
            chartInstance.current = null;
        }

        // Función de limpieza para destruir el gráfico al desmontar o cerrar
        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
                chartInstance.current = null;
            }
        };
    }, [isOpen, summaryData]); // Redibujar si cambian los datos o la visibilidad

    if (!isOpen) return null;

    if (!summaryData) {
        return (
            <div className="modal-overlay active" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
                <div className="modal-content trip-summary-modal-content">
                    <button onClick={onClose} className="modal-close-btn" aria-label="Cerrar modal" title="Cerrar">
                        <i className="fas fa-times"></i>
                    </button>
                    <h2>Resumen del Viaje</h2>
                    <p className="empty-chart-message">No hay datos disponibles para mostrar el resumen.</p>
                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="btn btn-secondary">Cerrar</button>
                    </div>
                </div>
            </div>
        );
    }

    const {
        tripName, destination, startDate, endDate,
        budget, totalSpent, difference,
        // expensesByCategory // Lo usaremos si queremos una lista detallada además del gráfico
    } = summaryData;

    const differenceClass = difference >= 0 ? 'positive-diff' : 'negative-diff';

    return (
        <div className="modal-overlay active" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="modal-content trip-summary-modal-content"> {/* Clase específica para estilos */}
                <button onClick={onClose} className="modal-close-btn" aria-label="Cerrar modal">
                    <i className="fas fa-times"></i>
                </button>
                <h2>Resumen del Viaje: {tripName || 'Sin Nombre'}</h2>

                <div className="trip-summary-details">
                    {destination && <p><strong>Destino:</strong> {destination}</p>}
                    <p><strong>Fechas:</strong> {startDate || 'N/A'} - {endDate || 'N/A'}</p>
                    
                    <div className="financial-summary">
                        <div className="summary-item">
                            <span className="summary-label">Presupuesto:</span>
                            <span className="summary-value">{formatCurrency(budget)}</span>
                        </div>
                        <div className="summary-item">
                            <span className="summary-label">Gasto Total:</span>
                            <span className="summary-value">{formatCurrency(totalSpent)}</span>
                        </div>
                        <div className={`summary-item ${differenceClass}`}>
                            <span className="summary-label">Diferencia:</span>
                            <span className="summary-value">
                                {formatCurrency(difference)}
                                {difference >= 0 ? ' (Ahorro)' : ' (Sobrecoste)'}
                            </span>
                        </div>
                    </div>
                </div>

                {summaryData.chart && summaryData.chart.labels && summaryData.chart.labels.length > 0 ? (
                    <div className="trip-summary-chart-container">
                        <h3>Desglose de Gastos por Categoría</h3>
                        <div className="chart-wrapper" style={{ position: 'relative', height: '280px', width: '100%'}}> {/* Ajusta altura */}
                            <canvas ref={chartRef}></canvas>
                        </div>
                    </div>
                ) : (
                    <p className="empty-chart-message">No hay gastos registrados para mostrar en el gráfico.</p>
                )}
                
                {/* Opcional: Lista detallada de gastos por categoría si el gráfico no es suficiente */}
                {/* <div className="expenses-by-category-list">
                    <h4>Detalle por Categoría:</h4>
                    {Object.entries(expensesByCategory).map(([categoryName, data]) => (
                        <div key={categoryName} className="category-expense-item">
                            <i className={data.icon || 'fas fa-tag'} style={{color: data.color, marginRight: '8px'}}></i>
                            {categoryName}: <strong>{formatCurrency(data.total)}</strong>
                        </div>
                    ))}
                </div> */}


                <div className="modal-actions">
                    <button type="button" onClick={onClose} className="btn btn-secondary">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}

export default TripSummaryModal;
