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
            setEvaluationData(evaluationRes.data); // Guardar data (o null si no existe)
            console.log("Evaluación cargada:", evaluationRes.data);

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
        if (!evaluationData) return { descuadre: 0, isBalanced: true }; // Balance 0 si no hay datos
        const ingreso = Number(evaluationData.ingreso) || 0;
        const ahorro = Number(evaluationData.ahorro_mes) || 0;
        const fijos = Number(evaluationData.fijos) || 0;
        const variables = Number(evaluationData.variables) || 0;
        const colchon = Number(evaluationData.colchon) || 0;
        const viajes = Number(evaluationData.viajes) || 0;
        const inversion = Number(evaluationData.inversion) || 0;
        const extra = Number(evaluationData.extra) || 0;
        const totalSalidas = ahorro + fijos + variables + colchon + viajes + inversion;
        const descuadre = ingreso - totalSalidas - extra;
        return { descuadre: descuadre, isBalanced: Math.abs(descuadre) < 0.01 };
    }, [evaluationData]); // Depende de formData

    // --- Inicialización y Actualización del Gráfico ---
    const chartData = useMemo(() => {
        const labels = ['Ahorro Mes', 'Fijos', 'Variables', 'Colchón', 'Viajes', 'Inversión', 'Extra'];
        const dataValues = evaluationData ? [
            Number(evaluationData.ahorro_mes) || 0, Number(evaluationData.fijos) || 0,
            Number(evaluationData.variables) || 0, Number(evaluationData.colchon) || 0,
            Number(evaluationData.viajes) || 0, Number(evaluationData.inversion) || 0,
            Number(evaluationData.extra) || 0
        ] : [0, 0, 0, 0, 0, 0, 0]; // Datos cero si no hay evaluación

        const filteredLabels = []; const filteredData = []; const backgroundColors = []; const borderColors = []; const dataRaw = [];

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
            // Incluir solo si el valor es > 0 O si es 'Extra' y no es 0
            if (dataValues[index] > 0 || (label === 'Extra' && dataValues[index] !== 0)) {
                filteredLabels.push(label);
                filteredData.push(Math.abs(dataValues[index])); // Usar absoluto para el gráfico
                dataRaw.push(dataValues[index]); // Guardar original para tooltip
                backgroundColors.push(colorMap[label] || '#cccccc');
                borderColors.push(borderMap[label] || '#aaaaaa');
            }
        });

        return { labels: filteredLabels, data: filteredData, backgroundColors, borderColors, dataRaw };
    }, [evaluationData]); // Depende solo de los datos cargados // Depende de formData

    // --- Manejadores de Eventos ---
    const handlePeriodChange = (event) => {
        setSelectedPeriod(event.target.value);
        // La carga de datos se disparará por el useEffect [selectedPeriod]
    };

    // Submit Formulario Evaluación
    const handleEvaluationSubmit = useCallback(async (submittedFormData) => {
        if (!user?.id || !selectedPeriod) { toast.error("Usuario o periodo no válido."); return; }
        // Validación básica (ya hecha en el modal, pero podríamos re-validar)
        if (!submittedFormData.evalIngreso) { toast.error("El Ingreso es obligatorio."); return; }

        setIsSaving(true);
        const toastId = toast.loading('Guardando evaluación...');
        try {
            const year = parseInt(selectedPeriod.split('-')[0]);
            const month = parseInt(selectedPeriod.split('-')[1]) - 1;
            const evaluation_date = new Date(Date.UTC(year, month, 1)).toISOString().split('T')[0];

            const dataToSave = {
                user_id: user.id, evaluation_date: evaluation_date,
                ingreso: Number(submittedFormData.evalIngreso) || 0,
                ahorro_mes: Number(submittedFormData.evalAhorroMes) || 0,
                fijos: Number(submittedFormData.evalFijos) || 0,
                variables: Number(submittedFormData.evalVariables) || 0,
                colchon: Number(submittedFormData.evalColchon) || 0,
                viajes: Number(submittedFormData.evalViajes) || 0,
                inversion: Number(submittedFormData.evalInversion) || 0,
                extra: Number(submittedFormData.evalExtra) || 0,
                observaciones: submittedFormData.evalObservaciones.trim() || null,
            };

            let error;
            // Usar upsert para insertar si no existe, o actualizar si existe (basado en user_id y evaluation_date)
            // Asegúrate de tener una política de RLS que permita upsert o un UNIQUE constraint en (user_id, evaluation_date)
            const { error: upsertError } = await supabase
                .from('evaluaciones')
                .upsert(dataToSave, { onConflict: 'user_id, evaluation_date' }); // Asume constraint

            error = upsertError;

            if (error) throw error;

            toast.success('¡Evaluación guardada!', { id: toastId });
            fetchData(user.id, selectedPeriod); // Recargar para asegurar consistencia

        } catch (err) {
            console.error("Error guardando evaluación:", err);
            toast.error(`Error al guardar: ${err.message}`, { id: toastId });
        } finally {
            setIsSaving(false);
        }
    }, [user, selectedPeriod, evaluationData, supabase, fetchData]); // Dependencias

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
                <div className="page-header evaluations-header">
                    {/* ... Cabecera JSX ... */}
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
                {isLoading && ( <div style={{ textAlign: 'center', padding: '30px', color: '#666' }}>Cargando...</div> )}
                {error && !isLoading && ( <div style={{ textAlign: 'center', padding: '30px', color: 'red' }}>{error}</div> )}

                {/* Renderizar Formulario y Gráfico SIEMPRE que no haya error y tengamos periodo seleccionado */}
                {/* El formulario se poblará con evaluationData o valores por defecto */}
                {!isLoading && !error && selectedPeriod && (
                     <div id="evaluationContainer" className="settings-card evaluation-card">
                        <h2 id="evaluationPeriodTitle">Plan para {selectedPeriod ? new Date(selectedPeriod + '-02').toLocaleDateString('es-ES', { month: 'long', year: 'numeric'}) : ''}</h2>

                        {/* Componente Formulario */}
                        <EvaluationForm
                            // Pasar datos existentes (o null) para inicializar el form
                            initialData={evaluationData}
                            // Pasar la función de submit del padre
                            onSubmit={handleEvaluationSubmit}
                            isSaving={isSaving}
                            evaluationId={evaluationData?.id} // Pasa el ID si existe
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

