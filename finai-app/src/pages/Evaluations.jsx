/*
Archivo: src/pages/Evaluations.jsx
Propósito: Componente para la página de evaluación y planificación mensual.
*/
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient'; // Importa cliente Supabase
import Chart from 'chart.js/auto'; // Importa Chart.js

// Importa imágenes
import finAiLogo from '../assets/Logo_FinAI_Oficial.png';
import defaultAvatar from '../assets/avatar_predeterminado.png';

/**
 * Formatea un número como moneda en formato español (EUR por defecto).
 * @param {number | string | null | undefined} value El valor numérico a formatear.
 * @param {string} [currency='EUR'] El código de moneda ISO 4217.
 * @returns {string} El valor formateado como moneda o 'N/A' si la entrada no es válida.
 */
const formatCurrency = (value, currency = 'EUR') => {
  const numberValue = Number(value);
  if (isNaN(numberValue) || value === null || value === undefined) {
      return 'N/A';
  }
  try {
      return new Intl.NumberFormat('es-ES', {
          style: 'currency',
          currency: currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
      }).format(numberValue);
  } catch (e) {
      console.error("Error formatting currency:", value, currency, e);
      return `${numberValue.toFixed(2)} ${currency}`;
  }
};

/**
* Formatea una cadena de fecha (YYYY-MM-DD o ISO) a formato DD/MM/YYYY.
* @param {string | null | undefined} dateString La cadena de fecha.
* @returns {string} La fecha formateada o '--/--/----' si no es válida.
*/
const formatDate = (dateString) => {
  if (!dateString) return '--/--/----';
  try {
      const date = new Date(dateString);
      const offset = date.getTimezoneOffset();
      const adjustedDate = new Date(date.getTime() + (offset * 60 * 1000));
      if (isNaN(adjustedDate.getTime())) return '--/--/----';
      const day = String(adjustedDate.getDate()).padStart(2, '0');
      const month = String(adjustedDate.getMonth() + 1).padStart(2, '0');
      const year = adjustedDate.getFullYear();
      return `${day}/${month}/${year}`;
  } catch (e) {
      console.error("Error formateando fecha:", dateString, e);
      return '--/--/----';
  }
};
// --- Fin Funciones de Utilidad ---

