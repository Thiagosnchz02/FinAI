/*
Archivo: src/pages/Debts.jsx
Propósito: Componente para la página de gestión de deudas, incluyendo registro de pagos.
*/
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient'; // Importa cliente Supabase

// Importa imágenes
import finAiLogo from '../assets/Logo_FinAI_Oficial.png';
import defaultAvatar from '../assets/avatar_predeterminado.png';
import emptyMascot from '../assets/monstruo_pixar.png';

// --- Constantes ---
const PAYMENT_CATEGORY_NAME = 'Pago Deudas'; // Nombre exacto categoría GASTO

// --- Funciones de Utilidad --- (Definidas UNA SOLA VEZ, fuera del componente)

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
 * Devuelve una clase de icono Font Awesome basada en palabras clave de la descripción o acreedor de la deuda.
 * @param {string} [description=''] La descripción de la deuda.
 * @param {string} [creditor=''] El nombre del acreedor.
 * @returns {string} La clase CSS del icono Font Awesome.
 */
const getIconForDebt = (description = '', creditor = '') => {
    const desc = (description || '').toLowerCase();
    const cred = (creditor || '').toLowerCase();
    if (desc.includes('coche') || desc.includes('car') || desc.includes('vehiculo') || desc.includes('moto')) return 'fas fa-car-side';
    if (desc.includes('hipoteca') || desc.includes('piso') || desc.includes('vivienda') || desc.includes('propiedad') || desc.includes('property')) return 'fas fa-house-damage';
    if (desc.includes('estudios') || desc.includes('master') || desc.includes('universidad') || desc.includes('educacion') || desc.includes('education')) return 'fas fa-graduation-cap';
    if (desc.includes('personal') || cred.includes('maria') || cred.includes('juan')) return 'fas fa-user-friends';
    if (cred.includes('banco') || cred.includes('bank') || cred.includes('caixa') || cred.includes('santander') || cred.includes('bbva') || cred.includes('ing')) return 'fas fa-landmark';
    return 'fas fa-money-bill-wave';
};

/**
 * Devuelve la clase CSS para el badge de estado de la deuda.
 * @param {string | null | undefined} status El estado de la deuda ('pendiente', 'parcial', 'pagada').
 * @returns {string} La clase CSS correspondiente.
 */
const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
        case 'pagada': return 'status-paid';
        case 'pendiente': return 'status-pending';
        case 'parcial': return 'status-partial';
        default: return 'status-pending';
    }
};

/**
 * Devuelve el texto legible para el estado de la deuda.
 * @param {string | null | undefined} status El estado de la deuda.
 * @returns {string} El texto legible del estado.
 */
const getStatusText = (status) => {
    switch (status?.toLowerCase()) {
        case 'pagada': return 'Pagada';
        case 'pendiente': return 'Pendiente';
        case 'parcial': return 'Parcial';
        default: return 'Pendiente';
    }
};
// --- Fin Funciones de Utilidad ---


