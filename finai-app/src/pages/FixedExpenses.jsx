/*
Archivo: src/pages/FixedExpenses.jsx
Propósito: Componente para gestionar los gastos fijos recurrentes, con vista de lista y calendario.
*/
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient'; // Importa cliente Supabase
import FullCalendar from '@fullcalendar/react'; // Importa el componente React de FullCalendar
import dayGridPlugin from '@fullcalendar/daygrid'; // Plugin para vista mensual
import interactionPlugin from "@fullcalendar/interaction"; // para dateClick o eventClick si se necesita más interacción
import esLocale from '@fullcalendar/core/locales/es'; // Importar localización española

// Importa imágenes
import finAiLogo from '../assets/Logo_FinAI_Oficial.png';
import defaultAvatar from '../assets/avatar_predeterminado.png';
// Importar mascota si se usa

// --- Funciones de Utilidad --- (Mover a /utils)
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

/**
 * Devuelve la clase de icono Font Awesome basada en una palabra clave o nombre de categoría.
 * Incluye un mapeo predefinido y maneja casos donde la clase ya está completa.
 * @param {string | null | undefined} iconKeyword La palabra clave o clase de icono (ej: 'comida', 'fas fa-car').
 * @returns {string} La clase CSS del icono Font Awesome (ej. "fas fa-utensils", "fas fa-tag").
 */
const getIconClass = (iconKeyword) => {
    // Mapeo de palabras clave comunes a iconos Font Awesome (Solid - fas)
    // ¡Asegúrate de que Font Awesome esté cargado en tu index.html!
    // Puedes añadir/modificar este mapa según tus necesidades.
    const iconMap = {
        // Ingresos
        'nomina': 'fas fa-money-check-alt', 'salario': 'fas fa-money-check-alt',
        'freelance': 'fas fa-briefcase', 'negocio': 'fas fa-store',
        'regalo recibido': 'fas fa-gift', 'otros ingresos': 'fas fa-dollar-sign', 'ingreso': 'fas fa-arrow-down', // Genérico
        // Gastos Comunes
        'comida': 'fas fa-utensils', 'supermercado': 'fas fa-shopping-basket',
        'restaurante': 'fas fa-concierge-bell', 'cafe': 'fas fa-coffee',
        'transporte': 'fas fa-bus-alt', 'coche': 'fas fa-car', 'gasolina': 'fas fa-gas-pump',
        'parking': 'fas fa-parking',
        'casa': 'fas fa-home', 'hogar': 'fas fa-home', 'alquiler': 'fas fa-file-contract',
        'hipoteca': 'fas fa-file-contract', 'mantenimiento': 'fas fa-tools',
        'facturas': 'fas fa-file-invoice-dollar', 'luz': 'fas fa-lightbulb', 'agua': 'fas fa-tint',
        'gas': 'fas fa-burn', 'internet': 'fas fa-wifi', 'telefono': 'fas fa-phone',
        'compras': 'fas fa-shopping-bag', 'ropa': 'fas fa-tshirt', 'tecnologia': 'fas fa-laptop',
        'ocio': 'fas fa-film', 'cine': 'fas fa-ticket-alt', 'concierto': 'fas fa-music',
        'libros': 'fas fa-book', 'suscripciones': 'fas fa-rss-square', 'netflix': 'fas fa-tv',
        'spotify': 'fab fa-spotify', // Requiere FA Brands (fab)
        'salud': 'fas fa-heartbeat', 'medico': 'fas fa-stethoscope', 'farmacia': 'fas fa-pills',
        'gimnasio': 'fas fa-dumbbell', 'deporte': 'fas fa-running',
        'regalos': 'fas fa-gift', 'donacion': 'fas fa-hand-holding-heart',
        'educacion': 'fas fa-graduation-cap', 'cursos': 'fas fa-chalkboard-teacher',
        'mascotas': 'fas fa-paw',
        'viajes': 'fas fa-plane-departure', 'vacaciones': 'fas fa-umbrella-beach',
        'tasas': 'fas fa-gavel', 'impuestos': 'fas fa-landmark',
        'inversion': 'fas fa-chart-line', // Para gastos relacionados
        'otros gastos': 'fas fa-question-circle', 'gasto': 'fas fa-arrow-up', // Genérico
        // Transferencias y Pagos
        'transferencia': 'fas fa-exchange-alt',
        'pago deudas': 'fas fa-receipt', // O 'fas fa-file-invoice-dollar'
        'pago prestamo': 'fas fa-hand-holding-usd', // O 'fas fa-file-invoice-dollar'
        // Metas (algunos ejemplos)
        'viaje': 'fas fa-plane-departure', 'japon': 'fas fa-torii-gate',
        'piso': 'fas fa-building', 'entrada': 'fas fa-key',
        'ahorro': 'fas fa-piggy-bank', 'emergencia': 'fas fa-briefcase-medical',
        // Otros
        'evaluacion': 'fas fa-balance-scale',
        'cuenta': 'fas fa-landmark',
        'default': 'fas fa-tag' // Icono por defecto si no hay coincidencia
    };

    // 1. Limpiar y convertir a minúsculas la keyword
    const lowerKeyword = iconKeyword?.trim().toLowerCase();

    // 2. Buscar en el mapa
    const mappedIcon = iconMap[lowerKeyword];
    if (mappedIcon) {
        return mappedIcon; // Devolver icono del mapa si se encuentra
    }

    // 3. Si no está en el mapa, verificar si ya es una clase Font Awesome válida
    //    (empieza con 'fa', seguido de un espacio y luego 'fa-' o el prefijo de marca 'fab', 'far', etc.)
    if (lowerKeyword?.startsWith('fa') && lowerKeyword?.includes(' fa-')) {
         // Podríamos hacer una validación más estricta si quisiéramos
        return iconKeyword.trim(); // Devolver la clase original (con trim)
    }

    // 4. Si no es ninguna de las anteriores, devolver el icono por defecto
    return iconMap['default'];
};