function Evaluations() {
    // --- Estado del Componente ---
    const [userId, setUserId] = useState(null);
    const [avatarUrl, setAvatarUrl] = useState(defaultAvatar);
    const [selectedPeriod, setSelectedPeriod] = useState(''); // Formato YYYY-MM
    const [evaluationData, setEvaluationData] = useState(null); // Datos de la evaluación cargada (si existe)
    const [formData, setFormData] = useState({ // Estado para los inputs del formulario
        evalIngreso: '', evalAhorroMes: '', evalFijos: '', evalVariables: '',
        evalColchon: '', evalViajes: '', evalInversion: '', evalExtra: '',
        evalObservaciones: ''
    });
    const [balanceInfo, setBalanceInfo] = useState({ descuadre: 0, isBalanced: true }); // Objeto para info de balance
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState(''); // 'success' o 'error'
    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
    const [confirmationAction, setConfirmationAction] = useState(null);
    const [showScrollTop, setShowScrollTop] = useState(false);

    // Refs para Chart.js
    const chartRef = useRef(null); // Ref para el elemento canvas
    const chartInstance = useRef(null); // Ref para guardar la instancia del gráfico

    const navigate = useNavigate();

    // --- Efectos ---
    // --- Efecto para cargar datos de evaluación cuando cambia el periodo o el userId ---
    useEffect(() => {
        /**
         * Carga los datos de la evaluación para el mes y usuario seleccionados.
         * Actualiza los estados 'evaluationData' y 'formData'.
         */
        const loadEvaluationData = async () => {
            // No ejecutar si falta información esencial
            if (!userId || !selectedPeriod) return;

            console.log(`Cargando evaluación para ${selectedPeriod}...`);
            setIsLoading(true); // Indicar inicio de carga
            setError(null); // Limpiar errores previos
            setMessage(''); // Limpiar mensajes de guardado previos
            setEvaluationData(null); // Limpiar datos de evaluación anteriores
            // Resetear formData al cambiar de mes para evitar mostrar datos viejos brevemente
            setFormData({
                evalIngreso: '', evalAhorroMes: '', evalFijos: '', evalVariables: '',
                evalColchon: '', evalViajes: '', evalInversion: '', evalExtra: '',
                evalObservaciones: ''
            });
            setBalanceInfo({ descuadre: 0, isBalanced: true }); // Resetear balance también


            try {
                // Calcular el rango de fechas para la consulta
                const year = parseInt(selectedPeriod.split('-')[0]);
                const month = parseInt(selectedPeriod.split('-')[1]) - 1; // Mes es 0-indexado
                const firstDayOfMonth = new Date(year, month, 1).toISOString().split('T')[0];
                const lastDayOfMonth = new Date(year, month + 1, 0).toISOString().split('T')[0];

                // Consultar la tabla 'evaluaciones'
                const { data, error: fetchError } = await supabase
                    .from('evaluaciones') // Nombre de tu tabla
                    .select('*') // Seleccionar todas las columnas de la evaluación
                    .eq('user_id', userId) // Filtrar por usuario
                    .gte('evaluation_date', firstDayOfMonth) // Filtrar por fecha >= inicio de mes
                    .lte('evaluation_date', lastDayOfMonth)  // Filtrar por fecha <= fin de mes
                    .maybeSingle(); // Esperar 0 o 1 resultado

                if (fetchError) {
                    throw fetchError; // Lanzar error si la consulta falla
                }

                // Procesar el resultado
                if (data) {
                    // Si se encontraron datos para el periodo
                    console.log("Evaluación encontrada:", data);
                    setEvaluationData(data); // Guardar los datos originales cargados
                    // Poblar el estado del formulario (formData) con los datos cargados
                    // Usar '??' (Nullish Coalescing) para manejar valores null o undefined
                    setFormData({
                        evalIngreso: data.ingreso ?? '',
                        evalAhorroMes: data.ahorro_mes ?? '',
                        evalFijos: data.fijos ?? '',
                        evalVariables: data.variables ?? '',
                        evalColchon: data.colchon ?? '',
                        evalViajes: data.viajes ?? '',
                        evalInversion: data.inversion ?? '',
                        evalExtra: data.extra ?? '',
                        // Para textarea, || '' funciona bien si es null/undefined
                        evalObservaciones: data.observaciones || ''
                    });
                    // El cálculo de balance y la actualización del gráfico se dispararán
                    // automáticamente por el otro useEffect que depende de 'formData'.
                } else {
                    // Si no se encontraron datos para el periodo
                    console.log("No se encontró evaluación para este periodo.");
                    setEvaluationData(null); // Asegurar que evaluationData sea null
                    // El formulario ya se reseteó al inicio de este useEffect
                    // El balance ya se reseteó
                }

            } catch (err) {
                // Manejo de errores durante el fetch
                console.error(`Error cargando evaluación para ${selectedPeriod}:`, err);
                setError(err.message || `Error al cargar datos para ${selectedPeriod}.`);
                setEvaluationData(null); // Limpiar datos en caso de error
                // El formulario y el balance ya se resetearon al inicio
            } finally {
                // Quitar estado de carga al finalizar, haya éxito o error
                setIsLoading(false);
            }
        };

        loadEvaluationData(); // Ejecutar la función de carga

    }, [selectedPeriod, userId, supabase]); // Dependencias: Recargar si cambia el periodo, el usuario o el cliente supabase

    // --- Efecto para calcular balance y actualizar gráfico cuando cambia formData ---
    useEffect(() => {
        // Solo calcular/actualizar si no estamos en la carga inicial de datos del mes
        if (!isLoading) {
            calculateBalance();
            updateChart();
        }
    }, [formData, isLoading, calculateBalance, updateChart]); // Dependencias

    // --- Cálculo de Balance (useCallback para que no se recree innecesariamente) ---
    const calculateBalance = useCallback(() => {
        console.log("Calculando balance...");
        const ingreso = Number(formData.evalIngreso) || 0;
        const ahorro = Number(formData.evalAhorroMes) || 0;
        const fijos = Number(formData.evalFijos) || 0;
        const variables = Number(formData.evalVariables) || 0;
        const colchon = Number(formData.evalColchon) || 0;
        const viajes = Number(formData.evalViajes) || 0;
        const inversion = Number(formData.evalInversion) || 0;
        const extra = Number(formData.evalExtra) || 0; // Puede ser negativo

        const totalSalidasPlanificadas = ahorro + fijos + variables + colchon + viajes + inversion;
        const descuadre = ingreso - totalSalidasPlanificadas - extra;
        // Considerar un pequeño margen de error para el balance exacto
        const isBalanced = Math.abs(descuadre) < 0.01;

        setBalanceInfo({ descuadre: descuadre, isBalanced: isBalanced });
    }, [formData]); // Depende de formData

    // --- Inicialización y Actualización del Gráfico ---
    const updateChart = useCallback(() => {
        console.log("Actualizando gráfico...");
        if (!chartRef.current) {
            console.log("Canvas ref no listo aún.");
            return; // No hacer nada si el canvas no está listo
        }

        const ctx = chartRef.current.getContext('2d');
        if (!ctx) {
             console.error("No se pudo obtener el contexto 2D del canvas.");
             return;
        }

        // Preparar datos para el gráfico Doughnut (Distribución del Gasto/Ahorro)
        const labels = ['Ahorro Mes', 'Fijos', 'Variables', 'Colchón', 'Viajes', 'Inversión', 'Extra'];
        const dataValues = [
            Number(formData.evalAhorroMes) || 0,
            Number(formData.evalFijos) || 0,
            Number(formData.evalVariables) || 0,
            Number(formData.evalColchon) || 0,
            Number(formData.evalViajes) || 0,
            Number(formData.evalInversion) || 0,
            Number(formData.evalExtra) || 0 // Incluir extra
        ];
        // Filtrar valores <= 0 para no mostrarlos en el gráfico (excepto extra si es negativo)
        const filteredLabels = [];
        const filteredData = [];
        const backgroundColors = []; // Colores asociados
        const borderColors = [];

        const colorMap = { // Colores base (puedes personalizarlos)
            'Ahorro Mes': 'rgba(54, 162, 235, 0.8)',  // Azul
            'Fijos': 'rgba(255, 99, 132, 0.8)',   // Rojo
            'Variables': 'rgba(255, 159, 64, 0.8)', // Naranja
            'Colchón': 'rgba(75, 192, 192, 0.8)',  // Turquesa
            'Viajes': 'rgba(153, 102, 255, 0.8)', // Morado
            'Inversión': 'rgba(255, 205, 86, 0.8)', // Amarillo
            'Extra': 'rgba(201, 203, 207, 0.8)'    // Gris (para extra)
        };
         const borderMap = { // Colores borde (más opacos)
            'Ahorro Mes': 'rgba(54, 162, 235, 1)', 'Fijos': 'rgba(255, 99, 132, 1)',
            'Variables': 'rgba(255, 159, 64, 1)', 'Colchón': 'rgba(75, 192, 192, 1)',
            'Viajes': 'rgba(153, 102, 255, 1)', 'Inversión': 'rgba(255, 205, 86, 1)',
            'Extra': 'rgba(201, 203, 207, 1)'
        };

        labels.forEach((label, index) => {
            if (dataValues[index] > 0 || (label === 'Extra' && dataValues[index] !== 0)) { // Mostrar Extra aunque sea negativo
                filteredLabels.push(label);
                filteredData.push(Math.abs(dataValues[index])); // Usar valor absoluto para tamaño del gráfico
                backgroundColors.push(colorMap[label]);
                borderColors.push(borderMap[label]);
            }
        });

        const chartData = {
            labels: filteredLabels,
            datasets: [{
                label: 'Distribución Planificada',
                data: filteredData,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 1
            }]
        };

        // Opciones del gráfico
        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false, // Para controlar tamaño con CSS
            plugins: {
                legend: { position: 'top', },
                tooltip: { callbacks: { label: function(context) { let label = context.label || ''; if (label) { label += ': '; } if (context.parsed !== null) { label += formatCurrency(context.parsed); } return label; } } } // Formatear tooltip
            }
        };

        // Si ya existe una instancia del gráfico, actualízala. Si no, créala.
        if (chartInstance.current) {
            console.log("Actualizando instancia Chart.js existente.");
            chartInstance.current.data = chartData;
            chartInstance.current.options = chartOptions; // Actualizar opciones también por si cambian
            chartInstance.current.update();
        } else {
            console.log("Creando nueva instancia de Chart.js.");
            // Destruir instancia anterior si existiera (por si acaso)
            // if (chartInstance.current) { chartInstance.current.destroy(); }
            chartInstance.current = new Chart(ctx, {
                type: 'doughnut', // Tipo de gráfico
                data: chartData,
                options: chartOptions
            });
        }
    }, [formData]); // Depende de formData

    // Efecto para calcular balance y actualizar gráfico cuando cambia formData
    useEffect(() => {
        calculateBalance();
        updateChart();
    }, [formData, calculateBalance, updateChart]); // Dependencias


    // --- Manejadores de Eventos ---
    const handlePeriodChange = (event) => {
        setSelectedPeriod(event.target.value);
    };

    const handleInputChange = (event) => {
        const { id, value, type } = event.target;
        // Usar id como clave (ej: evalIngreso)
        setFormData(prevData => ({
            ...prevData,
            [id]: type === 'number' ? (value === '' ? '' : value) : value // Mantener string para inputs number vacíos
        }));
         if (message) setMessage(''); // Limpiar mensaje al editar
    };

    // Submit Formulario Evaluación
    const handleEvaluationSubmit = useCallback(async (event) => {
        event.preventDefault();
        if (!userId || !selectedPeriod) return;

        // Validar que al menos el ingreso esté informado? Opcional.
        if (!formData.evalIngreso) {
            setMessage('Al menos el Ingreso Planificado debería ser informado.');
            setMessageType('error');
            return;
        }

        setIsSaving(true);
        setMessage('');
        setMessageType('');

        try {
            const year = parseInt(selectedPeriod.split('-')[0]);
            const month = parseInt(selectedPeriod.split('-')[1]) - 1;
            // Usar el primer día del mes como fecha representativa
            const evaluation_date = new Date(year, month, 1).toISOString().split('T')[0];

            const dataToSave = {
                user_id: userId,
                evaluation_date: evaluation_date,
                ingreso: Number(formData.evalIngreso) || 0,
                ahorro_mes: Number(formData.evalAhorroMes) || 0,
                fijos: Number(formData.evalFijos) || 0,
                variables: Number(formData.evalVariables) || 0,
                colchon: Number(formData.evalColchon) || 0,
                viajes: Number(formData.evalViajes) || 0,
                inversion: Number(formData.evalInversion) || 0,
                extra: Number(formData.evalExtra) || 0,
                observaciones: formData.evalObservaciones.trim() || null,
            };

            let error;
            if (evaluationData?.id) {
                // UPDATE
                console.log("Actualizando evaluación:", dataToSave);
                const { error: updateError } = await supabase
                    .from('evaluaciones')
                    .update(dataToSave)
                    .eq('id', evaluationData.id)
                    .eq('user_id', userId);
                error = updateError;
            } else {
                // INSERT
                console.log("Insertando evaluación:", dataToSave);
                const { error: insertError } = await supabase
                    .from('evaluaciones')
                    .insert([dataToSave]);
                error = insertError;
            }

            if (error) throw error;

            setMessage('Evaluación guardada correctamente.');
            setMessageType('success');
            // Opcional: Recargar datos para asegurar consistencia (aunque ya actualizamos formData)
            loadEvaluationData();

        } catch (err) {
            console.error("Error guardando evaluación:", err);
            setMessage(`Error al guardar: ${err.message}`);
            setMessageType('error');
        } finally {
            setIsSaving(false);
        }
    }, [userId, selectedPeriod, formData, evaluationData, supabase]); // Dependencias

    // --- Manejadores Modal Confirmación ---

    /**
     * Abre el modal de confirmación genérico.
     * Guarda la función que se ejecutará si el usuario confirma.
     * @param {Function} action La función a ejecutar al confirmar.
     */
    const handleOpenConfirmationModal = useCallback((action) => {
      // Guarda la función de callback que se pasará al botón de confirmar del modal
      setConfirmationAction(() => action);
      // Abre el modal de confirmación
      setIsConfirmationModalOpen(true);
      console.log("Modal de confirmación abierto."); // Log para depuración
    }, []); // No tiene dependencias externas directas, solo llama a setters de estado

    /**
     * Cierra el modal de confirmación genérico.
     */
    const handleCloseConfirmationModal = useCallback(() => {
        setIsConfirmationModalOpen(false);
        // Opcional: Limpiar la acción guardada al cerrar
        setConfirmationAction(null);
    }, []);

    /**
     * Ejecuta la acción guardada cuando el usuario confirma en el modal
     * y luego cierra el modal.
     */
    const handleConfirmAction = useCallback(() => {
        // Verifica si hay una acción guardada y si es una función
        if (typeof confirmationAction === 'function') {
            console.log("Ejecutando acción confirmada...");
            confirmationAction(); // Ejecuta la acción (ej. la función de logout)
        } else {
            console.warn("Se intentó confirmar pero no había acción válida guardada.");
        }
        // Cierra el modal después de ejecutar la acción (o aunque no hubiera acción)
        handleCloseConfirmationModal();
    }, [confirmationAction, handleCloseConfirmationModal]);

    // Otros manejadores
    const handleLogout = useCallback(() => console.log('Logout pendiente'), []);
    const handleBack = useCallback(() => navigate(-1), [navigate]);
    const scrollToTop = useCallback(() => window.scrollTo({ top: 0, behavior: 'smooth' }), []);

    // --- Renderizado ---
    // ... (JSX completo como en la respuesta anterior, usando estados y manejadores) ...
    // Asegúrate de pasar la ref `chartRef` al elemento <canvas>
    return (
        <div style={{ display: 'flex' }}>
            {/* Sidebar */}
            <aside className="sidebar">
                 <div className="sidebar-logo"> <img src={finAiLogo} alt="FinAi Logo Small" /> </div>
                 <nav className="sidebar-nav">
                     <Link to="/dashboard" className="nav-button" title="Dashboard"><i className="fas fa-home"></i> <span>Dashboard</span></Link>
                     <Link to="/accounts" className="nav-button" title="Cuentas"><i className="fas fa-wallet"></i> <span>Cuentas</span></Link>
                     <Link to="/budgets" className="nav-button" title="Presupuestos"><i className="fas fa-chart-pie"></i> <span>Presupuestos</span></Link>
                     <Link to="/categories" className="nav-button" title="Categorías"><i className="fas fa-tags"></i> <span>Categorías</span></Link>
                     <Link to="/transactions" className="nav-button" title="Transacciones"><i className="fas fa-exchange-alt"></i> <span>Transacciones</span></Link>
                     <Link to="/trips" className="nav-button" title="Viajes"><i className="fas fa-suitcase-rolling"></i> <span>Viajes</span></Link>
                     <Link to="/evaluations" className="nav-button active" title="Evaluación"><i className="fas fa-balance-scale"></i> <span>Evaluación</span></Link> {/* Active */}
                     <Link to="/reports" className="nav-button" title="Informes"><i className="fas fa-chart-bar"></i> <span>Informes</span></Link>
                     <Link to="/profile" className="nav-button" title="Perfil"><i className="fas fa-user-circle"></i> <span>Perfil</span></Link>
                     <Link to="/settings" className="nav-button" title="Configuración"><i className="fas fa-cog"></i> <span>Configuración</span></Link>
                     <Link to="/debts" className="nav-button" title="Deudas"><i className="fas fa-credit-card"></i> <span>Deudas</span></Link>
                     <Link to="/loans" className="nav-button" title="Préstamos"><i className="fas fa-hand-holding-usd"></i> <span>Préstamos</span></Link>
                     <Link to="/fixed-expenses" className="nav-button" title="Gastos Fijos"><i className="fas fa-receipt"></i> <span>Gastos Fijos</span></Link>
                     <Link to="/goals" className="nav-button" title="Metas"><i className="fas fa-bullseye"></i> <span>Metas</span></Link>
                 </nav>
                 <button className="nav-button logout-button" onClick={handleLogout} title="Cerrar Sesión"><i className="fas fa-sign-out-alt"></i> <span>Salir</span></button>
            </aside>

            {/* Contenido Principal */}
            <div className="page-container">
                {/* Cabecera */}
                <div className="page-header evaluations-header">
                    <button onClick={handleBack} id="backButton" className="btn-icon" aria-label="Volver"><i className="fas fa-arrow-left"></i></button>
                    <div className="header-title-group"> <img id="userAvatarHeader" src={avatarUrl} alt="Avatar" className="header-avatar-small" /> <h1>Evaluación Mensual</h1> </div>
                    <div style={{ width: '40px' }}></div>
                </div>

                {/* Selector Periodo */}
                <div className="period-selector-container">
                    <label htmlFor="periodSelector">Selecciona el Mes:</label>
                    <input type="month" id="periodSelector" name="period" value={selectedPeriod} onChange={handlePeriodChange} disabled={isLoading || isSaving}/>
                </div>

                {/* Contenedor Evaluación */}
                {isLoading && ( <div id="loadingMessage" style={{ textAlign: 'center', padding: '30px', color: '#666' }}>Cargando evaluación...</div> )}
                {error && !isLoading && ( <div style={{ textAlign: 'center', padding: '30px', color: 'red' }}>{error}</div> )}
                {!isLoading && !error && !evaluationData && (
                    <div id="noEvaluationMessage" className="empty-list-message">
                        <p>Aún no has creado una evaluación para este mes.</p>
                        <p>¡Rellena los campos y guarda tu plan!</p>
                        {/* Mostrar formulario vacío para crearla */}
                    </div>
                )}

                {/* Mostrar formulario si no está cargando (haya datos o no) */}
                {!isLoading && !error && (
                    <div id="evaluationContainer" className="settings-card evaluation-card">
                        <h2 id="evaluationPeriodTitle">Plan para {selectedPeriod ? new Date(selectedPeriod + '-02').toLocaleDateString('es-ES', { month: 'long', year: 'numeric'}) : 'Mes Seleccionado'}</h2>
                        <form id="evaluationForm" onSubmit={handleEvaluationSubmit}>
                            <input type="hidden" id="evaluationId" value={evaluationData?.id || ''} readOnly />
                            <div className="evaluation-grid">
                                {/* Columna 1 */}
                                <div className="evaluation-column">
                                    <div className="input-group"> <label htmlFor="evalIngreso"><i className="fas fa-arrow-down icon-green"></i> Ingreso</label> <input type="number" id="evalIngreso" placeholder="0.00" step="any" min="0" value={formData.evalIngreso} onChange={handleInputChange} disabled={isSaving}/> </div>
                                    <div className="input-group"> <label htmlFor="evalAhorroMes"><i className="fas fa-piggy-bank icon-blue"></i> Ahorro Mes</label> <input type="number" id="evalAhorroMes" placeholder="0.00" step="any" min="0" value={formData.evalAhorroMes} onChange={handleInputChange} disabled={isSaving}/> </div>
                                    <div className="input-group"> <label htmlFor="evalFijos"><i className="fas fa-receipt icon-red"></i> Fijos</label> <input type="number" id="evalFijos" placeholder="0.00" step="any" min="0" value={formData.evalFijos} onChange={handleInputChange} disabled={isSaving}/> </div>
                                    <div className="input-group"> <label htmlFor="evalVariables"><i className="fas fa-shopping-cart icon-orange"></i> Variables</label> <input type="number" id="evalVariables" placeholder="0.00" step="any" min="0" value={formData.evalVariables} onChange={handleInputChange} disabled={isSaving}/> </div>
                                </div>
                                {/* Columna 2 */}
                                <div className="evaluation-column">
                                    <div className="input-group"> <label htmlFor="evalColchon"><i className="fas fa-shield-alt icon-blue-dark"></i> Colchón</label> <input type="number" id="evalColchon" placeholder="0.00" step="any" min="0" value={formData.evalColchon} onChange={handleInputChange} disabled={isSaving}/> </div>
                                    <div className="input-group"> <label htmlFor="evalViajes"><i className="fas fa-plane icon-lightblue"></i> Viajes</label> <input type="number" id="evalViajes" placeholder="0.00" step="any" min="0" value={formData.evalViajes} onChange={handleInputChange} disabled={isSaving}/> </div>
                                    <div className="input-group"> <label htmlFor="evalInversion"><i className="fas fa-chart-line icon-purple"></i> Inversión</label> <input type="number" id="evalInversion" placeholder="0.00" step="any" min="0" value={formData.evalInversion} onChange={handleInputChange} disabled={isSaving}/> </div>
                                    <div className="input-group"> <label htmlFor="evalExtra"><i className="fas fa-plus-circle icon-green"></i> Extra</label> <input type="number" id="evalExtra" placeholder="0.00" step="any" value={formData.evalExtra} onChange={handleInputChange} disabled={isSaving}/> </div>
                                </div>
                            </div>

                            {/* Balance Checks */}
                            <div className="balance-checks">
                                <div id="mainBalance" className={`balance-item ${!balanceInfo.isBalanced ? 'unbalanced' : ''}`}>
                                    Descuadre: <span>{formatCurrency(balanceInfo.descuadre)}</span>
                                </div>
                            </div>

                            {/* Chart Area */}
                            <div id="chartArea" className="chart-area">
                                <div className="chart-container" style={{ position: 'relative', height: '250px', width:'100%'}}> {/* Controlar tamaño */}
                                    <h3>Distribución Planificada</h3>
                                    <canvas id="allocationChart" ref={chartRef}></canvas>
                                </div>
                            </div>

                            {/* Observaciones */}
                            <div className="input-group notes-area">
                                <label htmlFor="evalObservaciones"><i className="fas fa-pen icon-gray"></i> Observaciones</label>
                                <textarea id="evalObservaciones" rows={3} placeholder="Anotaciones sobre la planificación..." value={formData.evalObservaciones} onChange={handleInputChange} disabled={isSaving}></textarea>
                            </div>

                            {/* Mensaje y Botón Guardar */}
                            {message && ( <p id="evaluationMessage" className={`message ${messageType === 'error' ? 'error-message' : 'success-message'}`}> {message} </p> )}
                            <div className="action-section">
                                <button type="submit" id="saveEvaluationBtn" className="btn btn-primary btn-save" disabled={isSaving || isLoading}>
                                    <i className="fas fa-save"></i> {isSaving ? 'Guardando...' : 'Guardar Evaluación'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                 {/* --- Modal de Confirmación (si se usa) --- */}
                 {isConfirmationModalOpen && (
                // El overlay oscuro que cubre la pantalla
                <div
                    id="confirmationModal"
                    // Aplicar clases CSS para estilo y animación (ej. 'active' para fade-in)
                    // Usar display: flex para centrar el contenido vertical y horizontalmente
                    className="modal-overlay small active"
                    style={{ display: 'flex' }}
                    // Opcional: Cerrar el modal si se hace clic en el overlay (fuera del contenido)
                    onClick={(e) => { if (e.target === e.currentTarget) handleCloseConfirmationModal(); }}
                >
                    {/* El contenedor del contenido del modal */}
                    <div className="modal-content confirmation-modal-content">
                        {/* Título del modal */}
                        <h2 id="confirmationModalTitle">
                            <i className="fas fa-question-circle"></i> Confirmación
                        </h2>
                        {/* Mensaje de confirmación (podría hacerse dinámico con otro estado) */}
                        <p id="confirmationModalMessage" className="modal-instructions" style={{ textAlign: 'center', margin: '25px 0', lineHeight: '1.6' }}>
                            ¿Estás seguro de que quieres realizar esta acción?
                            {/* Ejemplo de cómo podría ser dinámico: */}
                            {/* {confirmationMessage || '¿Estás seguro?'} */}
                        </p>
                        {/* Contenedor para los botones de acción */}
                        <div className="modal-actions">
                            {/* Botón Cancelar: Llama a la función para cerrar el modal */}
                            <button
                                type="button"
                                onClick={handleCloseConfirmationModal}
                                id="confirmationModalCancelBtn"
                                className="btn btn-secondary" // Estilo secundario
                            >
                                Cancelar
                            </button>
                            {/* Botón Confirmar: Llama a la función que ejecuta la acción guardada */}
                            <button
                                type="button"
                                onClick={handleConfirmAction}
                                id="confirmationModalConfirmBtn"
                                // Podría tener una clase diferente si la acción es peligrosa (ej. btn-danger)
                                className="btn btn-primary"
                            >
                                Confirmar
                            </button>
                        </div>
                        {/* Espacio opcional para mostrar errores específicos del modal de confirmación */}
                        {/* <p id="modalConfirmError" className="error-message" style={{ display: 'none' }}></p> */}
                    </div>
                  </div>
                )} {/* Fin del renderizado condicional del modal */}

                {/* --- Botón Scroll-Top --- */}
                {showScrollTop && ( <button onClick={scrollToTop} id="scrollTopBtn" className="scroll-top-btn orange-btn visible" title="Volver arriba"> <i className="fas fa-arrow-up"></i> </button> )}
            </div> {/* Fin page-container */}
        </div> // Fin contenedor flex principal
    );}
export default Evaluations;

