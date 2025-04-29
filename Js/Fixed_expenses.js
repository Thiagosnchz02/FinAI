// fixedExpenses.js
// ASEGÚRATE que supabase-init.js y auth-listener.js se cargaron antes
// Y que la librería del Calendario (ej: FullCalendar) está cargada

console.log('DEBUG: fixedExpenses.js - Cargado');

if (typeof supabase === 'undefined' || supabase === null) {
    console.error('FixedExpenses.js: ¡Error Crítico! Cliente Supabase no inicializado.');
    // Manejar error en UI si es posible
} else {
    console.log('FixedExpenses.js: Cliente Supabase encontrado. Procediendo...');

    // --- Selección de Elementos DOM ---
    const backButton = document.getElementById('backButton');
    const userAvatarSmall = document.getElementById('userAvatarSmall');
    const addExpenseBtn = document.getElementById('addExpenseBtn');
    const monthlyTotalAmount = document.getElementById('monthlyTotalAmount');
    const listViewBtn = document.getElementById('listViewBtn');
    const calendarViewBtn = document.getElementById('calendarViewBtn');
    const listViewContainer = document.getElementById('listViewContainer');
    const calendarViewContainer = document.getElementById('calendarViewContainer');
    const fixedExpensesTableBody = document.getElementById('fixedExpensesTableBody');
    const tableLoadingMessage = document.getElementById('tableLoadingMessage');
    const noExpensesMessage = document.getElementById('noExpensesMessage');
    const calendarEl = document.getElementById('calendar');
    const scrollTopBtn = document.getElementById('scrollTopBtn');
    // Modal elements
    const expenseModal = document.getElementById('expenseModal');
    const expenseForm = document.getElementById('expenseForm');
    const modalTitleExpense = document.getElementById('modalTitleExpense');
    const expenseIdInput = document.getElementById('expenseId');
    const expenseDescriptionInput = document.getElementById('expenseDescription');
    const expenseAmountInput = document.getElementById('expenseAmount');
    const expenseCategoryInput = document.getElementById('expenseCategory');
    const expenseAccountInput = document.getElementById('expenseAccount');
    const expenseFrequencyInput = document.getElementById('expenseFrequency');
    const expenseNextDueDateInput = document.getElementById('expenseNextDueDate');
    const expenseNotificationInput = document.getElementById('expenseNotification');
    const expenseActiveInput = document.getElementById('expenseActive');
    const cancelExpenseButton = document.getElementById('cancelExpenseButton');
    const saveExpenseButton = document.getElementById('saveExpenseButton');
    const modalExpenseError = document.getElementById('modalExpenseError');

    // --- Variables de Estado ---
    let currentUserId = null;
    let categories = []; // Cache categorías de gasto
    let accounts = []; // Cache cuentas
    let fixedExpenses = []; // Cache gastos fijos
    let calendarInstance = null;
    let currentView = 'list';
    let categoriesLoaded = false;

    // --- URL Avatar por Defecto ---
    const defaultAvatarPath = 'https://finai.es/images/avatar_predeterminado.png';

    // --- Funciones Auxiliares ---
    function formatCurrency(value, currency = 'EUR') {
        if (isNaN(value) || value === null) return 'N/A';
        return new Intl.NumberFormat('es-ES', { style: 'currency', currency: currency, minimumFractionDigits: 2 }).format(value);
    }
    const iconMap = { /* ... (el mismo mapeo de categories.js) ... */ };
    function getIconClass(iconKeyword) { return iconMap[iconKeyword?.toLowerCase()] || (iconKeyword?.startsWith('fa') ? iconKeyword : 'fas fa-tag') ; }
    function formatDate(dateString) {
        if (!dateString) return '';
        try { const date = new Date(dateString); if (isNaN(date.getTime())) return '';
            // Ajuste para asegurar que la fecha local sea la correcta (evita problemas de zona horaria)
            const offset = date.getTimezoneOffset();
            const adjustedDate = new Date(date.getTime() + (offset*60*1000));
            const day = String(adjustedDate.getDate()).padStart(2, '0');
            const month = String(adjustedDate.getMonth() + 1).padStart(2, '0');
            const year = adjustedDate.getFullYear(); return `${day}/${month}/${year}`;
        } catch (e) { console.error("Error formateando fecha:", dateString, e); return ''; }
    }
    function populateSelect(selectElement, items, valueField = 'id', textField = 'name', defaultOptionText = 'Selecciona...', includeAllOption = false, allOptionText = 'Todos/as', firstOptionValue = '') {
        if (!selectElement) return; selectElement.innerHTML = '';
        if (includeAllOption) { const allOpt = document.createElement('option'); allOpt.value = 'all'; allOpt.textContent = allOptionText; selectElement.appendChild(allOpt); }
        if (defaultOptionText) { const defaultOpt = document.createElement('option'); defaultOpt.value = firstOptionValue; defaultOpt.textContent = defaultOptionText; /*if (!includeAllOption) defaultOpt.selected = true;*/ selectElement.appendChild(defaultOpt); } // Default a valor vacío
        items.forEach(item => { const option = document.createElement('option'); option.value = item[valueField]; option.textContent = item[textField]; selectElement.appendChild(option); });
    }

    // --- Funciones Modales ---
    function toggleExpenseModal(show) {
        if (!expenseModal) return;
        if (show) {
            expenseModal.style.display = 'flex';
            setTimeout(() => expenseModal.classList.add('active'), 10);
        } else {
            expenseModal.classList.remove('active');
            setTimeout(() => {
                expenseModal.style.display = 'none';
                if (expenseForm) expenseForm.reset();
                if (expenseIdInput) expenseIdInput.value = '';
                if (modalExpenseError) {
                     modalExpenseError.textContent = '';
                     modalExpenseError.style.display = 'none';
                }
                 // Resetear checkboxes a default (checked)
                 if (expenseNotificationInput) expenseNotificationInput.checked = true;
                 if (expenseActiveInput) expenseActiveInput.checked = true;
            }, 300);
        }
    }

    function openExpenseModal(expense = null) {
        if (!expenseForm || !modalTitleExpense || !expenseIdInput || !expenseDescriptionInput || !expenseAmountInput || !expenseCategoryInput || !expenseAccountInput || !expenseFrequencyInput || !expenseNextDueDateInput || !expenseNotificationInput || !expenseActiveInput || !saveExpenseButton) {
            console.error("Error: Elementos del modal de gasto fijo no encontrados."); return; }

        expenseForm.reset();
        expenseIdInput.value = '';
        modalExpenseError.style.display = 'none';
        saveExpenseButton.disabled = false;
        saveExpenseButton.textContent = 'Guardar Gasto Fijo';

        // Poblar Selects (Asegurarse que categories y accounts están cargadas)
        populateSelect(expenseCategoryInput, categories, 'id', 'name', 'Selecciona categoría...');
        populateSelect(expenseAccountInput, accounts, 'id', 'name', '(Ninguna específica)', false, ''); // Opción vacía con valor ''

        if (expense) { // Modo Edición
            modalTitleExpense.textContent = 'Editar Gasto Fijo';
            expenseIdInput.value = expense.id;
            expenseDescriptionInput.value = expense.description;
            expenseAmountInput.value = expense.amount;
            expenseCategoryInput.value = expense.category_id || '';
            expenseAccountInput.value = expense.account_id || '';
            expenseFrequencyInput.value = expense.frequency || '';
            expenseNextDueDateInput.value = expense.next_due_date || '';
            expenseNotificationInput.checked = expense.notification_enabled !== false; // Default true si es null
            expenseActiveInput.checked = expense.is_active !== false; // Default true si es null

        } else { // Modo Añadir
            modalTitleExpense.textContent = 'Añadir Gasto Fijo';
            // Poner fecha de hoy por defecto en el date picker
             expenseNextDueDateInput.valueAsDate = new Date();
            expenseNotificationInput.checked = true; // Default checked
            expenseActiveInput.checked = true; // Default checked
        }
        toggleExpenseModal(true);
    }

    function closeExpenseModal() {
        toggleExpenseModal(false);
    }

    // --- Funciones de Visualización ---

    function displayMonthlyTotal(expenses) {
        if (!monthlyTotalAmount) return;
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        let total = 0;
        expenses.forEach(exp => {
            if (exp.is_active) {
                // Lógica simplificada para total mensual
                if (exp.frequency === 'mensual') {
                    total += Number(exp.amount) || 0;
                } else if (exp.next_due_date) {
                     try { const nextDueDate = new Date(exp.next_due_date);
                     // Si vence este mes/año Y NO es anual/semestral/etc lejano
                     if (nextDueDate.getFullYear() === currentYear && nextDueDate.getMonth() === currentMonth) {
                          // Podríamos intentar prorratear anuales/semestrales, pero es complejo
                          // Por simplicidad, solo sumamos los mensuales o los que venzan este mes
                           if (exp.frequency !== 'anual' && exp.frequency !== 'semestral' && exp.frequency !== 'trimestral') {
                               total += Number(exp.amount) || 0;
                           }
                           // Para anual/semestral/trimestral, solo sumar si vence este mes? O prorratear?
                           // Sumemos si vence este mes:
                            else { total += Number(exp.amount) || 0; }
                     }} catch(e){}
                }
            }
        });
        monthlyTotalAmount.textContent = formatCurrency(total);
    }

    function displayFixedExpensesList(expenses) {
         if (!fixedExpensesTableBody || !noExpensesMessage || !tableLoadingMessage) return;
         fixedExpensesTableBody.innerHTML = '';
         if (!expenses || expenses.length === 0) {
             noExpensesMessage.style.display = 'block';
             if (tableLoadingMessage) tableLoadingMessage.parentElement.style.display = 'none';
             return;
         }
         noExpensesMessage.style.display = 'none';
         if (tableLoadingMessage) tableLoadingMessage.parentElement.style.display = 'none';

         expenses.forEach(exp => {
             const row = document.createElement('tr');
             row.setAttribute('data-id', exp.id);
             row.style.opacity = exp.is_active ? 1 : 0.6; // Atenuar inactivos

             const category = categories.find(c => c.id === exp.category_id);
             const categoryName = category?.name || '(Sin Cat.)';
             const categoryIcon = getIconClass(category?.icon);
             const nextDueDateFormatted = formatDate(exp.next_due_date);
             const frequencyText = exp.frequency ? exp.frequency.charAt(0).toUpperCase() + exp.frequency.slice(1) : '-';

             row.innerHTML = `
                 <td><span class="trans-desc">${exp.description || '-'}</span></td>
                 <td class="amount-col"><span class="trans-amount expense">${formatCurrency(exp.amount)}</span></td>
                 <td><span class="trans-cat"><i class="${categoryIcon}"></i> ${categoryName}</span></td>
                 <td>${frequencyText}</td>
                 <td>${nextDueDateFormatted}</td>
                 <td>
                     <label class="toggle-switch">
                         <input type="checkbox" class="toggle-active" data-id="${exp.id}" ${exp.is_active ? 'checked' : ''}>
                         <span class="toggle-slider"></span>
                     </label>
                 </td>
                 <td>
                      <label class="toggle-switch">
                         <input type="checkbox" class="toggle-notification" data-id="${exp.id}" ${exp.notification_enabled ? 'checked' : ''}>
                         <span class="toggle-slider"></span>
                     </label>
                 </td>
                 <td>
                     <button class="btn-icon btn-edit" aria-label="Editar" data-id="${exp.id}"><i class="fas fa-pencil-alt"></i></button>
                     <button class="btn-icon btn-delete" aria-label="Eliminar" data-id="${exp.id}"><i class="fas fa-trash-alt"></i></button>
                 </td>
             `;
             fixedExpensesTableBody.appendChild(row);
         });
    }

    function displayFixedExpensesCalendar(expenses) {
        if (!calendarEl) { console.error("Elemento del calendario no encontrado"); return; }
        if (typeof FullCalendar === 'undefined') {
            calendarEl.innerHTML = '<p style="color:red;">Error: Librería FullCalendar no cargada.</p>'; return; }

        const calendarEvents = expenses
            .filter(exp => exp.is_active && exp.next_due_date)
            .map(exp => {
                const category = categories.find(c => c.id === exp.category_id);
                return {
                    id: exp.id, // Usar ID de Supabase como ID del evento
                    title: `${exp.description} (${formatCurrency(exp.amount)})`,
                    start: exp.next_due_date, // Usar la próxima fecha de vencimiento
                    allDay: true,
                    backgroundColor: category?.color || '#8a82d5', // Usar color de categoría
                    borderColor: category?.color || '#8a82d5'
                };
            });

        if (calendarInstance) {
            calendarInstance.destroy(); // Destruir instancia anterior si existe
        }
         calendarInstance = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth', locale: 'es', buttonText: { today: 'Hoy' },
            headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' },
            events: calendarEvents,
            eventClick: function(info) {
                 console.log('Evento clicado:', info.event);
                 const expenseId = info.event.id;
                 const expense = fixedExpenses.find(exp => exp.id === expenseId);
                 if (expense) openExpenseModal(expense);
             },
             height: 'auto'
        });
        calendarInstance.render();
    }

    /** Cambia entre la vista de lista y calendario */
    function switchView(viewToShow) {
        if (!listViewContainer || !calendarViewContainer || !listViewBtn || !calendarViewBtn) return;
        currentView = viewToShow;
        if (viewToShow === 'list') {
            listViewContainer.style.display = 'block'; calendarViewContainer.style.display = 'none';
            listViewBtn.classList.add('active'); calendarViewBtn.classList.remove('active');
        } else {
            listViewContainer.style.display = 'none'; calendarViewContainer.style.display = 'block';
            listViewBtn.classList.remove('active'); calendarViewBtn.classList.add('active');
            // Asegurarse que el calendario se renderiza al mostrarse
            if (calendarInstance) setTimeout(() => calendarInstance.render(), 0);
             else displayFixedExpensesCalendar(fixedExpenses); // Renderizar si es la primera vez
        }
        console.log("Cambiado a vista:", currentView);
    }

    /** Carga los datos iniciales necesarios */
    async function loadInitialDataFixedExpenses(user) {
        if (!user) { console.log("No hay usuario"); return; }
        currentUserId = user.id;
        currentUser = user;
        categoriesLoaded = false;
        if(tableLoadingMessage) tableLoadingMessage.parentElement.style.display = 'table-footer-group';
        if(noExpensesMessage) noExpensesMessage.style.display = 'none';
        if(userAvatarSmall) userAvatarSmall.src = defaultAvatarPath;
        if(monthlyTotalAmount) monthlyTotalAmount.textContent = 'Calculando...';

        console.log("FixedExpenses.js: Cargando datos iniciales para user:", currentUserId);
        try {
             const [profileRes, accountsRes, categoriesRes, expensesRes] = await Promise.all([
                 supabase.from('profiles').select('avatar_url').eq('id', currentUserId).single(),
                 supabase.from('accounts').select('id, name').eq('user_id', currentUserId).order('name'),
                 supabase.from('categories').select('id, name, icon, color').or(`user_id.eq.${currentUserId},is_default.eq.true`).eq('type', 'gasto').order('name'),
                 supabase.from('scheduled_fixed_expenses').select(`*, categories ( name, icon, color )`).eq('user_id', currentUserId).order('next_due_date') // <- JOIN con categories
             ]);

             // Avatar
             if (userAvatarSmall) userAvatarSmall.src = profileRes.data?.avatar_url || defaultAvatarPath;
             // Cuentas
             if (accountsRes.error) throw accountsRes.error;
             accounts = accountsRes.data || [];
             //populateSelect(expenseAccountInput, accounts, 'id', 'name', '(Ninguna específica)', false, '');
             // Categorías
             if (categoriesRes.error) {
                console.error("ERROR CARGANDO CATEGORÍAS:", categoriesRes.error);
                categories = []; // Asegurar que esté vacío si hay error
                categoriesLoaded = false;
             } else {
                categories = categoriesRes.data || [];
                categoriesLoaded = true; // Marcar como cargadas
                console.log(`DEBUG: Categorías de GASTO cargadas con éxito: ${categories.length}`);
             }
             // Gastos Fijos
             console.log("Cargando gastos fijos...");
            const { data: initialExpenses, error: expensesError } = await supabase
            .from('scheduled_fixed_expenses')
            .select(`*, categories ( name, icon, color )`) // Traer todo, incluido JOIN
            .eq('user_id', currentUserId)
            .order('next_due_date');
            if (expensesError) throw expensesError;
            fixedExpenses = initialExpenses || [];
            console.log(`Gastos fijos iniciales cargados: ${fixedExpenses.length}`);

            const today = new Date();
            today.setHours(0, 0, 0, 0); // Poner a medianoche para comparar solo fechas
            const updatesToPerform = []; // Array para guardar las actualizaciones necesarias

            for (const exp of fixedExpenses) {
                if (exp.is_active && exp.next_due_date && exp.frequency && exp.frequency !== 'unico') { // Solo activos, con fecha, y recurrentes
                    const nextDueDate = new Date(exp.next_due_date);
                    // Ajuste zona horaria al comparar con 'today'
                    const offset = nextDueDate.getTimezoneOffset();
                    const adjustedNextDueDate = new Date(nextDueDate.getTime() + (offset * 60 * 1000));
                    adjustedNextDueDate.setHours(0,0,0,0);


                    if (adjustedNextDueDate < today) { // Si la fecha ya pasó
                        console.log(`Fecha pasada detectada para '${exp.description}' (${exp.next_due_date}). Calculando siguiente...`);
                        const newNextDueDate = calculateNextDueDate(adjustedNextDueDate, exp.frequency, exp.day_of_month);
                        if (newNextDueDate) {
                            const newDateString = newNextDueDate.toISOString().split('T')[0]; // Formato YYYY-MM-DD
                            console.log(`   Nueva fecha calculada: ${newDateString}`);
                            updatesToPerform.push({ id: exp.id, next_due_date: newDateString });
                            // Actualizar el objeto en memoria para mostrar la fecha correcta inmediatamente
                            exp.next_due_date = newDateString;
                        } else {
                            console.warn(`   No se pudo calcular la siguiente fecha para frecuencia: ${exp.frequency}`);
                        }
                    }
                }
            }

            // Realizar las actualizaciones en la BD si hay alguna
            if (updatesToPerform.length > 0) {
                console.log(`Actualizando ${updatesToPerform.length} fechas de vencimiento en la BD...`);
                // Usamos Promise.all para enviar todas las actualizaciones
                const updatePromises = updatesToPerform.map(update =>
                    supabase.from('scheduled_fixed_expenses')
                        .update({ next_due_date: update.next_due_date, updated_at: new Date() })
                        .eq('id', update.id)
                        .eq('user_id', currentUserId) // Asegurar RLS
                );
                const results = await Promise.allSettled(updatePromises);
                results.forEach((result, index) => {
                    if (result.status === 'rejected') {
                        console.error(`Error actualizando fecha para ID ${updatesToPerform[index].id}:`, result.reason);
                    }
                });
                console.log("Actualizaciones de fecha completadas.");
            }

             displayFixedExpensesList(fixedExpenses);
             displayFixedExpensesCalendar(fixedExpenses); // Renderizar calendario con datos
             displayMonthlyTotal(fixedExpenses);
              // Seleccionar vista por defecto al cargar
             switchView(currentView);

        } catch(error) {
            console.error("Error cargando datos iniciales (Fixed Expenses):", error);
             if(tableLoadingMessage) tableLoadingMessage.textContent = `Error: ${error.message}`;
             if(noExpensesMessage) noExpensesMessage.style.display = 'block';
        }finally {
            // Ocultar mensaje de carga si no hubo error grave antes
             const loadingElement = document.getElementById('loadingMessage'); // Asumiendo que existe o tableLoadingMessage
             if (loadingElement && !loadingElement.textContent?.includes('Error')) {
                 loadingElement.style.display = 'none';
             }
        }
    }

    // --- >>> INICIO: NUEVA FUNCIÓN calculateNextDueDate <<< ---
    function calculateNextDueDate(currentDueDate, frequency, dayOfMonth) {
        if (!(currentDueDate instanceof Date) || isNaN(currentDueDate.getTime())) {
            console.error("calculateNextDueDate: currentDueDate inválida", currentDueDate);
            return null; // Fecha inválida
        }

        let nextDate = new Date(currentDueDate.getTime()); // Clonar la fecha

        switch (frequency) {
            case 'mensual':
                // Si tenemos day_of_month, lo usamos para calcular el día exacto del mes siguiente
                if (dayOfMonth && dayOfMonth >= 1 && dayOfMonth <= 31) {
                    let targetMonth = nextDate.getMonth() + 1;
                    let targetYear = nextDate.getFullYear();
                    if (targetMonth > 11) {
                        targetMonth = 0; // Enero
                        targetYear++;
                    }
                    // Calcular último día del mes objetivo
                    let lastDayOfMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
                    let targetDay = Math.min(dayOfMonth, lastDayOfMonth); // Ajustar si el día no existe (ej: 31 en Feb)
                    nextDate = new Date(targetYear, targetMonth, targetDay);
                } else {
                    // Si no hay day_of_month, simplemente añadimos un mes (menos preciso)
                    console.warn("Calculando siguiente fecha mensual sin day_of_month, puede ser impreciso.");
                    nextDate.setMonth(nextDate.getMonth() + 1);
                }
                break;
            case 'anual':
                nextDate.setFullYear(nextDate.getFullYear() + 1);
                break;
            case 'semanal':
                nextDate.setDate(nextDate.getDate() + 7);
                break;
            case 'quincenal':
                nextDate.setDate(nextDate.getDate() + 14); // O 15? Depende definición
                break;
            case 'bimestral':
                nextDate.setMonth(nextDate.getMonth() + 2);
                break;
            case 'trimestral':
                nextDate.setMonth(nextDate.getMonth() + 3);
                break;
            case 'semestral':
                nextDate.setMonth(nextDate.getMonth() + 6);
                break;
            default:
                console.warn(`Frecuencia no reconocida para calcular siguiente fecha: ${frequency}`);
                return null; // Frecuencia no soportada
        }

        // Asegurarse que la nueva fecha no sea en el pasado (por si acaso)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (nextDate < today) {
            // Si la fecha calculada sigue en el pasado (ej. un gasto mensual muy viejo),
            // seguir calculando hasta que esté en el futuro.
            console.log("Fecha calculada aún en pasado, recalculando...");
            return calculateNextDueDate(nextDate, frequency, dayOfMonth); // Llamada recursiva
        }


        return nextDate;
    }

    /** Guarda/Edita un gasto fijo programado */
    async function handleExpenseFormSubmit(event) {
        event.preventDefault();
        if (!supabase || !currentUserId || !expenseForm || !saveExpenseButton) return;

        const expenseId = expenseIdInput.value;
        const isEditing = !!expenseId;
        const originalSaveText = saveExpenseButton.textContent;
        const nextDueDateValue = expenseNextDueDateInput.value; // YYYY-MM-DD
        let dayOfMonthValue = null;
        if (expenseFrequencyInput.value === 'mensual' && nextDueDateValue) {
            try {
                // Extraer el día del mes de la fecha seleccionada
                dayOfMonthValue = new Date(nextDueDateValue + 'T00:00:00').getDate(); // Asegurar que interprete como local
            } catch(e) { console.error("Error extrayendo día del mes de la fecha", e); }
        }

        // Recoger datos
        const expenseData = {
            user_id: currentUserId,
            description: expenseDescriptionInput.value.trim(),
            amount: parseFloat(expenseAmountInput.value),
            category_id: expenseCategoryInput.value || null,
            account_id: expenseAccountInput.value || null,
            frequency: expenseFrequencyInput.value,
            next_due_date: nextDueDateValue,
            day_of_month: dayOfMonthValue, // <<< GUARDAR EL DÍA DEL MES
            notification_enabled: expenseNotificationInput.checked,
            is_active: expenseActiveInput.checked,
        };

        // Validaciones
        if (!expenseData.description || isNaN(expenseData.amount) || !expenseData.category_id || !expenseData.frequency || !expenseData.next_due_date) {
             modalExpenseError.textContent = 'Descripción, Importe, Categoría, Frecuencia y Próxima Fecha son obligatorios.'; modalExpenseError.style.display = 'block'; return; }
        if (expenseData.frequency === 'mensual' && !expenseData.day_of_month) {
            console.warn("Guardando gasto mensual sin día del mes específico.");
            // Podrías mostrar un warning al usuario o hacerlo obligatorio
        }
        if (expenseData.amount <= 0) { modalExpenseError.textContent = 'El importe debe ser mayor que cero.'; modalExpenseError.style.display = 'block'; return; }
        modalExpenseError.style.display = 'none';
        saveExpenseButton.disabled = true; saveExpenseButton.textContent = isEditing ? 'Guardando...' : 'Creando...';


        try {
            let error;
            if (isEditing) {
                // UPDATE
                const { error: updateError } = await supabase
                    .from('scheduled_fixed_expenses').update({
                        description: expenseData.description, amount: expenseData.amount,
                        category_id: expenseData.category_id, account_id: expenseData.account_id,
                        frequency: expenseData.frequency, next_due_date: expenseData.next_due_date,
                        day_of_month: expenseData.day_of_month,
                        notification_enabled: expenseData.notification_enabled, is_active: expenseData.is_active,
                        updated_at: new Date() })
                    .eq('id', expenseId).eq('user_id', currentUserId);
                 error = updateError;
            } else {
                 // INSERT
                 const { error: insertError } = await supabase.from('scheduled_fixed_expenses').insert([expenseData]);
                 error = insertError;
            }
            if (error) throw error;

            console.log(isEditing ? 'Gasto Fijo actualizado' : 'Gasto Fijo creado');
            closeExpenseModal();
            await loadInitialDataFixedExpenses({ id: currentUserId }); // Recargar todo
            loadInitialDataFixedExpenses({ id: currentUserId }); // Recargar todo

        } catch (error) {
            console.error('Error guardando Gasto Fijo:', error);
            modalExpenseError.textContent = `Error: ${error.message}`;
            modalExpenseError.style.display = 'block';
        } finally {
            saveExpenseButton.disabled = false; saveExpenseButton.textContent = originalSaveText;
        }
    }

    /** Elimina un gasto fijo programado */
    async function handleDeleteExpense(expenseId) {
         if (!supabase || !currentUserId || !expenseId) return;
         const expenseToDelete = fixedExpenses.find(exp => exp.id === expenseId);
         if (!expenseToDelete) return;

         if (!confirm(`¿Estás SEGURO de que quieres eliminar el gasto fijo programado "${expenseToDelete.description}"?`)) return;

         console.log('Intentando eliminar gasto fijo:', expenseId);
         try {
              const { error } = await supabase.from('scheduled_fixed_expenses').delete().eq('id', expenseId).eq('user_id', currentUserId);
              if (error) throw error;
              console.log('Gasto Fijo eliminado'); alert('Gasto Fijo eliminado.');
              loadInitialDataFixedExpenses({ id: currentUserId }); // Recargar
         } catch (error) { console.error('Error eliminando gasto fijo:', error); alert(`Error: ${error.message}`); }
     }

    /** Actualiza estado Activo/Inactivo */
    async function handleToggleActive(expenseId, isActive) {
        if (!supabase || !currentUserId || !expenseId) return;
        console.log(`Actualizando 'is_active' a ${isActive} para ID: ${expenseId}`);
         try {
             const { error } = await supabase.from('scheduled_fixed_expenses')
                .update({ is_active: isActive, updated_at: new Date() })
                .eq('id', expenseId).eq('user_id', currentUserId);
             if (error) throw error;
             console.log("Estado 'is_active' actualizado.");
             // Actualizar datos locales para reflejar cambio sin recarga completa (opcional)
             const index = fixedExpenses.findIndex(exp => exp.id === expenseId);
             if (index > -1) fixedExpenses[index].is_active = isActive;
             displayMonthlyTotal(fixedExpenses); // Recalcular total
             // Actualizar apariencia de la fila afectada
             const row = fixedExpensesTableBody.querySelector(`tr[data-id="${expenseId}"]`);
             if (row) row.style.opacity = isActive ? 1 : 0.6;
             // Actualizar calendario si está visible
             if(currentView === 'calendar') displayFixedExpensesCalendar(fixedExpenses);

         } catch (error) { console.error("Error actualizando 'is_active':", error); alert(`Error: ${error.message}`); }
     }

    /** Actualiza estado Recordatorio */
     async function handleToggleNotification(expenseId, isEnabled) {
        if (!supabase || !currentUserId || !expenseId) return;
         console.log(`Actualizando 'notification_enabled' a ${isEnabled} para ID: ${expenseId}`);
         try {
             const { error } = await supabase.from('scheduled_fixed_expenses')
                .update({ notification_enabled: isEnabled, updated_at: new Date() })
                .eq('id', expenseId).eq('user_id', currentUserId);
             if (error) throw error;
             console.log("Estado 'notification_enabled' actualizado.");
             const index = fixedExpenses.findIndex(exp => exp.id === expenseId);
             if (index > -1) fixedExpenses[index].notification_enabled = isEnabled;
         } catch (error) { console.error("Error actualizando 'notification_enabled':", error); alert(`Error: ${error.message}`); }
     }
     function setActiveSidebarLink() {
        const currentPagePath = window.location.pathname;
        // Usamos querySelectorAll en el NAV dentro de la sidebar
        const navButtons = document.querySelectorAll('.sidebar-nav .nav-button[data-page]');
    
        if (!navButtons || navButtons.length === 0) {
            console.warn("setActiveSidebarLink: No se encontraron botones de navegación con 'data-page'.");
            return;
        }
    
        let mostSpecificMatch = null;
    
        navButtons.forEach(button => {
            const linkPath = button.getAttribute('data-page');
            button.classList.remove('active'); // Limpiar todos primero
    
            // Comprobar si la ruta actual COMIENZA con la ruta del botón
            if (linkPath && currentPagePath.startsWith(linkPath)) {
                // Priorizar la coincidencia más específica (más larga)
                if (!mostSpecificMatch || linkPath.length > mostSpecificMatch.dataset.page.length) {
                    mostSpecificMatch = button;
                }
            }
        });
    
        // Activar el botón más específico encontrado
        if (mostSpecificMatch) {
            mostSpecificMatch.classList.add('active');
            console.log('setActiveSidebarLink: Active link set to:', mostSpecificMatch.dataset.page);
        } else {
             // Si no hay coincidencia, marcar Dashboard por defecto
             const dashboardButton = document.querySelector('.sidebar-nav .nav-button[data-page="/Dashboard.html"]');
             if (dashboardButton) dashboardButton.classList.add('active');
             console.log('setActiveSidebarLink: No specific match, defaulting to Dashboard.');
        }
    }

    function addSidebarNavigationListeners() {
        console.log("Attempting to add sidebar listeners...");
        const navButtons = document.querySelectorAll('.sidebar-nav .nav-button[data-page]');
        console.log(`Found ${navButtons.length} nav buttons.`);
        navButtons.forEach(button => {
            // Evitar añadir múltiples listeners
            if (button.dataset.listenerAttached === 'true') return;
    
            button.addEventListener('click', () => {
                const pageUrl = button.getAttribute('data-page');
                if (pageUrl && window.location.pathname !== pageUrl) {
                    console.log(`Navegando a: ${pageUrl}`);
                    window.location.href = pageUrl;
                } else if (pageUrl) {
                     console.log(`Ya estás en ${pageUrl} o no se encontró la URL.`);
                }
            });
            button.dataset.listenerAttached = 'true'; // Marcar que ya tiene listener
        });
    
        // Listener para el botón de logout
        const logoutButton = document.getElementById('btnLogoutSidebar');
        if (logoutButton) {
             console.log("Found logout button, attaching listener.");
             // Evitar añadir múltiples listeners
             if (logoutButton.dataset.listenerAttached !== 'true') {
                 logoutButton.addEventListener('click', async () => {
                     console.log("Logout button clicked");
                     // Asegúrate que 'supabase' está disponible en este scope
                     if (typeof supabase !== 'undefined' && supabase.auth && typeof supabase.auth.signOut === 'function') {
                         logoutButton.disabled = true; // Deshabilitar mientras cierra
                         const { error } = await supabase.auth.signOut();
                         if (error) {
                             console.error("Error during sign out:", error);
                             alert("Error al cerrar sesión.");
                             logoutButton.disabled = false; // Rehabilitar si hay error
                         }
                         // No redirigir aquí, auth-listener.js lo hará
                     } else {
                          console.error("Supabase client or signOut function not available for logout.");
                          alert("Error interno al cerrar sesión.");
                     }
                 });
                 logoutButton.dataset.listenerAttached = 'true'; // Marcar que ya tiene listener
             }
        } else {
             console.error("ERROR: Botón #btnLogoutSidebar no encontrado para añadir listener!");
        }
    }

    // --- Asignación de Event Listeners ---

    document.addEventListener('authReady', (e) => {
        console.log('FixedExpenses.js: Received authReady event.');
        loadInitialDataFixedExpenses(e.detail.user);
    });

    document.addEventListener('DOMContentLoaded', () => {
        console.log("FixedExpenses.js: DOM fully loaded.");

        if (addExpenseBtn) {
            addExpenseBtn.addEventListener('click', () => {
                console.log("DEBUG: Clic en Añadir Gasto Fijo.");
                // --- COMPROBACIÓN ---
                if (!categoriesLoaded || categories.length === 0) {
                    console.warn("Intento de abrir modal pero las categorías aún no están listas o están vacías. categoriesLoaded:", categoriesLoaded, "categories.length:", categories.length);
                    alert("Espera un momento a que carguen las categorías e inténtalo de nuevo.");
                    // Opcional: intentar recargar datos
                     loadInitialDataFixedExpenses({ id: currentUserId });
                    return; // No abrir modal
                }
                // --------------------
                console.log("DEBUG: Categorías listas. Llamando a openExpenseModal...");
                openExpenseModal(); // Abrir modal vacío
            });
            console.log("DEBUG: Listener añadido a #addExpenseBtn");
        } else { console.error("ERROR: Botón #addExpenseBtn NO encontrado!"); }
        if (backButton) backButton.addEventListener('click', () => { window.location.href = '/Dashboard.html'; });
        if (listViewBtn) listViewBtn.addEventListener('click', () => switchView('list'));
        if (calendarViewBtn) calendarViewBtn.addEventListener('click', () => switchView('calendar'));
        if (cancelExpenseButton) cancelExpenseButton.addEventListener('click', closeExpenseModal);
        if (expenseModal) expenseModal.addEventListener('click', (event) => { if (event.target === expenseModal) closeExpenseModal(); });
        if (expenseForm) expenseForm.addEventListener('submit', handleExpenseFormSubmit);

        // Delegación para acciones en la tabla
        if (fixedExpensesTableBody) {
            fixedExpensesTableBody.addEventListener('click', (event) => {
                const target = event.target;
                // Toggle Activo
                if (target.classList.contains('toggle-active')) {
                    const expenseId = target.dataset.id;
                    handleToggleActive(expenseId, target.checked); return; }
                // Toggle Notificación
                if (target.classList.contains('toggle-notification')) {
                     const expenseId = target.dataset.id;
                     handleToggleNotification(expenseId, target.checked); return; }
                 // Botón Editar
                const editButton = target.closest('.btn-edit');
                if (editButton) { const expenseId = editButton.dataset.id; const expense = fixedExpenses.find(e=>e.id===expenseId); if(expense) openExpenseModal(expense); return; }
                // Botón Eliminar
                const deleteButton = target.closest('.btn-delete');
                if (deleteButton) { const expenseId = deleteButton.dataset.id; handleDeleteExpense(expenseId); return; }
            });
        }
        console.log("Initializing sidebar...");
         setActiveSidebarLink();             // <--- LLAMADA 1
         addSidebarNavigationListeners(); 

         // Scroll top
         if (scrollTopBtn) {
             window.addEventListener('scroll', () => { scrollTopBtn.classList.toggle('visible', window.scrollY > 300); });
             scrollTopBtn.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); });
         }

    }); // Fin DOMContentLoaded

} // Fin check Supabase