/**
 * Calcula la siguiente fecha de vencimiento basada en la frecuencia.
 * @param {Date} currentDueDate La fecha de vencimiento actual (objeto Date ajustado por zona horaria).
 * @param {string} frequency La frecuencia ('mensual', 'anual', etc.).
 * @param {number | null} dayOfMonth El día del mes guardado (para 'mensual').
 * @returns {Date | null} El objeto Date de la siguiente fecha o null si no se puede calcular.
 */
const calculateNextDueDate = (currentDueDate, frequency, dayOfMonth) => {
    if (!(currentDueDate instanceof Date) || isNaN(currentDueDate.getTime())) return null;
    let nextDate = new Date(currentDueDate.getTime()); // Clonar

    switch (frequency) {
        case 'mensual':
            if (dayOfMonth && dayOfMonth >= 1 && dayOfMonth <= 31) {
                let targetMonth = nextDate.getMonth() + 1;
                let targetYear = nextDate.getFullYear();
                if (targetMonth > 11) { targetMonth = 0; targetYear++; }
                let lastDayOfMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
                let targetDay = Math.min(dayOfMonth, lastDayOfMonth);
                nextDate = new Date(targetYear, targetMonth, targetDay);
            } else {
                nextDate.setMonth(nextDate.getMonth() + 1);
            }
            break;
        case 'anual': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
        case 'semanal': nextDate.setDate(nextDate.getDate() + 7); break;
        case 'quincenal': nextDate.setDate(nextDate.getDate() + 14); break; // O 15?
        case 'bimestral': nextDate.setMonth(nextDate.getMonth() + 2); break;
        case 'trimestral': nextDate.setMonth(nextDate.getMonth() + 3); break;
        case 'semestral': nextDate.setMonth(nextDate.getMonth() + 6); break;
        default: return null; // Frecuencia no reconocida o 'unico'
    }

    // Asegurar que la nueva fecha sea futura
    const today = new Date(); today.setHours(0, 0, 0, 0);
    // Bucle por si la fecha calculada sigue en el pasado (ej. gasto mensual muy antiguo)
    while (nextDate < today) {
        console.log(`Fecha ${nextDate.toISOString().split('T')[0]} aún pasada, recalculando para ${frequency}...`);
        const recalculatedDate = calculateNextDueDate(nextDate, frequency, dayOfMonth);
        if (!recalculatedDate || recalculatedDate.getTime() === nextDate.getTime()) {
             console.warn("Bucle detectado o error recalculando fecha.");
             return null; // Evitar bucle infinito
        }
        nextDate = recalculatedDate;
    }
    return nextDate;
};
// --- Fin Funciones de Utilidad ---