// --- Componente Principal ---
function Debts() {
    // --- Estado del Componente ---
    const [userId, setUserId] = useState(null);
    const [avatarUrl, setAvatarUrl] = useState(defaultAvatar);
    const [debts, setDebts] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [paymentCategoryId, setPaymentCategoryId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    // Modales
    const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [selectedDebt, setSelectedDebt] = useState(null);
    const [debtFormData, setDebtFormData] = useState({ creditor: '', description: '', initial_amount: '', current_balance: '', interest_rate: '', due_date: '', status: 'pendiente', notes: '' });
    const [paymentFormData, setPaymentFormData] = useState({ amount: '', date: new Date().toISOString().split('T')[0], accountId: '', notes: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [modalError, setModalError] = useState('');
    // Resumen Footer
    const [showSummaryFooter, setShowSummaryFooter] = useState(false);
    // UI
    const [showScrollTop, setShowScrollTop] = useState(false);

    const navigate = useNavigate();

    // --- Efectos ---
    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const simulatedUserId = 'USER_ID_PLACEHOLDER'; // Reemplazar
                setUserId(simulatedUserId);

                const [profileRes, debtsRes, accountsRes, categoryRes] = await Promise.all([
                    supabase.from('profiles').select('avatar_url').eq('id', simulatedUserId).single(),
                    supabase.from('debts').select('*').eq('user_id', simulatedUserId).order('status').order('due_date'),
                    supabase.from('accounts').select('id, name').eq('user_id', simulatedUserId).order('name'),
                    supabase.from('categories').select('id').eq('name', PAYMENT_CATEGORY_NAME).or(`user_id.eq.${simulatedUserId},is_default.eq.true`).limit(1).single()
                ]);

                if (profileRes.error && profileRes.status !== 406) throw profileRes.error;
                setAvatarUrl(profileRes.data?.avatar_url || defaultAvatar);

                if (debtsRes.error) throw debtsRes.error;
                const fetchedDebts = debtsRes.data || [];
                setDebts(fetchedDebts);
                setShowSummaryFooter(fetchedDebts.length > 0);

                if (accountsRes.error) throw accountsRes.error;
                setAccounts(accountsRes.data || []);

                if (categoryRes.error && categoryRes.status !== 406) throw categoryRes.error;
                if (categoryRes.data) {
                    setPaymentCategoryId(categoryRes.data.id);
                } else {
                    console.warn(`¡Advertencia! No se encontró la categoría "${PAYMENT_CATEGORY_NAME}".`);
                    setError(`Error: Falta la categoría "${PAYMENT_CATEGORY_NAME}".`);
                }

            } catch (err) {
                console.error("Error cargando datos iniciales (Debts):", err);
                setError(err.message || "Error al cargar datos.");
            } finally {
                setIsLoading(false);
            }
        };
        loadInitialData();

        const handleScroll = () => setShowScrollTop(window.scrollY > 300);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [navigate]);

    // --- Cálculo Resumen Footer ---
    const summary = useMemo(() => {
      console.log("Recalculando resumen de deudas..."); // Para depuración
      let totalPending = 0;
      let totalInitialActive = 0;
      let nextDue = null; // Guardará el objeto Date de la próxima fecha
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Poner hora a 0 para comparar solo fechas

      debts.forEach(debt => {
          // Considerar solo deudas no pagadas para los totales y fecha
          if (debt.status !== 'pagada') {
              totalPending += Number(debt.current_balance) || 0;
              totalInitialActive += Number(debt.initial_amount) || 0;

              // Encontrar la próxima fecha de vencimiento futura
              if (debt.due_date) {
                  try {
                      // Convertir la fecha de la deuda a objeto Date
                      const dueDate = new Date(debt.due_date);
                       // Ajustar por zona horaria para evitar problemas al comparar con 'today'
                       // getTimezoneOffset devuelve la diferencia en minutos, la convertimos a ms
                       const offset = dueDate.getTimezoneOffset() * 60 * 1000;
                       // Creamos una nueva fecha ajustada sumando el offset (si es UTC-3, suma 3 horas en ms)
                       const adjustedDueDate = new Date(dueDate.getTime() + offset);
                       adjustedDueDate.setHours(0,0,0,0); // Poner hora a 0 para comparar

                      // Verificar si la fecha es válida y si es futura (o hoy)
                      if (!isNaN(adjustedDueDate.getTime()) && adjustedDueDate >= today) {
                          // Si es la primera fecha futura encontrada O es anterior a la actual 'nextDue'
                          if (nextDue === null || adjustedDueDate < nextDue) {
                              nextDue = adjustedDueDate; // Guardar el objeto Date
                          }
                      }
                  } catch (e) {
                      // Ignorar fechas inválidas si la conversión falla
                      console.error("Error parsing due date for summary:", debt.due_date, e);
                  }
              }
          }
      });

      // Formatear los resultados para devolverlos
      return {
          totalPending: formatCurrency(totalPending),
          totalInitial: formatCurrency(totalInitialActive),
          // Formatear la fecha 'nextDue' encontrada (si existe) o devolver placeholder
          // Convertir de nuevo a formato YYYY-MM-DD antes de formatear con formatDate
          nextDueDate: nextDue ? formatDate(nextDue.toISOString().split('T')[0]) : '--/--/----'
      };
    }, [debts]);

    // --- Manejadores Modales ---
    const handleOpenDebtModal = useCallback((mode = 'add', debt = null) => {
      console.log(`Abriendo modal deuda modo: ${mode}`, debt ? `para ID: ${debt.id}` : '(nuevo)'); // Log para depuración
      setModalMode(mode); // Establece si es 'add' o 'edit'
      setSelectedDebt(debt); // Guarda la deuda completa si estamos editando (null si añadimos)
      setModalError(''); // Limpia cualquier error anterior del modal
      setIsSaving(false); // Asegura que el estado de guardado esté desactivado

      // Poblar el estado del formulario (formData)
      if (mode === 'edit' && debt) {
          // Si estamos editando, rellenar el formulario con los datos de la deuda existente
          setDebtFormData({
              creditor: debt.creditor || '',
              description: debt.description || '',
              initial_amount: debt.initial_amount || '', // Asegurar que sean strings para los inputs
              current_balance: debt.current_balance || '',
              interest_rate: debt.interest_rate || '',
              // Asegurar formato YYYY-MM-DD para input date
              due_date: debt.due_date ? debt.due_date.split('T')[0] : '',
              status: debt.status || 'pendiente',
              notes: debt.notes || ''
          });
      } else {
          // Si estamos añadiendo, resetear el formulario a valores por defecto
          setDebtFormData({
              creditor: '',
              description: '',
              initial_amount: '',
              current_balance: '', // El saldo pendiente inicial suele ser igual al inicial
              interest_rate: '',
              due_date: '',
              status: 'pendiente', // Estado por defecto
              notes: ''
          });
      }
      // Abrir el modal estableciendo su estado a true
      setIsDebtModalOpen(true);

    }, []);
    const handleCloseDebtModal = useCallback(() => setIsDebtModalOpen(false), []);
    // --- Manejadores Modales (Pago Deuda) ---

    /**
     * Abre el modal para registrar un pago para una deuda específica.
     * @param {object} debt El objeto de la deuda para la cual se registrará el pago.
     */
    const handleOpenPaymentModal = useCallback((debt) => {
      // Verificar si se encontró el ID de la categoría de pago al cargar
      if (!paymentCategoryId) {
          // Usar setModalError para mostrar el error en la UI principal podría ser mejor que alert
          setModalError(`Error de configuración: No se encontró la categoría "${PAYMENT_CATEGORY_NAME}". No se pueden registrar pagos.`);
          console.error(`Error: No se encontró la categoría "${PAYMENT_CATEGORY_NAME}".`);
          // Considera mostrar un modal de información o un toast en lugar de alert
          alert(`Error: No se encontró la categoría "${PAYMENT_CATEGORY_NAME}" necesaria para registrar pagos.`);
          return;
      }

      console.log(`Abriendo modal de pago para deuda ID: ${debt.id}`);
      setSelectedDebt(debt); // Guardar la deuda completa seleccionada
      // Resetear el formulario de pago a sus valores iniciales
      setPaymentFormData({
          amount: '', // Limpiar importe
          date: new Date().toISOString().split('T')[0], // Fecha de hoy por defecto
          accountId: '', // Limpiar cuenta seleccionada
          notes: '' // Limpiar notas
      });
      setModalError(''); // Limpiar errores previos del modal
      setIsSaving(false); // Asegurar que no esté en estado de guardado
      setIsPaymentModalOpen(true); // Abrir el modal de pago

      // Opcional: Enfocar el primer campo del modal después de que se abra
      // setTimeout(() => document.getElementById('paymentAmount')?.focus(), 100); // Requiere que el modal ya esté renderizado

  }, [paymentCategoryId]); // Depende de paymentCategoryId para la validación inicial

  /**
   * Cierra el modal de registro de pago.
   */
  const handleClosePaymentModal = useCallback(() => {
      setIsPaymentModalOpen(false);
      // Opcional: Limpiar selectedDebt si ya no se necesita fuera del modal
      // setSelectedDebt(null);
  }, []);

    // --- Manejadores Formularios (handleDebtFormChange completa) ---

    /**
     * Maneja los cambios en cualquier input del formulario del modal de deuda.
     * Actualiza el estado 'debtFormData' de forma genérica usando el atributo 'name' del input.
     * @param {React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>} event El evento de cambio del input.
     */
    const handleDebtFormChange = useCallback((event) => {
      // Extrae el nombre (name) y el valor (value) del input que disparó el evento.
      const { name, value } = event.target;

      // Actualiza el estado 'debtFormData'.
      // Usa el callback de setState para asegurar que se basa en el estado más reciente.
      setDebtFormData(prevData => ({
          ...prevData, // Mantiene todos los valores anteriores del formulario...
          [name]: value // ...y actualiza solo el campo cuyo 'name' coincide con el del input.
                       // La sintaxis [name] usa el valor de la variable 'name' como clave del objeto.
      }));

      // Si había un mensaje de error visible en el modal, lo limpia al empezar a escribir.
      if (modalError) {
          setModalError('');
      }
    }, [modalError]);
    // --- Manejadores Formularios (handlePaymentFormChange completa) ---

    /**
     * Maneja los cambios en cualquier input del formulario del modal de registro de pago.
     * Actualiza el estado 'paymentFormData'.
     * @param {React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>} event El evento de cambio del input.
     */
    const handlePaymentFormChange = useCallback((event) => {
      // Extrae el nombre (name) y el valor (value) del input.
      const { name, value } = event.target;

      // Actualiza el estado 'paymentFormData'.
      setPaymentFormData(prevData => ({
          ...prevData, // Mantiene los valores anteriores...
          [name]: value  // ...y actualiza el campo correspondiente.
      }));

      // Limpia el error del modal si existe.
      if (modalError) {
          setModalError('');
      }
    }, [modalError]);

    // Submit Modal Deuda
    // --- Manejadores Formularios (handleDebtFormSubmit completa) ---

    /**
     * Maneja el envío del formulario del modal para añadir o editar una deuda.
     * Valida los datos, llama a Supabase (insert o update) y actualiza la lista.
     * @param {React.FormEvent<HTMLFormElement>} event El evento de envío del formulario.
     */
    const handleDebtFormSubmit = useCallback(async (event) => {
      event.preventDefault(); // Prevenir el envío HTML por defecto
      if (!userId) {
          setModalError("Error: Usuario no identificado. No se puede guardar.");
          return;
      }

      // Validaciones Frontend
      const initialAmount = parseFloat(debtFormData.initial_amount);
      const currentBalance = parseFloat(debtFormData.current_balance);
      const interestRate = parseFloat(debtFormData.interest_rate);

      if (!debtFormData.creditor.trim()) {
          setModalError('El nombre del Acreedor es obligatorio.'); return;
      }
      if (isNaN(initialAmount) || initialAmount <= 0) {
          setModalError('El Importe Inicial debe ser un número mayor que cero.'); return;
      }
      if (isNaN(currentBalance) || currentBalance < 0) {
          setModalError('El Saldo Pendiente debe ser un número igual o mayor que cero.'); return;
      }
      if (debtFormData.interest_rate && (isNaN(interestRate) || interestRate < 0)) {
           setModalError('La Tasa de Interés, si se introduce, debe ser un número igual o mayor que cero.'); return;
      }
      // Opcional: Validar que current_balance no sea mayor que initial_amount
      if (currentBalance > initialAmount) {
           setModalError('El Saldo Pendiente no puede ser mayor que el Importe Inicial.'); return;
      }
      // Opcional: Validar formato de fecha si se introduce
      if (debtFormData.due_date && isNaN(new Date(debtFormData.due_date).getTime())) {
           setModalError('El formato de la Fecha de Vencimiento no es válido.'); return;
      }

      setModalError(''); // Limpiar errores previos
      setIsSaving(true); // Activar estado de carga

      try {
          // Preparar el objeto de datos a guardar/actualizar
          const dataToSave = {
              user_id: userId, // Siempre incluir para RLS
              creditor: debtFormData.creditor.trim(),
              description: debtFormData.description.trim() || null,
              initial_amount: initialAmount,
              current_balance: currentBalance,
              interest_rate: !isNaN(interestRate) ? interestRate : null, // Guardar null si está vacío o no es número
              due_date: debtFormData.due_date || null, // Guardar null si está vacío
              status: debtFormData.status,
              notes: debtFormData.notes.trim() || null,
          };

          let error; // Variable para guardar el error de Supabase

          if (modalMode === 'edit' && selectedDebt) {
              // --- UPDATE ---
              console.log(`Actualizando deuda ID: ${selectedDebt.id}`, dataToSave);
              // Añadir updated_at para la actualización
              dataToSave.updated_at = new Date();
              // No necesitamos enviar user_id en update si RLS está bien configurado,
              // pero añadirlo explícitamente no hace daño si la columna existe.
              // delete dataToSave.user_id; // Opcional quitarlo

              const { error: updateError } = await supabase
                  .from('debts')
                  .update(dataToSave)
                  .eq('id', selectedDebt.id)
                  .eq('user_id', userId); // Asegurar que solo actualiza las del usuario
              error = updateError;

          } else {
              // --- INSERT ---
              console.log("Creando nueva deuda:", dataToSave);
              // No enviar updated_at en insert si la DB tiene un default now()
              // delete dataToSave.updated_at;

              const { error: insertError } = await supabase
                  .from('debts')
                  .insert([dataToSave]); // Insert espera un array
              error = insertError;
          }

          // Comprobar si hubo error en la operación
          if (error) {
              throw error; // Lanzar al bloque catch
          }

          // --- Éxito ---
          console.log(`Deuda ${modalMode === 'edit' ? 'actualizada' : 'creada'} con éxito.`);
          handleCloseDebtModal(); // Cerrar el modal

          // Recargar la lista de deudas para reflejar los cambios
          // Es mejor hacer un fetch nuevo que intentar manipular el estado local directamente
          // sobre todo si hay ordenación o paginación.
          console.log("Recargando lista de deudas...");
          const { data: refreshedDebts, error: refreshError } = await supabase
              .from('debts')
              .select('*')
              .eq('user_id', userId)
              .order('status') // Mantener el orden
              .order('due_date');
          if (refreshError) {
               console.error("Error recargando deudas tras guardar:", refreshError);
               // Mostrar un mensaje no bloqueante si falla la recarga?
          } else {
               setDebts(refreshedDebts || []); // Actualizar estado con datos frescos
               setShowSummaryFooter((refreshedDebts || []).length > 0); // Actualizar visibilidad footer
          }

      } catch (err) {
          // --- Manejo de Errores ---
          console.error('Error guardando deuda:', err);
          // Mostrar mensaje de error específico en el modal
          setModalError(`Error: ${err.message || 'Ocurrió un error desconocido.'}`);
      } finally {
          // --- Finalización ---
          setIsSaving(false); // Desactivar estado de carga siempre
      }
    }, [userId, modalMode, selectedDebt, debtFormData, supabase, handleCloseDebtModal]);

    // Submit Modal Pago
    // --- Manejadores Formularios (handlePaymentFormSubmit completa) ---

    /**
     * Maneja el envío del formulario para registrar un pago realizado hacia una deuda.
     * Crea una transacción de gasto y actualiza el saldo/estado de la deuda.
     * @param {React.FormEvent<HTMLFormElement>} event El evento de envío del formulario.
     */
    const handlePaymentFormSubmit = useCallback(async (event) => {
      event.preventDefault(); // Prevenir envío HTML
      // Validar que tenemos todo lo necesario antes de empezar
      if (!userId || !selectedDebt || !paymentCategoryId) {
          setModalError(!paymentCategoryId ? `Error de Configuración: No se encontró la categoría "${PAYMENT_CATEGORY_NAME}".` : 'Error inesperado: Falta información de usuario o deuda.');
          console.error("Error pre-submit pago:", { userId, selectedDebt, paymentCategoryId });
          return;
      }

      // Obtener datos del formulario desde el estado 'paymentFormData'
      const paymentAmount = parseFloat(paymentFormData.amount);
      const paymentDate = paymentFormData.date;
      const accountId = paymentFormData.accountId; // Cuenta desde la que se pagó
      const paymentNotes = paymentFormData.notes.trim() || null;

      // Validaciones de inputs
      if (!accountId) { setModalError('Debes seleccionar la cuenta de origen del pago.'); return; }
      if (!paymentDate) { setModalError('La fecha del pago es obligatoria.'); return; }
      if (isNaN(paymentAmount) || paymentAmount <= 0) { setModalError('El importe pagado debe ser un número mayor que cero.'); return; }

      const currentBalance = Number(selectedDebt.current_balance) || 0;

      // Confirmación si se paga más de lo pendiente
      if (paymentAmount > currentBalance) {
          if (!window.confirm(`Estás registrando un pago de ${formatCurrency(paymentAmount)}, que es más de lo pendiente (${formatCurrency(currentBalance)}).\n\n¿Continuar de todas formas? El saldo de la deuda quedará en 0.`)) {
              return; // No continuar si el usuario cancela
          }
          // Si continúa, el importe a registrar sigue siendo el introducido,
          // pero el nuevo saldo de la deuda será 0.
      }

      setModalError(''); // Limpiar errores previos
      setIsSaving(true); // Activar estado de carga

      try {
          // --- Paso 1: Crear la transacción de GASTO ---
          const transactionData = {
              user_id: userId,
              account_id: accountId, // La cuenta desde donde salió el dinero
              category_id: paymentCategoryId, // La categoría "Pago Deudas"
              type: 'gasto', // Es un gasto desde la cuenta seleccionada
              // Descripción más detallada
              description: `Pago deuda a ${selectedDebt.creditor}` + (selectedDebt.description ? ` (${selectedDebt.description})` : ''),
              amount: -Math.abs(paymentAmount), // GUARDAR COMO NEGATIVO porque es un gasto
              transaction_date: paymentDate,
              notes: paymentNotes,
              related_debt_id: selectedDebt.id // Enlazar a la deuda (¡asegúrate que esta columna existe!)
          };

          console.log("Creando transacción de pago:", transactionData);
          const { error: txError } = await supabase
              .from('transactions')
              .insert([transactionData]);

          if (txError) {
              // Si falla la creación de la transacción, no continuar actualizando la deuda
              throw new Error(`Error al registrar la transacción del pago: ${txError.message}`);
          }
          console.log("Transacción de pago creada con éxito.");

          // --- Paso 2: Actualizar la Deuda ---
          // Calcular nuevo saldo (asegurando que no sea negativo)
          const newBalance = Math.max(0, currentBalance - paymentAmount);
          // Determinar nuevo estado (si el nuevo saldo es 0 o menos, marcar como pagada)
          const newStatus = newBalance <= 0 ? 'pagada' : selectedDebt.status; // Mantener 'parcial' si ya lo era y no se completa

          console.log(`Actualizando deuda ID: ${selectedDebt.id} -> Nuevo Saldo=${newBalance}, Nuevo Estado=${newStatus}`);
          const { error: debtUpdateError } = await supabase
              .from('debts')
              .update({
                  current_balance: newBalance,
                  status: newStatus,
                  updated_at: new Date() // Actualizar timestamp
              })
              .eq('id', selectedDebt.id)
              .eq('user_id', userId); // Seguridad

          if (debtUpdateError) {
              // Podríamos considerar revertir la transacción si la actualización de la deuda falla,
              // pero es complejo. Por ahora, solo mostramos el error.
              throw new Error(`Error al actualizar el saldo de la deuda: ${debtUpdateError.message}`);
          }
          console.log("Deuda actualizada con éxito.");

          // --- Éxito Total ---
          alert('Pago registrado y deuda actualizada correctamente.'); // Reemplazar por notificación/toast
          handleClosePaymentModal(); // Cerrar el modal de pago

          // Recargar la lista de deudas para reflejar el cambio de saldo/estado
          console.log("Recargando lista de deudas tras registrar pago...");
          const { data: refreshedDebts, error: refreshError } = await supabase
              .from('debts')
              .select('*')
              .eq('user_id', userId)
              .order('status')
              .order('due_date');
          if (refreshError) {
               console.error("Error recargando deudas tras pago:", refreshError);
               // Podríamos mostrar un error no bloqueante aquí
          } else {
               setDebts(refreshedDebts || []);
               setShowSummaryFooter((refreshedDebts || []).length > 0);
               // También podrías querer recargar otros resúmenes si el pago afecta (ej. saldo total cuentas)
                fetchAccountsSummary(userId); // Si la tienes definida
          }

      } catch (error) {
          // --- Manejo de Errores ---
          console.error('Error procesando pago de deuda:', error);
          setModalError(`Error: ${error.message}`); // Mostrar error en el modal de pago
      } finally {
          // --- Finalización ---
          setIsSaving(false); // Desactivar estado de carga siempre
      }
    }, [userId, selectedDebt, paymentFormData, paymentCategoryId, accounts, supabase, handleClosePaymentModal]);

    // Manejador Eliminación
    // --- Manejador Eliminación ---

    /**
     * Maneja la eliminación de una deuda específica.
     * Pide confirmación, llama a Supabase para eliminar y actualiza el estado local.
     * @param {string} debtId El ID de la deuda a eliminar.
     * @param {string} debtCreditor El nombre del acreedor (para mensaje de confirmación).
     */
    const handleDeleteDebt = useCallback(async (debtId, debtCreditor) => {
      if (!userId) {
          console.error("Intento de eliminar deuda sin usuario identificado.");
          alert("Error: No se pudo identificar al usuario."); // O mostrar error en UI
          return;
      }
      if (!debtId) {
          console.error("Intento de eliminar deuda sin ID.");
          return;
      }

      // --- Confirmación ---
      // !! IMPORTANTE: Reemplazar window.confirm con un modal de confirmación en una app real !!
      // Por ejemplo, podrías tener otro estado como 'isConfirmDeleteModalOpen'
      // y una función para manejar la confirmación desde ese modal.
      const confirmDelete = window.confirm(
          `¿Estás SEGURO de que quieres eliminar permanentemente la deuda con "${debtCreditor || 'Desconocido'}"?\n\n` +
          `¡Esta acción no se puede deshacer!\n` +
          `(Nota: No se podrá eliminar si tiene pagos registrados asociados).`
      );

      if (!confirmDelete) {
          return; // El usuario canceló
      }

      console.log('Intentando eliminar deuda ID:', debtId);
      // Podríamos añadir un estado de carga específico para la eliminación si la UI lo requiere

      try {
          // --- Llamada a Supabase ---
          const { error } = await supabase
              .from('debts')
              .delete()
              .eq('id', debtId)
              .eq('user_id', userId); // Asegurar que solo borra las del usuario

          // --- Manejo de Errores ---
          if (error) {
              // Error específico si hay transacciones asociadas (Foreign Key Violation)
              if (error.code === '23503') { // Código PostgreSQL para FK violation
                  console.error('Error FK al eliminar deuda:', error);
                  alert('Error: No se puede eliminar esta deuda porque tiene pagos registrados asociados. Primero debes eliminar o desvincular esos pagos.');
              } else {
                  // Otro error de Supabase
                  throw error; // Lanzar para el catch general
              }
          } else {
              // --- Éxito ---
              console.log('Deuda eliminada con éxito de Supabase');
              alert('Deuda eliminada.'); // Reemplazar por notificación/toast

              // Actualizar el estado local 'debts' quitando la deuda eliminada
              setDebts(prevDebts => prevDebts.filter(d => d.id !== debtId));
              // El resumen del footer se recalculará automáticamente gracias a useMemo
              // setShowSummaryFooter se actualizará si la longitud de debts llega a 0 (implícito)
          }

      } catch (error) {
          // --- Captura de Errores Generales ---
          console.error('Error eliminando deuda:', error);
          alert(`Error al eliminar la deuda: ${error.message || 'Error desconocido.'}`);
      } finally {
          // Quitar estado de carga específico si se añadió
      }
    }, [userId, supabase, setDebts]);

    // Otros manejadores
    const handleLogout = useCallback(() => console.log('Logout pendiente'), []);
    const handleBack = useCallback(() => navigate(-1), [navigate]);
    const scrollToTop = useCallback(() => window.scrollTo({ top: 0, behavior: 'smooth' }), []);

    // --- Renderizado ---
    return (
        <div style={{ display: 'flex' }}>

            {/* --- Sidebar (Reutilizable) --- */}
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
                      <Link to="/debts" className="nav-button active" title="Deudas"><i className="fas fa-credit-card"></i> <span>Deudas</span></Link> {/* Active */}
                      <Link to="/loans" className="nav-button" title="Préstamos"><i className="fas fa-hand-holding-usd"></i> <span>Préstamos</span></Link>
                      <Link to="/fixed-expenses" className="nav-button" title="Gastos Fijos"><i className="fas fa-receipt"></i> <span>Gastos Fijos</span></Link>
                      <Link to="/goals" className="nav-button" title="Metas"><i className="fas fa-bullseye"></i> <span>Metas</span></Link>
                  </nav>
                  <button className="nav-button logout-button" onClick={handleLogout} title="Cerrar Sesión"><i className="fas fa-sign-out-alt"></i> <span>Salir</span></button>
            </aside>

            {/* --- Contenido Principal --- */}
            <div className="page-container">
                {/* --- Cabecera --- */}
                <div className="page-header debts-header">
                    <button onClick={handleBack} id="backButton" className="btn-icon" aria-label="Volver"><i className="fas fa-arrow-left"></i></button>
                    <div className="header-title-group"> <img id="userAvatarHeader" src={avatarUrl} alt="Avatar" className="header-avatar-small" /> <h1>Mis Deudas</h1> </div>
                    <button onClick={() => handleOpenDebtModal('add')} id="addDebtBtn" className="btn btn-primary btn-add"> <i className="fas fa-plus"></i> Añadir Deuda </button>
                </div>

                {/* --- Lista de Deudas --- */}
                <div id="debtList" className="debt-list-grid">
                    {isLoading && ( <p id="loadingDebtsMessage" style={{ textAlign: 'center', padding: '20px', color: '#666', gridColumn: '1 / -1' }}>Cargando deudas...</p> )}
                    {error && !isLoading && ( <p style={{ textAlign: 'center', padding: '20px', color: 'red', gridColumn: '1 / -1' }}>{error}</p> )}
                    {!isLoading && !error && debts.length === 0 && ( <div id="noDebtsMessage" className="empty-list-message" style={{ gridColumn: '1 / -1' }}> <img src={emptyMascot} alt="Mascota FinAi Feliz" className="empty-mascot" /> <p>¡Enhorabuena! No tienes deudas registradas.</p> <p>Si tienes alguna, añádela.</p> <button onClick={() => handleOpenDebtModal('add')} id="addDebtFromEmptyBtn" className="btn btn-primary"> <i className="fas fa-plus"></i> Añadir Mi Primera Deuda </button> </div> )}
                    {!isLoading && !error && debts.length > 0 && (
                        debts.map(debt => {
                            const iconClass = getIconForDebt(debt.description, debt.creditor);
                            const statusBadgeClass = getStatusBadgeClass(debt.status);
                            const statusText = getStatusText(debt.status);
                            return (
                                <div key={debt.id} className="debt-card" data-id={debt.id} data-status={debt.status}>
                                    <div className="debt-icon-status"><div className="debt-icon-bg"><i className={iconClass}></i></div><span className={`debt-status-badge ${statusBadgeClass}`}>{statusText}</span></div>
                                    <div className="debt-info">
                                        <h3 className="debt-creditor">{debt.creditor}</h3><p className="debt-description">{debt.description || 'Sin descripción'}</p>
                                        <div className="info-item"><span className="info-label">Importe Inicial</span><span className="info-value">{formatCurrency(debt.initial_amount)}</span></div>
                                        <div className="info-item"><span className="info-label">Vencimiento</span><span className="info-value">{formatDate(debt.due_date)}</span></div>
                                        <div className="info-item"><span className="info-label">Saldo Pendiente</span><span className="info-value balance">{formatCurrency(debt.current_balance)}</span></div>
                                        <div className="info-item"><span className="info-label">Estado</span><span className="info-value status-text">{statusText}</span></div>
                                    </div>
                                    <div className="debt-actions">
                                        {debt.status !== 'pagada' && <button onClick={() => handleOpenPaymentModal(debt)} className="btn-icon btn-add-payment" aria-label="Añadir Pago" title="Añadir Pago"><i className="fas fa-dollar-sign"></i></button>}
                                        <button onClick={() => handleOpenDebtModal('edit', debt)} className="btn-icon btn-edit" aria-label="Editar"><i className="fas fa-pencil-alt"></i></button>
                                        <button onClick={() => handleDeleteDebt(debt.id, debt.creditor)} className="btn-icon btn-delete" aria-label="Eliminar"><i className="fas fa-trash-alt"></i></button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* --- Footer Resumen (Condicional) --- */}
                {showSummaryFooter && !isLoading && !error && (
                  <div id="summary-footer" className="summary-footer">
                     <div className="summary-box blue"> <span className="summary-label">Total Pendiente</span> <strong id="totalPendingAmount">{summary.totalPending}</strong> </div>
                     <div className="summary-box green"> <span className="summary-label">Total Inicial</span> <strong id="totalInitialAmount">{summary.totalInitial}</strong> <small>(Deudas Activas)</small> </div>
                     <div className="summary-box purple"> <span className="summary-label">Próximo Vencimiento</span> <strong id="nextDueDate">{summary.nextDueDate}</strong> </div>
                  </div>
                )}

            </div> {/* Fin page-container */}

            {/* --- Modal Añadir/Editar Deuda --- */}
            {isDebtModalOpen && (
                <div id="debtModal" className="modal-overlay active" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget) handleCloseDebtModal(); }}>
                    <div className="modal-content">
                        <h2 id="modalTitleDebt">{modalMode === 'add' ? 'Añadir Nueva Deuda' : 'Editar Deuda'}</h2>
                        <form id="debtForm" onSubmit={handleDebtFormSubmit}>
                            <input type="hidden" name="debtId" value={selectedDebt?.id || ''} />
                            <div className="input-group"> <label htmlFor="debtCreditor">Acreedor</label> <input type="text" id="debtCreditor" name="creditor" required value={debtFormData.creditor} onChange={handleDebtFormChange} disabled={isSaving}/> </div>
                            <div className="input-group"> <label htmlFor="debtDescription">Descripción</label> <input type="text" id="debtDescription" name="description" value={debtFormData.description} onChange={handleDebtFormChange} disabled={isSaving}/> </div>
                            <div className="input-group"> <label htmlFor="debtInitialAmount">Importe Inicial (€)</label> <input type="number" id="debtInitialAmount" name="initial_amount" required step="0.01" min="0.01" value={debtFormData.initial_amount} onChange={handleDebtFormChange} disabled={isSaving}/> </div>
                            <div className="input-group"> <label htmlFor="debtCurrentBalance">Saldo Pendiente Actual (€)</label> <input type="number" id="debtCurrentBalance" name="current_balance" required step="0.01" min="0" value={debtFormData.current_balance} onChange={handleDebtFormChange} disabled={isSaving}/> <small>Se actualizará al registrar pagos.</small> </div>
                            <div className="input-group"> <label htmlFor="debtInterestRate">Tasa Interés Anual (%)</label> <input type="number" id="debtInterestRate" name="interest_rate" step="0.01" min="0" value={debtFormData.interest_rate} onChange={handleDebtFormChange} disabled={isSaving}/> </div>
                            <div className="input-group"> <label htmlFor="debtDueDate">Fecha Vencimiento Final</label> <input type="date" id="debtDueDate" name="due_date" value={debtFormData.due_date} onChange={handleDebtFormChange} disabled={isSaving}/> </div>
                            <div className="input-group"> <label htmlFor="debtStatus">Estado</label> <select id="debtStatus" name="status" required value={debtFormData.status} onChange={handleDebtFormChange} disabled={isSaving}><option value="pendiente">Pendiente</option><option value="parcial">Parcialmente Pagada</option><option value="pagada">Pagada</option></select> </div>
                            <div className="input-group"> <label htmlFor="debtNotes">Notas</label> <textarea id="debtNotes" name="notes" rows={2} value={debtFormData.notes} onChange={handleDebtFormChange} disabled={isSaving}></textarea> </div>
                            {modalError && <p className="error-message">{modalError}</p>}
                            <div className="modal-actions"> <button type="button" onClick={handleCloseDebtModal} className="btn btn-secondary" disabled={isSaving}>Cancelar</button> <button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? 'Guardando...' : 'Guardar Deuda'}</button> </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- Modal Registrar Pago --- */}
            {isPaymentModalOpen && selectedDebt && (
                <div id="addPaymentModal" className="modal-overlay small active" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget) handleClosePaymentModal(); }}>
                    <div className="modal-content">
                        <h2 id="modalTitlePayment">Registrar Pago</h2>
                        <form id="addPaymentForm" onSubmit={handlePaymentFormSubmit}>
                            <input type="hidden" name="paymentDebtId" value={selectedDebt.id} />
                            <p>Registrar pago para la deuda con: <strong>{selectedDebt.creditor || 'N/A'}</strong></p>
                            <p>Saldo pendiente actual: <strong>{formatCurrency(selectedDebt.current_balance)}</strong></p>
                            <div className="input-group"> <label htmlFor="paymentAmount">Importe Pagado (€)</label> <input type="number" id="paymentAmount" name="amount" required step="0.01" min="0.01" value={paymentFormData.amount} onChange={handlePaymentFormChange} disabled={isSaving}/> </div>
                            <div className="input-group"> <label htmlFor="paymentDate">Fecha del Pago</label> <input type="date" id="paymentDate" name="date" required value={paymentFormData.date} onChange={handlePaymentFormChange} disabled={isSaving}/> </div>
                            <div className="input-group"> <label htmlFor="paymentAccount">Cuenta de Origen</label> <select id="paymentAccount" name="accountId" required value={paymentFormData.accountId} onChange={handlePaymentFormChange} disabled={isSaving}><option value="" disabled>Selecciona...</option>{accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select> </div>
                            <div className="input-group"> <label htmlFor="paymentNotes">Notas del Pago</label> <textarea id="paymentNotes" name="notes" rows={2} value={paymentFormData.notes} onChange={handlePaymentFormChange} disabled={isSaving}></textarea> </div>
                            {modalError && <p className="error-message">{modalError}</p>}
                            <div className="modal-actions"> <button type="button" onClick={handleClosePaymentModal} className="btn btn-secondary" disabled={isSaving}>Cancelar</button> <button type="submit" id="savePaymentButton" className="btn btn-primary" disabled={isSaving}>{isSaving ? 'Registrando...' : 'Registrar Pago'}</button> </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- Botón Scroll-Top --- */}
            {showScrollTop && ( <button onClick={scrollToTop} id="scrollTopBtn" className="scroll-top-btn visible" title="Volver arriba"> <i className="fas fa-arrow-up"></i> </button> )}

        </div> // Fin contenedor flex principal
    );
}

export default Debts;


