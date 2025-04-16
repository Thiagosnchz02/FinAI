// Evaluaciones.js
// ASEGÚRATE que supabase-init.js y auth-listener.js se cargaron antes

console.log('DEBUG: Evaluaciones.js - Cargado');

if (typeof supabase === 'undefined' || supabase === null) {
    console.error('Evaluaciones.js: ¡Error Crítico! Cliente Supabase no inicializado.');
} else {
    console.log('Evaluaciones.js: Cliente Supabase encontrado.');

    // --- Selección de Elementos DOM ---
    const backButton = document.getElementById('backButton');
    const userAvatarSmall = document.getElementById('userAvatarSmall');
    const periodSelector = document.getElementById('periodSelector');
    const evaluationContainer = document.getElementById('evaluationContainer');
    const evaluationPeriodTitle = document.getElementById('evaluationPeriodTitle');
    const evaluationForm = document.getElementById('evaluationForm');
    const evaluationIdInput = document.getElementById('evaluationId');
    // Inputs
    const evalIngresoInput = document.getElementById('evalIngreso');
    const evalAhorroMesInput = document.getElementById('evalAhorroMes');
    const evalFijosInput = document.getElementById('evalFijos');
    const evalVariablesInput = document.getElementById('evalVariables');
    const evalColchonInput = document.getElementById('evalColchon');
    const evalViajesInput = document.getElementById('evalViajes');
    const evalInversionInput = document.getElementById('evalInversion');
    const evalExtraInput = document.getElementById('evalExtra');
    // Balance Display
    const mainBalanceEl = document.getElementById('mainBalance')?.querySelector('span');
    const savingsBalanceEl = document.getElementById('savingsBalance')?.querySelector('span');
    // Charts
    const allocationChartCanvas = document.getElementById('allocationChart');
    const savingsChartCanvas = document.getElementById('savingsChart');
    // Notes & Save
    const evalObservacionesInput = document.getElementById('evalObservaciones');
    const saveEvaluationBtn = document.getElementById('saveEvaluationBtn');
    const evaluationMessage = document.getElementById('evaluationMessage');
    // Loading/Empty Messages
    const loadingMessage = document.getElementById('loadingMessage');
    const noEvaluationMessage = document.getElementById('noEvaluationMessage');
    // ScrollTop
    const scrollTopBtn = document.getElementById('scrollTopBtn');
    const confirmationModal = document.getElementById('confirmationModal');
    const confirmationModalTitle = document.getElementById('confirmationModalTitle');
    const confirmationModalMessage = document.getElementById('confirmationModalMessage');
    const confirmationModalCancelBtn = document.getElementById('confirmationModalCancelBtn');
    const confirmationModalConfirmBtn = document.getElementById('confirmationModalConfirmBtn');

    // --- Variables de Estado ---
    let currentUserId = null;
    let currentUser = null;
    let isLoading = false;
    let selectedPeriod = ''; // Formato YYYY-MM
    let currentEvaluationData = null; // Datos de la evaluación cargada {id: ..., ingreso: ..., etc}
    let allocationChartInstance = null;
    let savingsChartInstance = null;
    let confirmActionCallback = null; // Guarda la acción a realizar si se confirma

    // --- Constantes ---
    const defaultAvatarPath = 'https://finai.es/images/avatar_predeterminado.png';

    // --- Funciones Auxiliares ---
    function formatCurrency(value, currency = 'EUR') {
        if (isNaN(value) || value === null) return '€0.00'; // Devuelve 0 si no es válido
        try {
            return new Intl.NumberFormat('es-ES', { style: 'currency', currency: currency, minimumFractionDigits: 2 }).format(value);
        } catch (e) {
             console.error("Error formatting currency:", value, currency, e);
             return `${Number(value).toFixed(2)} ${currency}`;
        }
    }
    function getMonthName(monthIndex) {
        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        // Asegurarse de que el índice está en el rango correcto
        if (monthIndex >= 0 && monthIndex < 12) {
            return monthNames[monthIndex];
        }
        return ''; // Devolver vacío si el índice no es válido
    }

    // --- Funciones Principales ---

    function toggleConfirmationModal(show) {
        if (!confirmationModal) return;
        if (show) { confirmationModal.style.display = 'flex'; setTimeout(() => confirmationModal.classList.add('active'), 10); }
        else { confirmationModal.classList.remove('active'); setTimeout(() => { confirmationModal.style.display = 'none'; confirmActionCallback = null; }, 300); }
    }

    function openConfirmationModal(title, message, onConfirm) {
        if (!confirmationModalTitle || !confirmationModalMessage || !confirmationModalConfirmBtn) { console.error("Elementos modal confirmación no encontrados"); return;}
        confirmationModalTitle.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${title}`; // Icono de advertencia
        confirmationModalMessage.textContent = message;
        confirmActionCallback = onConfirm; // Guardar la acción a ejecutar si confirman
        // Ajustar texto botones si es necesario (opcional)
        // confirmationModalCancelBtn.textContent = 'No, Cancelar';
        // confirmationModalConfirmBtn.textContent = 'Sí, Guardar';
        toggleConfirmationModal(true);
    }

    function closeConfirmationModal() {
        toggleConfirmationModal(false);
    }

    function setLoadingState(loading) {
        isLoading = loading;
        saveEvaluationBtn.disabled = loading;
        // Deshabilitar inputs del form si está cargando?
        const inputs = evaluationForm.querySelectorAll('input, textarea, select');
        inputs.forEach(input => input.disabled = loading);
        console.log(`Loading state: ${loading}`);
    }

    /** Muestra mensajes de feedback */
     function showMessage(type, text) {
        if (evaluationMessage) { evaluationMessage.textContent = text; evaluationMessage.className = `message ${type}`; evaluationMessage.style.display = 'block'; setTimeout(hideMessage, 4000); }
     }
     function hideMessage() { if (evaluationMessage) evaluationMessage.style.display = 'none'; }

     /** Lee los valores actuales de los inputs y calcula balances */
     function calculateAndDisplayBalances() {
        if (!mainBalanceEl) { console.error("Elemento #mainBalance no encontrado"); return; }

        // Leer valores
        const ingreso = parseFloat(evalIngresoInput.value) || 0;
        const ahorroMes = parseFloat(evalAhorroMesInput.value) || 0; // Tratar como una salida más
        const fijos = parseFloat(evalFijosInput.value) || 0;
        const variables = parseFloat(evalVariablesInput.value) || 0;
        const colchon = parseFloat(evalColchonInput.value) || 0;
        const viajes = parseFloat(evalViajesInput.value) || 0;
        const inversion = parseFloat(evalInversionInput.value) || 0;
        const extra = parseFloat(evalExtraInput.value) || 0;

        // Calcular Balance ÚNICO
        const totalIn = ingreso + extra;
        // Sumar TODAS las salidas planificadas
        const totalOut = fijos + variables + ahorroMes + colchon + viajes + inversion;
        const mainDiff = totalIn - totalOut;

        // Actualizar UI del Descuadre
        mainBalanceEl.textContent = formatCurrency(mainDiff);
        mainBalanceEl.className = Math.abs(mainDiff) < 0.01 ? 'balanced' : 'unbalanced';

        // Eliminar lógica del Ahorro Descuadrado
        if (savingsBalanceEl) savingsBalanceEl.parentElement.style.display = 'none'; // Ocultar elemento

        // Actualizar el único gráfico
        updateCharts(fijos, variables, ahorroMes, colchon, viajes, inversion);
    }

     /** Inicializa o actualiza los gráficos Chart.js */
     function updateCharts(fijos, variables, ahorroMes, colchon, viajes, inversion) {
        // Asegurarse que existe el canvas del primer gráfico y Chart.js
       if (!allocationChartCanvas || typeof Chart === 'undefined') return;
        // Destruir instancia del segundo gráfico si existiera
        if (savingsChartInstance) { savingsChartInstance.destroy(); savingsChartInstance = null; }
        // Ocultar contenedor del segundo gráfico (si no se elimina del HTML)
        const savingsChartContainer = document.getElementById('savingsChart')?.parentElement;
        if (savingsChartContainer) savingsChartContainer.style.display = 'none';


       // Datos para el gráfico de distribución general
       const allocationData = {
           labels: ['Fijos', 'Variables', 'Ahorro Mes', 'Colchón', 'Viajes', 'Inversión'],
           datasets: [{
               data: [ // Usar Math.max para evitar negativos en gráfico
                   Math.max(0, fijos),
                   Math.max(0, variables),
                   Math.max(0, ahorroMes),
                   Math.max(0, colchon),
                   Math.max(0, viajes),
                   Math.max(0, inversion)
                  ],
               backgroundColor: [ // Ajustar colores
                   '#f56565', // Rojo (Fijos)
                   '#f6ad55', // Naranja (Variables)
                   '#8a82d5', // Morado (Ahorro Mes)
                   '#4299e1', // Azul Oscuro (Colchón)
                   '#81e6d9', // Turquesa (Viajes)
                   '#9f7aea'  // Morado Claro (Inversión)
               ],
               borderColor: '#ffffff', borderWidth: 2
           }]
       };

       // Opciones comunes
       const chartOptions = {
          responsive: true, maintainAspectRatio: false, cutout: '60%',
          plugins: {
              legend: { display: true, position: 'bottom', labels:{ padding: 15, boxWidth: 12, font: { size: 11 } } }, // Leyenda más pequeña
              tooltip: {
                   callbacks: { // Mostrar porcentaje en tooltip
                       label: function(context) {
                           let label = context.label || '';
                           if (label) { label += ': '; }
                           if (context.parsed !== null) {
                               // Calcular porcentaje del total (suma de todos los datos del dataset)
                               const total = context.dataset.data.reduce((a, b) => a + b, 0);
                               const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) + '%' : '0.0%';
                               label += `${formatCurrency(context.parsed)} (${percentage})`;
                           }
                           return label;
                       }
                   }
              }
           }
       };

       // Crear o Actualizar Gráfico Único (Allocation)
       if (allocationChartInstance) { // Si ya existe, actualizar datos
            allocationChartInstance.data = allocationData;
            allocationChartInstance.update();
       } else { // Si no existe, crearlo
           allocationChartInstance = new Chart(allocationChartCanvas, { type: 'doughnut', data: allocationData, options: chartOptions });
       }
   }


    /** Carga la evaluación para un periodo específico (YYYY-MM) */
    async function loadEvaluationData(period) {
        if (!currentUserId || !period) return;
        console.log(`Cargando evaluación para ${period}`);
        setLoadingState(true);
        evaluationContainer.style.display = 'none';
        noEvaluationMessage.style.display = 'none';
        loadingMessage.style.display = 'block';
        currentEvaluationData = null; // Resetear datos
        if (evaluationForm) evaluationForm.reset(); // Limpiar formulario

        // Formatear título
        try {
            const [year, month] = period.split('-');
            const dateTitle = new Date(year, parseInt(month) - 1, 1);
            evaluationPeriodTitle.textContent = `Plan para ${dateTitle.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`;
        } catch { evaluationPeriodTitle.textContent = `Plan para ${period}`; }


        try {
            // Buscar la evaluación para ese mes (asumimos que evaluation_date es YYYY-MM-DD)
            // Necesitamos buscar por mes/año. Creamos fecha inicio/fin.
            const year = parseInt(period.split('-')[0]);
            const month = parseInt(period.split('-')[1]) - 1;
            const startDate = new Date(year, month, 1).toISOString().split('T')[0];
            // Asumimos que solo hay una evaluación por mes, buscamos por fecha inicio
            const { data, error } = await supabase
                .from('evaluaciones')
                .select('*')
                .eq('user_id', currentUserId)
                .eq('evaluation_date', startDate) // Buscar por el primer día del mes
                .maybeSingle();

            if (error) throw error;

            currentEvaluationData = data; // Guardar datos (o null si no existe)

            if (currentEvaluationData) {
                 console.log("Evaluación encontrada:", currentEvaluationData);
                 // Rellenar formulario
                 evaluationIdInput.value = currentEvaluationData.id;
                 evalIngresoInput.value = currentEvaluationData.ingreso || '';
                 evalAhorroMesInput.value = currentEvaluationData.ahorro_mes || '';
                 evalFijosInput.value = currentEvaluationData.fijos || '';
                 evalVariablesInput.value = currentEvaluationData.variables || '';
                 evalColchonInput.value = currentEvaluationData.colchon || '';
                 evalViajesInput.value = currentEvaluationData.viajes || '';
                 evalInversionInput.value = currentEvaluationData.inversion || '';
                 evalExtraInput.value = currentEvaluationData.extra || '';
                 evalObservacionesInput.value = currentEvaluationData.observaciones || '';
                 evaluationContainer.style.display = 'block'; // Mostrar contenedor principal
                 noEvaluationMessage.style.display = 'none';
            } else {
                 console.log(`No se encontró evaluación para ${period}. Mostrando formulario vacío.`);
                 evaluationIdInput.value = ''; // Asegurar ID vacío
                 // Mantener formulario vacío (ya reseteado)
                 evaluationContainer.style.display = 'block'; // Mostrar contenedor principal
                 noEvaluationMessage.style.display = 'block'; // Mostrar mensaje de no existente
            }

            // Calcular balances y actualizar gráficos iniciales
             calculateAndDisplayBalances();

        } catch (error) {
             console.error("Error cargando evaluación:", error);
             showMessage('error', `Error al cargar la evaluación: ${error.message}`);
             evaluationContainer.style.display = 'none'; // Ocultar si hay error
             noEvaluationMessage.style.display = 'none';
        } finally {
             loadingMessage.style.display = 'none';
             setLoadingState(false);
        }
    }

    /** Maneja el cambio en el selector de periodo */
    function handlePeriodChange() {
        const newPeriod = periodSelector.value;
        if (newPeriod && newPeriod !== selectedPeriod) {
             selectedPeriod = newPeriod;
             loadEvaluationData(selectedPeriod);
        }
    }

    /** Guarda o actualiza la evaluación actual */
    async function handleSaveEvaluation(event) {
        event.preventDefault();
        if (isLoading || !currentUserId || !selectedPeriod) return;

        // Recalcular valores justo antes de guardar
        const ingreso = parseFloat(evalIngresoInput.value) || 0;
        const ahorroMes = parseFloat(evalAhorroMesInput.value) || 0;
        const fijos = parseFloat(evalFijosInput.value) || 0;
        const variables = parseFloat(evalVariablesInput.value) || 0;
        const colchon = parseFloat(evalColchonInput.value) || 0;
        const viajes = parseFloat(evalViajesInput.value) || 0;
        const inversion = parseFloat(evalInversionInput.value) || 0;
        const extra = parseFloat(evalExtraInput.value) || 0;

        // Calcular Balance ÚNICO
        const totalIn = ingreso + extra;
        const totalOut = fijos + variables + ahorroMes + colchon + viajes + inversion;
        const mainDiff = totalIn - totalOut; // Diferencia exacta

        // Función interna que contiene la lógica REAL de guardado
        const proceedWithSave = async () => {
            console.log("Proceeding with save...");
            setLoadingState(true);
            hideMessage();
            const evaluationId = evaluationIdInput.value;
            const isEditing = !!evaluationId;

            const year = parseInt(selectedPeriod.split('-')[0]);
            const month = parseInt(selectedPeriod.split('-')[1]) - 1;
            const evaluationDate = new Date(year, month, 1).toISOString().split('T')[0];

            // Preparar datos (excluir campos nulos/inválidos si es necesario)
            const evaluationRecord = {
                user_id: currentUserId, evaluation_date: evaluationDate,
                ingreso: isNaN(ingreso)? null : ingreso,
                ahorro_mes: isNaN(ahorroMes)? null : ahorroMes,
                fijos: isNaN(fijos)? null : fijos,
                variables: isNaN(variables)? null : variables,
                colchon: isNaN(colchon)? null : colchon,
                viajes: isNaN(viajes)? null : viajes,
                inversion: isNaN(inversion)? null : inversion,
                extra: isNaN(extra)? null : extra,
                observaciones: evalObservacionesInput.value.trim() || null,
                updated_at: new Date()
            };
             // Quitar user_id si es un update (manejado por RLS y eq)
             if(isEditing) delete evaluationRecord.user_id;


            try {
                let error;
                if (isEditing) {
                     console.log("Updating evaluation:", evaluationId, evaluationRecord);
                    const { error: updateError } = await supabase.from('evaluaciones')
                        .update(evaluationRecord).eq('id', evaluationId).eq('user_id', currentUserId);
                    error = updateError;
                } else {
                    // INSERT (Quitar updated_at, añadir created_at si no tiene default)
                    delete evaluationRecord.updated_at;
                    // evaluationRecord.created_at = new Date(); // Solo si no hay default
                    console.log("Inserting new evaluation:", evaluationRecord);
                    const { error: insertError } = await supabase.from('evaluaciones')
                        .insert([evaluationRecord]);
                    error = insertError;
                }
                if (error) throw error;
                showMessage('success', '¡Evaluación guardada correctamente!');
                loadEvaluationData(selectedPeriod); // Recargar para mostrar datos actualizados/ID

            } catch (error) {
                console.error("Error guardando evaluación:", error);
                showMessage('error', `Error al guardar: ${error.message}`);
            } finally {
                setLoadingState(false);
            }
        }; // Fin de proceedWithSave


        // --- CORRECCIÓN Y USO DEL MODAL ---
        // Comprobar si la diferencia absoluta es mayor que 1 céntimo
        if (Math.abs(mainDiff) > 0.01) {
            console.log("Descuadre detectado:", mainDiff);
            openConfirmationModal( // <-- LLAMAR AL MODAL ESTILIZADO
                'Balance Incorrecto',
                `Los balances no cuadran exactamente (${formatCurrency(mainDiff)}). ¿Deseas guardar la evaluación de todos modos?`,
                proceedWithSave // <-- Pasar la función de guardado como callback
            );
        } else {
            // Si cuadra (o la diferencia es mínima), guardar directamente
            console.log("Balance cuadrado. Guardando directamente.");
            proceedWithSave();
        }
        // --- FIN CORRECCIÓN ---
    }

    // --- Asignación de Event Listeners ---
    document.addEventListener('authReady', (e) => {
        console.log('Evaluaciones.js: Received authReady event.');
        currentUser = e.detail.user;
        currentUserId = currentUser?.id;
        if (currentUserId) {
            // Cargar avatar
            supabase.from('profiles').select('avatar_url').eq('id', currentUserId).single().then(({ data }) => {
                 if (userAvatarSmall) userAvatarSmall.src = data?.avatar_url || defaultAvatarPath;
            });
            // Poner periodo actual y cargar datos
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
            selectedPeriod = `${currentYear}-${currentMonth}`;
            if (periodSelector) periodSelector.value = selectedPeriod;
            loadEvaluationData(selectedPeriod); // Carga inicial
        } else { console.warn("Evaluaciones.js: No user session."); /* UI no logueado */ }
    });

    document.addEventListener('DOMContentLoaded', () => {
        console.log("Evaluaciones.js: DOM fully loaded.");
        if (backButton) {
            backButton.addEventListener('click', () => {
                console.log('DEBUG: Botón Volver presionado -> Dashboard');
                window.location.href = '/Dashboard.html'; // Ruta correcta
            });
        }
        if (periodSelector) periodSelector.addEventListener('change', handlePeriodChange);
        if (evaluationForm) {
             evaluationForm.addEventListener('submit', handleSaveEvaluation);
             // Recalcular balances al cambiar cualquier input numérico
             evaluationForm.querySelectorAll('input[type="number"]').forEach(input => {
                 input.addEventListener('input', calculateAndDisplayBalances);
             });
        }

         // Scroll top
         if (scrollTopBtn) { window.addEventListener('scroll', () => { scrollTopBtn.classList.toggle('visible', window.scrollY > 300); }); scrollTopBtn.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); }); }

         if (confirmationModalCancelBtn) {
            confirmationModalCancelBtn.addEventListener('click', closeConfirmationModal);
            console.log("DEBUG: Listener añadido a #confirmationModalCancelBtn");
        } else { console.error("ERROR: Botón #confirmationModalCancelBtn NO encontrado!"); }

        if (confirmationModalConfirmBtn) {
            confirmationModalConfirmBtn.addEventListener('click', () => {
                console.log("DEBUG: Botón Confirmar del modal presionado.");
                if (typeof confirmActionCallback === 'function') {
                    console.log("DEBUG: Ejecutando callback de confirmación...");
                    confirmActionCallback(); // Ejecutar la acción guardada (proceedWithSave)
                } else { console.warn("WARN: No había callback de confirmación guardado."); }
                closeConfirmationModal(); // Cerrar el modal
            });
            console.log("DEBUG: Listener añadido a #confirmationModalConfirmBtn");
        } else { console.error("ERROR: Botón #confirmationModalConfirmBtn NO encontrado!"); }

        if (confirmationModal) {
            confirmationModal.addEventListener('click', (event) => { if (event.target === confirmationModal) closeConfirmationModal(); });
             console.log("DEBUG: Listener añadido a #confirmationModal (overlay click)");
        } else { console.error("ERROR: Modal #confirmationModal NO encontrado!"); }

    }); // Fin DOMContentLoaded

} // Fin check Supabase