function FixedExpenses() {
    // --- Estado ---
    const [userId, setUserId] = useState(null);
    const [avatarUrl, setAvatarUrl] = useState(defaultAvatar);
    const [fixedExpenses, setFixedExpenses] = useState([]);
    const [categories, setCategories] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState('list'); // 'list' o 'calendar'
    // Modal state
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [selectedExpense, setSelectedExpense] = useState(null);
    const [formData, setFormData] = useState({ description: '', amount: '', categoryId: '', accountId: '', frequency: 'mensual', nextDueDate: new Date().toISOString().split('T')[0], notificationEnabled: true, isActive: true });
    const [isSaving, setIsSaving] = useState(false);
    const [modalError, setModalError] = useState('');
    // UI
    const [showScrollTop, setShowScrollTop] = useState(false);

    const navigate = useNavigate();

    // --- Cálculo Total Mensual (useMemo) ---
    // --- Cálculo Total Mensual (useMemo) ---
    // Calcula el total estimado de gastos fijos para el mes actual.
    // useMemo evita recalcular esto en cada renderizado si 'fixedExpenses' no ha cambiado.
    const monthlyTotal = useMemo(() => {
      console.log("Recalculando total mensual estimado..."); // Para depuración
      const now = new Date();
      const currentMonth = now.getMonth(); // 0-11
      const currentYear = now.getFullYear();
      let total = 0;

      // Iterar sobre la lista actual de gastos fijos guardada en el estado
      fixedExpenses.forEach(exp => {
          // Solo considerar gastos marcados como activos
          if (exp.is_active) {
              // Lógica para determinar si este gasto contribuye al total del mes actual
              // (Esta lógica puede necesitar ajustes según cómo quieras calcular el total mensual exacto)

              if (exp.frequency === 'mensual') {
                  // Si es mensual, siempre suma al total del mes
                  total += Number(exp.amount) || 0;
              } else if (exp.next_due_date) {
                  // Si no es mensual pero tiene fecha de vencimiento,
                  // comprobar si esa fecha cae dentro del mes actual.
                  try {
                      const nextDueDate = new Date(exp.next_due_date);
                      // Ajustar por zona horaria para comparación correcta
                      const offset = nextDueDate.getTimezoneOffset();
                      const adjustedNextDueDate = new Date(nextDueDate.getTime() + (offset * 60 * 1000));

                      // Comprobar si el año y mes del vencimiento coinciden con el actual
                      if (adjustedNextDueDate.getFullYear() === currentYear && adjustedNextDueDate.getMonth() === currentMonth) {
                          // Sumar si vence este mes.
                          // NOTA: Esto suma el importe completo de gastos anuales/semestrales/etc.
                          // si vencen este mes. Podrías querer prorratearlos en su lugar,
                          // pero eso complica significativamente el cálculo aquí.
                          total += Number(exp.amount) || 0;
                      }
                  } catch(e) {
                      // Ignorar si la fecha es inválida
                      console.error("Error procesando fecha en cálculo total mensual:", exp.next_due_date, e);
                  }
              }
          }
      });
      // Devuelve el total calculado y formateado
      return formatCurrency(total);
  }, [fixedExpenses]);

    // --- Efecto Carga Inicial y Actualización Fechas ---
    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const simulatedUserId = 'USER_ID_PLACEHOLDER'; // Reemplazar
                setUserId(simulatedUserId);

                const [profileRes, accountsRes, categoriesRes, expensesRes] = await Promise.all([
                    supabase.from('profiles').select('avatar_url').eq('id', simulatedUserId).single(),
                    supabase.from('accounts').select('id, name').eq('user_id', simulatedUserId).order('name'),
                    supabase.from('categories').select('id, name, icon').or(`user_id.eq.${simulatedUserId},is_default.eq.true`).eq('type', 'gasto').order('name'), // Solo gasto
                    supabase.from('scheduled_fixed_expenses').select(`*, categories ( name, icon )`).eq('user_id', simulatedUserId).order('next_due_date')
                ]);

                // Procesar perfil, cuentas, categorías...
                if (profileRes.error && profileRes.status !== 406) throw profileRes.error;
                setAvatarUrl(profileRes.data?.avatar_url || defaultAvatar);
                if (accountsRes.error) throw accountsRes.error; setAccounts(accountsRes.data || []);
                if (categoriesRes.error) throw categoriesRes.error; setCategories(categoriesRes.data || []);
                if (expensesRes.error) throw expensesRes.error;

                let expensesData = expensesRes.data || [];
                console.log(`Gastos fijos cargados: ${expensesData.length}`);

                // --- Actualizar Fechas Vencidas ---
                const today = new Date(); today.setHours(0, 0, 0, 0);
                const updatesToPerform = [];
                expensesData = expensesData.map(exp => {
                    if (exp.is_active && exp.next_due_date && exp.frequency && exp.frequency !== 'unico') {
                        const nextDueDate = new Date(exp.next_due_date);
                        const offset = nextDueDate.getTimezoneOffset();
                        const adjustedNextDueDate = new Date(nextDueDate.getTime() + (offset * 60 * 1000));
                         adjustedNextDueDate.setHours(0,0,0,0);

                        if (adjustedNextDueDate < today) {
                            console.log(`Fecha pasada detectada para '${exp.description}' (${exp.next_due_date}). Calculando siguiente...`);
                            const newNextDueDate = calculateNextDueDate(adjustedNextDueDate, exp.frequency, exp.day_of_month);
                            if (newNextDueDate) {
                                const newDateString = newNextDueDate.toISOString().split('T')[0];
                                console.log(`   Nueva fecha calculada: ${newDateString}`);
                                updatesToPerform.push({ id: exp.id, next_due_date: newDateString });
                                return { ...exp, next_due_date: newDateString }; // Devolver objeto actualizado
                            }
                        }
                    }
                    return exp; // Devolver objeto original si no hay cambios
                });

                // Realizar actualizaciones en BD si es necesario
                if (updatesToPerform.length > 0) {
                    console.log(`Actualizando ${updatesToPerform.length} fechas en BD...`);
                    const updatePromises = updatesToPerform.map(update =>
                        supabase.from('scheduled_fixed_expenses')
                            .update({ next_due_date: update.next_due_date, updated_at: new Date() })
                            .eq('id', update.id).eq('user_id', simulatedUserId)
                    );
                    const results = await Promise.allSettled(updatePromises);
                    results.forEach((result, index) => { if (result.status === 'rejected') console.error(`Error actualizando fecha ID ${updatesToPerform[index].id}:`, result.reason); });
                    console.log("Actualizaciones de fecha completadas.");
                }

                // Guardar los gastos (posiblemente con fechas actualizadas) en el estado
                setFixedExpenses(expensesData);

            } catch (err) {
                console.error("Error cargando datos iniciales (Fixed Expenses):", err);
                setError(err.message || "Error al cargar datos.");
            } finally {
                setIsLoading(false);
            }
        };
        loadInitialData();

        const handleScroll = () => setShowScrollTop(window.scrollY > 300);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [navigate, supabase]); // Dependencias

    // --- Preparar eventos para FullCalendar ---
    const calendarEvents = useMemo(() => {
        return fixedExpenses
            .filter(exp => exp.is_active && exp.next_due_date) // Solo activos y con fecha
            .map(exp => {
                const category = categories.find(c => c.id === exp.category_id);
                return {
                    id: exp.id, // Usar ID de Supabase
                    title: `${exp.description} (${formatCurrency(exp.amount)})`,
                    start: exp.next_due_date, // Fecha de vencimiento
                    allDay: true, // Eventos de día completo
                    backgroundColor: category?.color || '#8a82d5', // Color de categoría o default
                    borderColor: category?.color || '#8a82d5',
                    extendedProps: { // Guardar datos extra si se necesitan en eventClick
                        expenseData: exp
                    }
                };
            });
    }, [fixedExpenses, categories]); // Recalcular si cambian gastos o categorías

    // --- Manejadores ---
    const handleViewChange = (newView) => setViewMode(newView);

    const handleOpenExpenseModal = useCallback((mode = 'add', expense = null) => {
        setModalMode(mode);
        setSelectedExpense(expense);
        setModalError('');
        setIsSaving(false);
        if (mode === 'edit' && expense) {
            setFormData({
                description: expense.description || '',
                amount: expense.amount || '',
                categoryId: expense.category_id || '',
                accountId: expense.account_id || '',
                frequency: expense.frequency || 'mensual',
                nextDueDate: expense.next_due_date ? expense.next_due_date.split('T')[0] : '',
                notificationEnabled: expense.notification_enabled !== false,
                isActive: expense.is_active !== false,
            });
        } else {
            setFormData({ description: '', amount: '', categoryId: '', accountId: '', frequency: 'mensual', nextDueDate: new Date().toISOString().split('T')[0], notificationEnabled: true, isActive: true });
        }
        setIsExpenseModalOpen(true);
    }, []);

    const handleCloseExpenseModal = useCallback(() => setIsExpenseModalOpen(false), []);

    const handleFormChange = useCallback((e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        if (modalError) setModalError('');
    }, [modalError]);

    const handleExpenseFormSubmit = useCallback(async (event) => {
        event.preventDefault();
        if (!userId) return;

        const amount = parseFloat(formData.amount);
        if (!formData.description.trim() || isNaN(amount) || amount <= 0 || !formData.categoryId || !formData.frequency || !formData.nextDueDate) {
             setModalError('Descripción, Importe (>0), Categoría, Frecuencia y Próxima Fecha son obligatorios.'); return;
        }
         let dayOfMonthValue = null;
         if (formData.frequency === 'mensual') {
             try { dayOfMonthValue = new Date(formData.nextDueDate + 'T00:00:00').getDate(); } catch(e) {}
         }

        setModalError(''); setIsSaving(true);

        try {
            const dataToSave = {
                user_id: userId,
                description: formData.description.trim(),
                amount: amount,
                category_id: formData.categoryId || null,
                account_id: formData.accountId || null,
                frequency: formData.frequency,
                next_due_date: formData.nextDueDate,
                day_of_month: dayOfMonthValue,
                notification_enabled: formData.notificationEnabled,
                is_active: formData.isActive,
            };

            let error;
            if (modalMode === 'edit' && selectedExpense) {
                dataToSave.updated_at = new Date();
                const { error: updateError } = await supabase.from('scheduled_fixed_expenses').update(dataToSave).eq('id', selectedExpense.id).eq('user_id', userId);
                error = updateError;
            } else {
                const { error: insertError } = await supabase.from('scheduled_fixed_expenses').insert([dataToSave]);
                error = insertError;
            }
            if (error) throw error;

            handleCloseExpenseModal();
            // Recargar datos
            const { data: refreshedExpenses, error: refreshError } = await supabase.from('scheduled_fixed_expenses').select(`*, categories ( name, icon, color )`).eq('user_id', userId).order('next_due_date');
            if (refreshError) throw refreshError;
            setFixedExpenses(refreshedExpenses || []);

        } catch (err) { console.error('Error guardando Gasto Fijo:', err); setModalError(`Error: ${err.message}`);
        } finally { setIsSaving(false); }
    }, [userId, modalMode, selectedExpense, formData, supabase, handleCloseExpenseModal]);

    const handleDeleteExpense = useCallback(async (expenseId, description) => {
        if (!userId) return;
        if (!window.confirm(`¿Seguro eliminar gasto fijo "${description}"?`)) return;
        try {
            const { error } = await supabase.from('scheduled_fixed_expenses').delete().eq('id', expenseId).eq('user_id', userId);
            if (error) throw error;
            alert('Gasto Fijo eliminado.');
            setFixedExpenses(prev => prev.filter(exp => exp.id !== expenseId));
        } catch (err) { console.error('Error eliminando gasto fijo:', err); alert(`Error: ${err.message}`); }
    }, [userId, supabase]);

    const handleToggle = useCallback(async (expenseId, field, newValue) => {
        if (!userId) return;
        console.log(`Actualizando campo '${field}' a ${newValue} para ID: ${expenseId}`);
        try {
            const { error } = await supabase.from('scheduled_fixed_expenses')
               .update({ [field]: newValue, updated_at: new Date() })
               .eq('id', expenseId).eq('user_id', userId);
            if (error) throw error;
            // Actualizar estado local para reflejo inmediato
            setFixedExpenses(prev => prev.map(exp => exp.id === expenseId ? { ...exp, [field]: newValue } : exp));
            // Recalcular total si cambió 'is_active' (se hará por useMemo)
            // Actualizar calendario si cambió 'is_active' (se hará por useEffect)
        } catch (err) { console.error(`Error actualizando '${field}':`, err); alert(`Error: ${err.message}`); }
    }, [userId, supabase]);

    // Otros manejadores
    const handleLogout = useCallback(() => console.log('Logout pendiente'), []);
    const handleBack = useCallback(() => navigate(-1), [navigate]);
    const scrollToTop = useCallback(() => window.scrollTo({ top: 0, behavior: 'smooth' }), []);

    // Manejador para clic en evento del calendario
    const handleCalendarEventClick = useCallback((clickInfo) => {
        console.log('Evento clicado:', clickInfo.event);
        const expenseId = clickInfo.event.id;
        const expense = fixedExpenses.find(exp => exp.id === expenseId);
        if (expense) {
            handleOpenExpenseModal('edit', expense); // Abrir modal en modo edición
        }
    }, [fixedExpenses, handleOpenExpenseModal]);


    // --- Renderizado ---
    // ... (JSX completo usando estados y manejadores) ...
    // Incluir el componente <FullCalendar> en la vista de calendario
    return (
        <div style={{ display: 'flex' }}>
            {/* Sidebar */}
            <aside className="sidebar">
                 {/* ... Sidebar con Links ... */}
                  <div className="sidebar-logo"> <img src={finAiLogo} alt="FinAi Logo Small" /> </div>
                  <nav className="sidebar-nav">
                      <Link to="/dashboard" className="nav-button" title="Dashboard"><i className="fas fa-home"></i> <span>Dashboard</span></Link>
                      <Link to="/accounts" className="nav-button" title="Cuentas"><i className="fas fa-wallet"></i> <span>Cuentas</span></Link>
                      <Link to="/budgets" className="nav-button" title="Presupuestos"><i className="fas fa-chart-pie"></i> <span>Presupuestos</span></Link>
                      <Link to="/categories" className="nav-button" title="Categorías"><i className="fas fa-tags"></i> <span>Categorías</span></Link>
                      <Link to="/transactions" className="nav-button" title="Transacciones"><i className="fas fa-exchange-alt"></i> <span>Transacciones</span></Link>
                      <Link to="/trips" className="nav-button" title="Viajes"><i className="fas fa-suitcase-rolling"></i> <span>Viajes</span></Link>
                      <Link to="/evaluations" className="nav-button" title="Evaluación"><i className="fas fa-balance-scale"></i> <span>Evaluación</span></Link>
                      <Link to="/reports" className="nav-button" title="Informes"><i className="fas fa-chart-bar"></i> <span>Informes</span></Link>
                      <Link to="/profile" className="nav-button" title="Perfil"><i className="fas fa-user-circle"></i> <span>Perfil</span></Link>
                      <Link to="/settings" className="nav-button" title="Configuración"><i className="fas fa-cog"></i> <span>Configuración</span></Link>
                      <Link to="/debts" className="nav-button" title="Deudas"><i className="fas fa-credit-card"></i> <span>Deudas</span></Link>
                      <Link to="/loans" className="nav-button" title="Préstamos"><i className="fas fa-hand-holding-usd"></i> <span>Préstamos</span></Link>
                      <Link to="/fixed-expenses" className="nav-button active" title="Gastos Fijos"><i className="fas fa-receipt"></i> <span>Gastos Fijos</span></Link> {/* Active */}
                      <Link to="/goals" className="nav-button" title="Metas"><i className="fas fa-bullseye"></i> <span>Metas</span></Link>
                  </nav>
                  <button className="nav-button logout-button" onClick={handleLogout} title="Cerrar Sesión"><i className="fas fa-sign-out-alt"></i> <span>Salir</span></button>
            </aside>

            {/* Contenido Principal */}
            <div className="page-container">
                {/* Cabecera */}
                <div className="page-header fixed-expenses-header">
                    <button onClick={handleBack} id="backButton" className="btn-icon" aria-label="Volver"><i className="fas fa-arrow-left"></i></button>
                    <div className="header-title-group"> <img id="userAvatarHeader" src={avatarUrl} alt="Avatar" className="header-avatar-small" /> <h1>Gastos Fijos</h1> </div>
                    <button onClick={() => handleOpenExpenseModal('add')} id="addExpenseBtn" className="btn btn-primary btn-add"> <i className="fas fa-plus"></i> Añadir Gasto </button>
                </div>

                {/* Resumen Total */}
                <div className="total-summary"> Total Fijo Estimado Este Mes: <span id="monthlyTotalAmount">{isLoading ? 'Calculando...' : monthlyTotal}</span> </div>

                {/* Toggle de Vista */}
                <div className="view-toggle">
                    <button onClick={() => handleViewChange('list')} id="listViewBtn" className={`btn-view ${viewMode === 'list' ? 'active' : ''}`} aria-label="Vista de Lista"> <i className="fas fa-list"></i> Lista </button>
                    <button onClick={() => handleViewChange('calendar')} id="calendarViewBtn" className={`btn-view ${viewMode === 'calendar' ? 'active' : ''}`} aria-label="Vista de Calendario"> <i className="fas fa-calendar-alt"></i> Calendario </button>
                </div>

                {/* Vista Lista */}
                {viewMode === 'list' && (
                    <div id="listViewContainer">
                        <div className="table-container">
                            <table id="fixedExpensesTable" className="data-table">
                                <thead> <tr> <th>Descripción</th> <th>Importe</th> <th>Categoría</th> <th>Frecuencia</th> <th>Próximo Vencimiento</th> <th>Activo</th> <th>Recordatorio</th> <th>Acciones</th> </tr> </thead>
                                <tbody id="fixedExpensesTableBody">
                                    {isLoading && ( <tr><td colSpan="8" style={{ textAlign: 'center' }}>Cargando...</td></tr> )}
                                    {error && !isLoading && ( <tr><td colSpan="8" style={{ textAlign: 'center', color: 'red' }}>{error}</td></tr> )}
                                    {!isLoading && !error && fixedExpenses.length === 0 && ( <tr><td colSpan="8" style={{ textAlign: 'center' }}><p id="noExpensesMessage" className="empty-list-message no-margin">No has programado gastos fijos.</p></td></tr> )}
                                    {!isLoading && !error && fixedExpenses.map(exp => {
                                        const category = categories.find(c => c.id === exp.category_id);
                                        const categoryName = category?.name || '(Sin Cat.)';
                                        const categoryIcon = getIconClass(category?.icon);
                                        return (
                                            <tr key={exp.id} data-id={exp.id} style={{ opacity: exp.is_active ? 1 : 0.6 }}>
                                                <td><span className="trans-desc">{exp.description || '-'}</span></td>
                                                <td className="amount-col"><span className="trans-amount expense">{formatCurrency(exp.amount)}</span></td>
                                                <td><span className="trans-cat"><i className={categoryIcon}></i> {categoryName}</span></td>
                                                <td>{exp.frequency ? exp.frequency.charAt(0).toUpperCase() + exp.frequency.slice(1) : '-'}</td>
                                                <td>{formatDate(exp.next_due_date)}</td>
                                                <td> <label className="toggle-switch"> <input type="checkbox" className="toggle-active" data-id={exp.id} checked={exp.is_active} onChange={(e) => handleToggle(exp.id, 'is_active', e.target.checked)} /> <span className="toggle-slider"></span> </label> </td>
                                                <td> <label className="toggle-switch"> <input type="checkbox" className="toggle-notification" data-id={exp.id} checked={exp.notification_enabled} onChange={(e) => handleToggle(exp.id, 'notification_enabled', e.target.checked)} /> <span className="toggle-slider"></span> </label> </td>
                                                <td> <button onClick={() => handleOpenExpenseModal('edit', exp)} className="btn-icon btn-edit" aria-label="Editar"><i className="fas fa-pencil-alt"></i></button> <button onClick={() => handleDeleteExpense(exp.id, exp.description)} className="btn-icon btn-delete" aria-label="Eliminar"><i className="fas fa-trash-alt"></i></button> </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Vista Calendario */}
                {viewMode === 'calendar' && (
                    <div id="calendarViewContainer">
                        <div id="calendar" className="calendar-container">
                            {isLoading ? <p>Cargando calendario...</p> : error ? <p style={{color:'red'}}>{error}</p> :
                                <FullCalendar
                                    plugins={[dayGridPlugin, interactionPlugin]} // Añadir interactionPlugin
                                    initialView="dayGridMonth"
                                    locale={esLocale} // Usar localización española
                                    events={calendarEvents} // Pasar eventos procesados
                                    eventClick={handleCalendarEventClick} // Manejador clic en evento
                                    height="auto" // Ajustar altura automáticamente
                                    headerToolbar={{ // Configuración cabecera
                                        left: 'prev,next today',
                                        center: 'title',
                                        right: 'dayGridMonth' // Quitar vista semanal por ahora
                                    }}
                                    buttonText={{ // Textos botones
                                        today: 'Hoy',
                                        month: 'Mes',
                                        week: 'Semana', // Quitado
                                        day: 'Día', // Quitado
                                        list: 'Lista' // Quitado
                                    }}
                                />
                            }
                        </div>
                    </div>
                )}

            </div> {/* Fin page-container */}

             {/* --- Modal Añadir/Editar Gasto Fijo --- */}
             {isExpenseModalOpen && (
                <div id="expenseModal" className="modal-overlay active" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget) handleCloseExpenseModal(); }}>
                    <div className="modal-content">
                        <h2 id="modalTitleExpense">{modalMode === 'add' ? 'Añadir Gasto Fijo' : 'Editar Gasto Fijo'}</h2>
                        <form id="expenseForm" onSubmit={handleExpenseFormSubmit}>
                            <input type="hidden" name="expenseId" value={selectedExpense?.id || ''} />
                            <div className="input-group"> <label htmlFor="expenseDescription">Descripción</label> <input type="text" id="expenseDescription" name="description" required value={formData.description} onChange={handleFormChange} disabled={isSaving}/> </div>
                            <div className="input-group"> <label htmlFor="expenseAmount">Importe (€)</label> <input type="number" id="expenseAmount" name="amount" required step="0.01" value={formData.amount} onChange={handleFormChange} disabled={isSaving}/> </div>
                            <div className="input-group"> <label htmlFor="expenseCategory">Categoría</label> <select id="expenseCategory" name="categoryId" required value={formData.categoryId} onChange={handleFormChange} disabled={isSaving}><option value="" disabled>Selecciona...</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select> </div>
                            <div className="input-group"> <label htmlFor="expenseAccount">Cuenta de Cargo</label> <select id="expenseAccount" name="accountId" value={formData.accountId} onChange={handleFormChange} disabled={isSaving}><option value="">(Ninguna específica)</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select> </div>
                            <div className="input-group"> <label htmlFor="expenseFrequency">Frecuencia</label> <select id="expenseFrequency" name="frequency" required value={formData.frequency} onChange={handleFormChange} disabled={isSaving}><option value="" disabled>Selecciona...</option><option value="mensual">Mensual</option><option value="anual">Anual</option><option value="trimestral">Trimestral</option><option value="semestral">Semestral</option><option value="bimestral">Bimestral</option><option value="semanal">Semanal</option><option value="quincenal">Quincenal</option><option value="unico">Una sola vez</option></select> </div>
                            <div className="input-group"> <label htmlFor="expenseNextDueDate">Próxima Fecha Vencimiento</label> <input type="date" id="expenseNextDueDate" name="nextDueDate" required value={formData.nextDueDate} onChange={handleFormChange} disabled={isSaving}/> </div>
                            <div className="input-group checkbox-group"> <input type="checkbox" id="expenseNotification" name="notificationEnabled" checked={formData.notificationEnabled} onChange={handleFormChange} disabled={isSaving}/> <label htmlFor="expenseNotification">Activar Recordatorio</label> </div>
                            <div className="input-group checkbox-group"> <input type="checkbox" id="expenseActive" name="isActive" checked={formData.isActive} onChange={handleFormChange} disabled={isSaving}/> <label htmlFor="expenseActive">Gasto Activo</label> </div>
                            {modalError && <p className="error-message">{modalError}</p>}
                            <div className="modal-actions"> <button type="button" onClick={handleCloseExpenseModal} className="btn btn-secondary" disabled={isSaving}>Cancelar</button> <button type="submit" id="saveExpenseButton" className="btn btn-primary" disabled={isSaving}>{isSaving ? 'Guardando...' : 'Guardar Gasto Fijo'}</button> </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- Botón Scroll-Top --- */}
            {showScrollTop && ( <button onClick={scrollToTop} id="scrollTopBtn" className="scroll-top-btn visible" title="Volver arriba"> <i className="fas fa-arrow-up"></i> </button> )}

        </div> // Fin contenedor flex principal
    );
}

export default FixedExpenses;

