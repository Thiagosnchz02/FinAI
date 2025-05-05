import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { formatCurrency } from '../../utils/formatters.js'; // Importar para tooltips

function EvaluationChart({ chartData }) { // Recibe los datos ya preparados
  const chartRef = useRef(null); // Ref para el canvas
  const chartInstance = useRef(null); // Ref para la instancia de Chart.js

  useEffect(() => {
    if (!chartRef.current || !chartData) return; // Salir si no hay canvas o datos

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    // Opciones del gráfico (puedes personalizarlas más)
    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            label: function(context) {
              let label = context.label || '';
              if (label) { label += ': '; }
              // Usamos el valor raw para formatear, ya que context.parsed puede ser el absoluto
              const rawValue = chartData.datasets[0].dataRaw[context.dataIndex] || 0;
              label += formatCurrency(rawValue); // Formatear con la función util
              return label;
            }
          }
        }
      }
    };

    // Destruir instancia anterior antes de crear una nueva
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // Crear nueva instancia del gráfico
    chartInstance.current = new Chart(ctx, {
      type: 'doughnut',
      data: { // Usar los datos preparados pasados por props
        labels: chartData.labels,
        datasets: [{
          label: 'Distribución Planificada',
          data: chartData.data, // Valores absolutos para tamaño
          backgroundColor: chartData.backgroundColors,
          borderColor: chartData.borderColors,
          borderWidth: 1,
          // Guardar valores originales para tooltip
          dataRaw: chartData.dataRaw
        }]
      },
      options: chartOptions
    });

    // Función de limpieza para destruir el gráfico al desmontar
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };

  }, [chartData]); // Redibujar si cambian los datos

  return (
    <div className="chart-container" style={{ position: 'relative', height: '250px', width: '100%' }}>
      <h3>Distribución Planificada</h3>
      <canvas ref={chartRef}></canvas> {/* El canvas donde se dibuja */}
    </div>
  );
}

export default EvaluationChart;