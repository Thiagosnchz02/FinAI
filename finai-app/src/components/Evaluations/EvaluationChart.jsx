import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { formatCurrency } from '../../utils/formatters.js'; // Importar para tooltips

function EvaluationChart({ chartData }) { // Recibe los datos ya preparados
  const chartRef = useRef(null); // Ref para el canvas
  const chartInstance = useRef(null); // Ref para la instancia de Chart.js

  useEffect(() => {
    if (!chartRef.current || !chartData || !chartData.labels || !chartData.datasets) { // Chequeo más robusto
      console.log("EvaluationChart: No hay canvas o datos completos para renderizar/actualizar.");
      return;
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    // --> AÑADE ESTE LOG AQUÍ <--
    console.log("EvaluationChart useEffect: chartData.dataRaw ANTES de crear Chart:", chartData.dataRaw);
    console.log("EvaluationChart useEffect: chartData.datasets[0].data ANTES de crear Chart:", chartData.datasets[0]?.data);

    // Opciones del gráfico (puedes personalizarlas más)
    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            label: function(context) {
              // --- Logs para depurar el contexto del tooltip ---
              console.log("Tooltip Callback - context.dataset:", context.dataset);
              if (context.dataset) {
                  console.log("Tooltip Callback - context.dataset.dataRaw:", context.dataset.dataRaw);
              }
              console.log("Tooltip Callback - context.dataIndex:", context.dataIndex);
              // --- Fin de Logs ---
          
              let label = context.label || '';
              if (label) { label += ': '; }
          
              // Código defensivo para acceder a dataRaw
              if (context.dataset && Array.isArray(context.dataset.dataRaw) && 
                  typeof context.dataIndex !== 'undefined' && 
                  context.dataIndex >= 0 && context.dataIndex < context.dataset.dataRaw.length) {
          
                  const rawValue = context.dataset.dataRaw[context.dataIndex];
                  label += formatCurrency(rawValue);
              } else {
                  // Si dataRaw no está disponible o el índice no es válido, usa un valor por defecto
                  console.warn("Tooltip: dataRaw no accesible como se esperaba. Usando valor parseado.");
                  if (context.formattedValue) {
                      label += context.formattedValue; // Valor formateado por defecto de Chart.js
                  } else if (context.parsed && typeof context.parsed.y !== 'undefined') {
                      // Chart.js parsea el valor principal del dato como 'y' para doughnut/pie
                      label += formatCurrency(context.parsed.y);
                  }
                  // Si no, la etiqueta solo contendrá el nombre de la sección (ej. "Ahorro Mes: ")
              }
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
      data: {
        labels: chartData.labels, // Esto ya estaba bien
        datasets: [{
          label: 'Distribución Planificada',
          data: chartData.datasets[0].data,                 // <--- CORREGIDO
          backgroundColor: chartData.datasets[0].backgroundColor, // <--- CORREGIDO
          borderColor: chartData.datasets[0].borderColor,   // <--- CORREGIDO
          borderWidth: 1,
          dataRaw: chartData.dataRaw // Esto ya estaba bien (para el tooltip)
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