/*
Archivo: src/pages/Evaluations.jsx
Propósito: Componente para la página de evaluación y planificación mensual.
*/
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext.jsx';
import { formatCurrency, formatDate } from '../utils/formatters.js'; // Importar utils
import EvaluationForm from '../components/Evaluations/EvaluationForm.jsx'; // Importar Form
import EvaluationChart from '../components/Evaluations/EvaluationChart.jsx'; // Importar Chart
import toast from 'react-hot-toast';
import Sidebar from '../components/layout/Sidebar.jsx'; 
import PageHeader from '../components/layout/PageHeader.jsx';
import '../styles/Evaluations.scss';

// Importa imágenes
import defaultAvatar from '../assets/avatar_predeterminado.png';

// --- Fin Funciones de Utilidad ---

function Evaluations() {
    // --- Estado del Componente ---
    const { user, loading: authLoading } = useAuth();
    const [avatarUrl, setAvatarUrl] = useState(defaultAvatar);
    const [selectedPeriod, setSelectedPeriod] = useState(''); // Formato YYYY-MM
    const [evaluationData, setEvaluationData] = useState(null); // Datos originales cargados
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null); // Error general de carga/guardado
    const [showScrollTop, setShowScrollTop] = useState(false);

    const navigate = useNavigate();

    const fetchData = useCallback(async (currentUserId, period) => {
        if (!currentUserId || !period) {
             setEvaluationData(null); // Limpiar si no hay periodo
             setIsLoading(false); // No hay nada que cargar
             return;
        }
        setIsLoading(true); setError(null); setEvaluationData(null);
        console.log(`Evaluations: Cargando datos para ${period}, user ${currentUserId}`);
        try {
            // Calcular fechas del mes
            const year = parseInt(period.split('-')[0]);
            const month = parseInt(period.split('-')[1]) - 1;
            const firstDayOfMonth = new Date(Date.UTC(year, month, 1)).toISOString().split('T')[0];
            const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).toISOString().split('T')[0];

            // Cargar perfil y evaluación en paralelo
            const [profileRes, evaluationRes] = await Promise.all([
                supabase.from('profiles').select('avatar_url').eq('id', currentUserId).single(),
                supabase.from('evaluaciones').select('*')
                    .eq('user_id', currentUserId)
                    .gte('evaluation_date', firstDayOfMonth)
                    .lte('evaluation_date', lastDayOfMonth)
                    .maybeSingle() // Puede que no exista
            ]);

            if (profileRes.error && profileRes.status !== 406) throw profileRes.error;
            setAvatarUrl(profileRes.data?.avatar_url || defaultAvatar);

            if (evaluationRes.error) throw evaluationRes.error;

            if (evaluationRes.data) {
                // Mapear los nombres de columna de la BD a los nombres de estado del frontend
                const fetchedData = evaluationRes.data;
                const mappedData = {
                    id: fetchedData.id, // El ID se mantiene igual
                    evalIngreso: fetchedData.ingreso,
                    evalAhorroMes: fetchedData.ahorro_mes,
                    evalFijos: fetchedData.fijos,
                    evalVariables: fetchedData.variables,
                    evalColchon: fetchedData.colchon,
                    evalViajes: fetchedData.viajes,
                    evalInversion: fetchedData.inversion,
                    evalExtra: fetchedData.extra,
                    evalObservaciones: fetchedData.observaciones,
                    // Mantén user_id y evaluation_date si también los guardas en evaluationData y son útiles
                    user_id: fetchedData.user_id,
                    evaluation_date: fetchedData.evaluation_date 
                    // ... y cualquier otro campo que necesites mapear
                };
                setEvaluationData(mappedData);
                console.log("Evaluación cargada y mapeada:", mappedData);
            } else {
                // Si no hay evaluación, inicializa evaluationData con la estructura esperada y valores vacíos/default
                setEvaluationData({
                    id: null,
                    evalIngreso: '', evalAhorroMes: '', evalFijos: '', evalVariables: '',
                    evalColchon: '', evalViajes: '', evalInversion: '', evalExtra: '',
                    evalObservaciones: '',
                    user_id: currentUserId, // Puede ser útil pre-rellenar
                    evaluation_date: firstDayOfMonth // Puede ser útil pre-rellenar
                });
                console.log("Evaluación no encontrada, inicializando formulario vacío para:", firstDayOfMonth);
            }

        } catch (err) {
            console.error("Error cargando datos (Evaluations):", err);
            setError(err.message || "Error al cargar evaluación.");
            setEvaluationData(null);
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    // --- Efecto para cargar datos de evaluación cuando cambia el periodo o el userId ---
    useEffect(() => { // Efecto inicial para periodo y carga
        if (authLoading) { setIsLoading(true); return; }
        if (!user) { navigate('/login'); return; }

        // Establecer periodo actual si no hay uno seleccionado
        if (!selectedPeriod) {
             const today = new Date();
             const initialPeriod = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
             setSelectedPeriod(initialPeriod);
        } else {
            // Si ya hay periodo y usuario, cargar datos
            fetchData(user.id, selectedPeriod);
        }

        // Scroll listener
        const handleScroll = () => setShowScrollTop(window.scrollY > 300);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);

    // Ejecutar cuando cambien estos o al montar si user/authLoading ya están listos
    }, [user, authLoading, selectedPeriod, navigate, fetchData]); // Dependencias: Recargar si cambia el periodo, el usuario o el cliente supabase

    // --- Cálculo de Balance (useCallback para que no se recree innecesariamente) ---
    const balanceInfo = useMemo(() => {
        if (!evaluationData) {
            console.log("balanceInfo: evaluationData es null o undefined, devolviendo balance 0");
            return { descuadre: 0, isBalanced: true };
        }
    
        // USA LOS NOMBRES CORRECTOS DE LAS PROPIEDADES DE evaluationData
        const ingreso = Number(evaluationData.evalIngreso) || 0;
        const ahorroMes = Number(evaluationData.evalAhorroMes) || 0;
        const fijos = Number(evaluationData.evalFijos) || 0;
        const variables = Number(evaluationData.evalVariables) || 0;
        const colchon = Number(evaluationData.evalColchon) || 0;
        const viajes = Number(evaluationData.evalViajes) || 0;
        const inversion = Number(evaluationData.evalInversion) || 0;
        const extra = Number(evaluationData.evalExtra) || 0; // Asume que extra es una salida/asignación
    
         console.log("Valores para cálculo de descuadre:", {ingreso, ahorroMes, fijos, variables, colchon, viajes, inversion, extra}); // Para depurar
    
        const totalSalidas = ahorroMes + fijos + variables + colchon + viajes + inversion + extra;
        const descuadreCalculado = ingreso - totalSalidas;
        
         console.log("Descuadre calculado:", descuadreCalculado); // Para depurar
    
        return { 
            descuadre: descuadreCalculado, 
            isBalanced: Math.abs(descuadreCalculado) < 0.01 
        };
    }, [evaluationData]);

    // --- Inicialización y Actualización del Gráfico ---
    const chartData = useMemo(() => {
        const labels = ['Ahorro Mes', 'Fijos', 'Variables', 'Colchón', 'Viajes', 'Inversión', 'Extra'];
    
    // Accede a evaluationData usando los prefijos 'eval'
        const dataValues = evaluationData ? [
            Number(evaluationData.evalAhorroMes) || 0, // <--- CORREGIDO
            Number(evaluationData.evalFijos) || 0,     // <--- CORREGIDO
            Number(evaluationData.evalVariables) || 0, // <--- CORREGIDO
            Number(evaluationData.evalColchon) || 0,   // <--- CORREGIDO
            Number(evaluationData.evalViajes) || 0,    // <--- CORREGIDO
            Number(evaluationData.evalInversion) || 0, // <--- CORREGIDO
            Number(evaluationData.evalExtra) || 0      // <--- CORREGIDO
        ] : [0, 0, 0, 0, 0, 0, 0];

        console.log("EvaluationChart: dataValues extraídos:", dataValues);

        const filteredLabels = []; 
        const filteredData = []; 
        const backgroundColors = []; 
        const borderColors = []; 
        const dataRaw = [];
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
            if (dataValues[index] > 0 || (label === 'Extra' && dataValues[index] !== 0)) {
                filteredLabels.push(label);
                filteredData.push(Math.abs(dataValues[index])); // Usar absoluto para el gráfico
                dataRaw.push(dataValues[index]); // Guardar original para tooltip
                backgroundColors.push(colorMap[label] || '#cccccc');
                borderColors.push(borderMap[label] || '#aaaaaa');
            }
        });

        console.log("EvaluationChart: filteredLabels:", filteredLabels); // Log para ver qué etiquetas se filtraron
        console.log("EvaluationChart: filteredData:", filteredData);

        // Si no hay datos filtrados, podrías querer devolver una estructura vacía o con un mensaje
        if (filteredLabels.length === 0) {
            console.log("EvaluationChart: No hay datos filtrados, devolviendo estado 'Sin datos'.");
            return {
                labels: ['Sin datos'],
                datasets: [{
                    data: [100], // Un valor para que el gráfico no se rompa
                    backgroundColor: ['#E0E0E0'],
                    borderColor: ['#BDBDBD'],
                }],
                dataRaw: [] // Asegúrate de que esto es lo que espera tu tooltip
            };
        }
        console.log("EvaluationChart: Devolviendo datos procesados para el gráfico.");
        return { 
            labels: filteredLabels, 
            datasets: [{ // Chart.js espera 'datasets' como un array de objetos
                data: filteredData,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
            }],
            dataRaw // Pasa dataRaw para que tu tooltip pueda usarla
        };
    }, [evaluationData]); // Depende solo de los datos cargados // Depende de formData

    // --- Manejadores de Eventos ---
    const handlePeriodChange = (event) => {
        setSelectedPeriod(event.target.value);
        // La carga de datos se disparará por el useEffect [selectedPeriod]
    };
    const handleEvaluationFormChange = (event) => {
        const { name, value, type, checked } = event.target;
    
        let finalValue;
    
        if (type === 'checkbox') {
            // Para inputs de tipo checkbox (no los usas en EvaluationForm actualmente, pero es para completitud)
            finalValue = checked;
        } else if (type === 'number') {
            // Para inputs de tipo number
            if (value === '') {
                finalValue = '';
            } else {
                const parsedValue = parseFloat(value);
                finalValue = isNaN(parsedValue) ? '' : parsedValue;
            }
        } else {
            // Para otros tipos de input (text, textarea, select, etc.)
            finalValue = value;
        }
    
        // Asumiendo que tu estado que guarda los datos del formulario se llama 'evaluationData'
        // y su función para actualizarlo es 'setEvaluationData'
        setEvaluationData(prevData => {
            // Si prevData es null o undefined (podría ser el caso al iniciar un formulario nuevo),
            // empezamos con un objeto vacío para evitar errores al hacer el spread.
            const baseData = prevData || {};
            
            return {
                ...baseData, // Mantenemos todos los demás valores del formulario
                [name]: finalValue // Actualizamos el campo que cambió, usando su atributo 'name'
            };
        });
    };

    // Submit Formulario Evaluación
    const handleEvaluationSubmit = useCallback(async (event) => {
        event.preventDefault(); // ¡¡¡PRIMERO Y MÁS IMPORTANTE!!! Previene el refresco.
    
        if (!user?.id || !selectedPeriod) {
            toast.error("Usuario o periodo no válido.");
            return;
        }
    
        if (evaluationData.evalIngreso === '' || evaluationData.evalIngreso === null || typeof evaluationData.evalIngreso === 'undefined') {
            toast.error("El Ingreso es obligatorio.");
            return;
        }
        // Si quieres asegurarte de que sea un número (y no NaN, aunque handleEvaluationFormChange intenta evitarlo):
        if (typeof evaluationData.evalIngreso !== 'number') {
            toast.error("El valor del Ingreso debe ser numérico.");
            return;
        }
    
    
        setIsSaving(true);
        const toastId = toast.loading('Guardando evaluación...');
        try {
            const year = parseInt(selectedPeriod.split('-')[0]);
            const month = parseInt(selectedPeriod.split('-')[1]) - 1;
            const evaluation_date = new Date(Date.UTC(year, month, 1)).toISOString().split('T')[0];
    
            // Construye dataToSave a partir del estado 'evaluationData'
            const dataToSave = {
                user_id: user.id,
                evaluation_date: evaluation_date,
                // Asegúrate de que los valores numéricos sean números; usa 0 como default si están vacíos o no son numéricos
                ingreso: Number(evaluationData.evalIngreso) || 0,
                ahorro_mes: Number(evaluationData.evalAhorroMes) || 0,
                fijos: Number(evaluationData.evalFijos) || 0,
                variables: Number(evaluationData.evalVariables) || 0,
                colchon: Number(evaluationData.evalColchon) || 0,
                viajes: Number(evaluationData.evalViajes) || 0,
                inversion: Number(evaluationData.evalInversion) || 0,
                extra: Number(evaluationData.evalExtra) || 0,
                observaciones: evaluationData.evalObservaciones?.trim() || null,
            };
    
            // Si estás editando una evaluación existente, evaluationData debería tener su 'id'
            if (evaluationData.id) {
                dataToSave.id = evaluationData.id;
            }
    
            const { error: upsertError } = await supabase
                .from('evaluaciones')
                .upsert(dataToSave, { onConflict: 'user_id, evaluation_date' }); // Asegúrate de que este constraint exista y sea user_id, evaluation_date
    
            if (upsertError) throw upsertError;
    
            toast.success('¡Evaluación guardada!', { id: toastId });
            fetchData(user.id, selectedPeriod); // Recargar para asegurar consistencia y obtener el ID si es nuevo
    
        } catch (err) {
            console.error("Error guardando evaluación:", err);
            toast.error(`Error al guardar: ${err.message}`, { id: toastId });
        } finally {
            setIsSaving(false);
        }
    // Las dependencias de useCallback:
    // 'evaluationData' es crucial aquí porque lees de ella.
    // 'fetchData' si lo llamas dentro.
    // 'supabase' si lo usas.
    // 'selectedPeriod', 'user' si los usas.
    // 'setIsSaving', (toast si no es estable, pero usualmente lo es)
    }, [user, selectedPeriod, evaluationData, supabase, fetchData, setIsSaving /*, toast (si es necesario) */]);

    // Otros manejadores
    const handleBack = useCallback(() => navigate(-1), [navigate]);
    const scrollToTop = useCallback(() => window.scrollTo({ top: 0, behavior: 'smooth' }), []);

    // --- Renderizado ---
    // ... (JSX completo como en la respuesta anterior, usando estados y manejadores) ...
    // Asegúrate de pasar la ref `chartRef` al elemento <canvas>
    return (
        <div style={{ display: 'flex' }}>
            {/* Sidebar */}
            <Sidebar
                // Pasar estado de carga/guardado si quieres deshabilitar botones mientras ocurre algo
                isProcessing={isLoading || isSaving /* ...o el estado relevante */}
            />

            {/* Contenido Principal */}
            <div className="page-container">
                {/* Cabecera */}
                <PageHeader 
                    pageTitle="Evaluación Mensual"
                    headerClassName="evaluations-header" // Tu clase específica si la necesitas
                    showSettingsButton={false}          // No mostrar botón de settings aquí
                    isProcessingPage={isLoading || isSaving} // Para deshabilitar botones de PageHeader si es necesario
                    actionButton={null} // O simplemente no pasar la prop actionButton
                />

                {/* Selector Periodo */}
                <div className="period-selector-container">
                    <label htmlFor="periodSelector">Selecciona el Mes:</label>
                    <input type="month" id="periodSelector" name="period" value={selectedPeriod} onChange={handlePeriodChange} disabled={isLoading || isSaving}/>
                </div>

                {/* Contenedor Evaluación */}
                {isLoading && ( <div style={{ textAlign: 'center', padding: '30px', color: '#666' }}>Cargando...</div> )}
                {error && !isLoading && ( <div style={{ textAlign: 'center', padding: '30px', color: 'red' }}>{error}</div> )}

                {/* Renderizar Formulario y Gráfico SIEMPRE que no haya error y tengamos periodo seleccionado */}
                {/* El formulario se poblará con evaluationData o valores por defecto */}
                {!isLoading && !error && selectedPeriod && (
                     <div id="evaluationContainer" className="settings-card evaluation-card">
                        <h2 id="evaluationPeriodTitle">Plan para {selectedPeriod ? new Date(selectedPeriod + '-02').toLocaleDateString('es-ES', { month: 'long', year: 'numeric'}) : ''}</h2>

                        {/* Componente Formulario */}
                        <EvaluationForm
                            formData={evaluationData} // El estado del padre
                            onFormChange={handleEvaluationFormChange} // El handler del padre
                            onSubmit={handleEvaluationSubmit}
                            isSaving={isSaving}
                            evaluationId={evaluationData?.id} 
                        />
                        {/* Balance Checks (calculado desde evaluationData) */}
                        <div className="balance-checks">
                            <div id="mainBalance" className={`balance-item ${!balanceInfo.isBalanced ? 'unbalanced' : ''}`}>
                                Descuadre: <span>{formatCurrency(balanceInfo.descuadre)}</span>
                                {balanceInfo.isBalanced && <i className="fas fa-check-circle icon-green" style={{marginLeft: '8px'}}></i>}
                            </div>
                        </div>

                        {/* Componente Gráfico */}
                        <div id="chartArea" className="chart-area">
                            <EvaluationChart chartData={chartData} />
                        </div>

                     </div>
                )}

            </div> {/* Fin page-container */}

             {/* Botón Scroll-Top */}
             {showScrollTop && ( <button onClick={scrollToTop} id="scrollTopBtn" className="scroll-top-btn orange-btn visible" title="Volver arriba"> <i className="fas fa-arrow-up"></i> </button> )}
        </div>
    );
}
export default Evaluations;

