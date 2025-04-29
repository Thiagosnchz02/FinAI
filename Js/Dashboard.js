// Dashboard.js
// ASEGÚRATE que supabase-init.js y auth-listener.js se cargaron antes

console.log('DEBUG: Dashboard.js - Cargado');

if (typeof supabase === 'undefined' || supabase === null) {
    console.error('Dashboard.js: ¡Error Crítico! Cliente Supabase no inicializado.');
} else {
    console.log('Dashboard.js: Cliente Supabase encontrado.');

    // --- Selección de Elementos DOM ---
    // Sidebar
    const navButtons = document.querySelectorAll('.sidebar-nav .nav-button');
    const btnLogoutSidebar = document.getElementById('btnLogoutSidebar');
    // Header
    const userAvatarHeader = document.getElementById('userAvatarHeader');
    const pageTitle = document.getElementById('pageTitle');
    const notificationBell = document.getElementById('notificationBell');
    const notificationBadge = document.getElementById('notificationBadge');
    const profileBtnHeader = document.getElementById('profileBtnHeader');
    const notificationPanel = document.getElementById('notificationPanel');
    const notificationList = document.getElementById('notificationList');
    const markAllReadBtn = document.getElementById('markAllReadBtn');
    // Selectores para el Modal de Transacción (COPIADOS de Transactions.js)
    const transactionModal = document.getElementById('transactionModal');
    const transactionForm = document.getElementById('transactionForm');
    const modalTitleTransaction = document.getElementById('modalTitleTransaction');
    const transactionIdInput = document.getElementById('transactionId');
    const typeToggleExpense = document.querySelector('#transactionModal input[name="transactionType"][value="gasto"]'); // Ser más específico con el selector
    const typeToggleIncome = document.querySelector('#transactionModal input[name="transactionType"][value="ingreso"]');
    const transactionAmountInput = document.getElementById('transactionAmount');
    const transactionDateInput = document.getElementById('transactionDate');
    const transactionDescriptionInput = document.getElementById('transactionDescription');
    const transactionAccountInput = document.getElementById('transactionAccount');
    const transactionCategoryInput = document.getElementById('transactionCategory');
    const transactionNotesInput = document.getElementById('transactionNotes');
    const cancelTransactionButton = document.getElementById('cancelTransactionButton');
    const saveTransactionButton = document.getElementById('saveTransactionButton');
    const modalTransactionError = document.getElementById('modalTransactionError');
    const typeToggleTransfer = document.querySelector('#transactionModal input[name="transactionType"][value="transferencia"]');
    const accountSourceGroup = document.getElementById('accountSourceGroup'); // Opcional
    const transactionAccountLabel = document.getElementById('transactionAccountLabel'); // Opcional
    const accountDestinationGroup = document.getElementById('accountDestinationGroup');
    const transactionAccountDestinationInput = document.getElementById('transactionAccountDestination');
    const categoryGroup = document.getElementById('categoryGroup');
    const quickAddTripExpenseBtn = document.getElementById('quickAddTripExpenseBtn');
// Selectores para el MODAL DE GASTO DE VIAJE (necesarios aquí también)
    const tripExpenseModal = document.getElementById('tripExpenseModal'); // Asegúrate que el modal está en Dashboard.html o accesible
    const tripExpenseForm = document.getElementById('tripExpenseForm');
    const modalTitleTripExpense = document.getElementById('modalTitleTripExpense');
    const tripExpenseIdInput = document.getElementById('tripExpenseId');
    const expenseTripIdInput = document.getElementById('expenseTripId'); // Input oculto que guarda el ID del viaje
    const tripSelectorGroup = document.getElementById('tripSelectorGroup'); // El NUEVO div contenedor del selector
    const quickExpenseTripSelect = document.getElementById('quickExpenseTripSelect'); // El NUEVO select
    const tripExpenseDescriptionInput = document.getElementById('tripExpenseDescription');
    const tripExpenseAmountInput = document.getElementById('tripExpenseAmount');
    const tripExpenseDateInput = document.getElementById('tripExpenseDate');
    const tripExpenseCategoryInput = document.getElementById('tripExpenseCategory'); // Aunque no se use para selección aquí
    const tripExpenseNotesInput = document.getElementById('tripExpenseNotes');
    const cancelTripExpenseButton = document.getElementById('cancelTripExpenseButton');
    const saveTripExpenseButton = document.getElementById('saveTripExpenseButton');
    const modalTripExpenseError = document.getElementById('modalTripExpenseError');
    // Widgets (Contenedores y elementos específicos para actualizar)
    const greetingEl = document.getElementById('greeting');
    const totalBalanceEl = document.getElementById('totalBalance');
    const budgetSummaryList = document.getElementById('budgetSummaryList');
    const upcomingPaymentsList = document.getElementById('upcomingPaymentsList');
    const goalsProgressList = document.getElementById('goalsProgressList');
    const recentActivityList = document.getElementById('recentActivityList');
    const evaluationSummaryContent = document.getElementById('evaluationSummaryContent');
    const accountsSummaryContent = document.getElementById('accountsSummaryContent');
    const nextTripSummaryContent = document.getElementById('nextTripSummaryContent');
    // Quick Actions
    const quickAddExpenseBtn = document.getElementById('quickAddExpenseBtn');
    const quickAddIncomeBtn = document.getElementById('quickAddIncomeBtn');
    // Otros
    const scrollTopBtn = document.getElementById('scrollTopBtn');

    // --- Variables de Estado ---
    let currentUserId = null;
    let currentUser = null;
    let isLoadingData = false;
    let isNotificationPanelOpen = false;
    let notificationsCache = []; // Cache simple para evitar recargas innecesarias
    let accounts = []; // Necesitamos las cuentas para el modal
    let categories = []; // Necesitamos las categorías para el modal
    let initialDataLoaded = false;

    // --- Constantes ---
    const defaultAvatarPath = 'https://finai.es/images/avatar_predeterminado.png';

    // --- Funciones Auxiliares (Copiar/Mover a común si es necesario) ---
     function formatCurrency(value, currency = 'EUR') {
         if (isNaN(value) || value === null) return '€0.00';
         try { return new Intl.NumberFormat('es-ES', { style: 'currency', currency: currency, minimumFractionDigits: 2 }).format(value); }
         catch (e) { return `${Number(value).toFixed(2)} ${currency}`; }
     }
     function formatDate(dateString, options = { day: 'numeric', month: 'short' }) {
         if (!dateString) return '';
         try { const date = new Date(dateString); if (isNaN(date.getTime())) return '';
             const offset = date.getTimezoneOffset(); const adjustedDate = new Date(date.getTime() + (offset*60*1000));
             return new Intl.DateTimeFormat('es-ES', options).format(adjustedDate);
         } catch (e) { return ''; }
     }

     function getIconForAccountType(type) {
        switch (type) {
            case 'corriente': return 'fas fa-landmark';
            case 'ahorro': return 'fas fa-piggy-bank';
            // Añade los nuevos tipos si los usas
            case 'ahorro_colchon': return 'fas fa-shield-alt';
            case 'ahorro_viajes': return 'fas fa-plane-departure';
            case 'inversion': return 'fas fa-chart-line';
            case 'tarjeta_credito': return 'fas fa-credit-card';
            case 'efectivo': return 'fas fa-wallet';
            case 'otro': return 'fas fa-question-circle';
            default: return 'fas fa-university'; // Icono por defecto
        }
    }
    function getIconForTrip(type = 'default') { // Función simple para icono por defecto
        // Podrías copiar la lógica más compleja de Trips.js si quieres
        return 'fas fa-suitcase-rolling'; // Icono genérico de viaje
    }

     function populateSelect(selectElement, items, valueField = 'id', textField = 'name', defaultOptionText = 'Selecciona...', includeAllOption = false, allOptionText = 'Todos/as') {
        if (!selectElement) return; selectElement.innerHTML = '';
        if (includeAllOption) { const allOpt = document.createElement('option'); allOpt.value = 'all'; allOpt.textContent = allOptionText; selectElement.appendChild(allOpt); }
        if (defaultOptionText) { const defaultOpt = document.createElement('option'); defaultOpt.value = ''; defaultOpt.textContent = defaultOptionText; defaultOpt.disabled = true; if (!includeAllOption) defaultOpt.selected = true; selectElement.appendChild(defaultOpt); }
        items.forEach(item => { const option = document.createElement('option'); option.value = item[valueField]; option.textContent = item[textField]; selectElement.appendChild(option); });
    }
    // Necesitamos esta función específica del modal de transacciones
    function populateCategoryFilter(transactionType = 'gasto') {
        console.log(`--- DEBUG: populateCategoryFilter llamada con tipo: ${transactionType} ---`); // Log inicio función
        console.log('DEBUG: populateCategoryFilter - Usando array global categories:', categories); // ¿Tiene datos aquí?
        console.log('DEBUG: populateCategoryFilter - Elemento <select> de Categoría:', transactionCategoryInput); // ¿Es el elemento o null?
        if (!transactionCategoryInput || !categories) {
            console.error("populateCategoryFilter: Falta elemento select o array de categorías.");
            return;
        }
        // Filtrar categorías (INGRESOS o GASTOS)
        const filteredForType = categories.filter(cat => cat.type === transactionType);
        console.log('DEBUG: populateCategoryFilter - Categorías filtradas para el select:', filteredForType); // ¿El filtro devuelve algo?
        // Rellenar select
        populateSelect(transactionCategoryInput, filteredForType, 'id', 'name', '(Sin categoría)', false, '', ''); // Permitir selección vacía
        console.log('DEBUG: populateCategoryFilter - Terminado de poblar categorías.'); // Log fin
    }

    // EN Dashboard.js - Añade estas funciones si no existen

    function toggleTripExpenseModal(show) {
        if (!tripExpenseModal) return;
        if (show) { tripExpenseModal.style.display = 'flex'; setTimeout(() => tripExpenseModal.classList.add('active'), 10); }
        else { tripExpenseModal.classList.remove('active'); setTimeout(() => { tripExpenseModal.style.display = 'none'; if (tripExpenseForm) tripExpenseForm.reset(); if (tripExpenseIdInput) tripExpenseIdInput.value = ''; if(expenseTripIdInput) expenseTripIdInput.value = ''; if (modalTripExpenseError) { modalTripExpenseError.textContent = ''; modalTripExpenseError.style.display = 'none'; } }, 300); }
    }

    function closeTripExpenseModal() { toggleTripExpenseModal(false); }

    // Nueva función para abrir desde Quick Actions
    function openTripExpenseModalForQuickAdd(availableTrips) {
        if (!tripExpenseForm || !modalTitleTripExpense || !tripExpenseIdInput || !expenseTripIdInput || !saveTripExpenseButton || !tripSelectorGroup || !quickExpenseTripSelect || !tripExpenseDateInput) {
            console.error("Faltan elementos esenciales del modal de gasto de viaje para Quick Add."); return; }

            tripExpenseForm.reset();
            tripExpenseIdInput.value = ''; // Modo añadir
            expenseTripIdInput.value = ''; // Limpiar trip ID oculto
            modalTripExpenseError.style.display = 'none';
            saveTripExpenseButton.disabled = false;
            saveTripExpenseButton.textContent = 'Guardar Gasto';
            modalTitleTripExpense.textContent = 'Añadir Gasto Rápido de Viaje';

            // Mostrar y rellenar selector de viaje
            tripSelectorGroup.style.display = 'block';
            quickExpenseTripSelect.required = true; // Hacer obligatorio seleccionar viaje
            populateSelect(quickExpenseTripSelect, availableTrips, 'id', 'name', 'Selecciona un viaje...');

            // Ocultar categoría si la tienes visible por defecto (opcional)
            //if (tripExpenseCategoryInput) tripExpenseCategoryInput.parentElement.style.display = 'none';

            // Poner fecha de hoy
            tripExpenseDateInput.valueAsDate = new Date();

            // Abrir el modal
            toggleTripExpenseModal(true);
            setTimeout(() => quickExpenseTripSelect.focus(), 350); // Enfocar el selector de viaje
    }

     /** Calcula tiempo relativo (ej: "hace 5 min", "ayer") */
    function timeAgo(timestamp) {
        if (!timestamp) return '';
        const now = new Date();
        const past = new Date(timestamp);
        const diffInSeconds = Math.floor((now - past) / 1000);
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        const diffInHours = Math.floor(diffInMinutes / 60);
        const diffInDays = Math.floor(diffInHours / 24);

        if (diffInSeconds < 60) return `hace ${diffInSeconds} seg`;
        if (diffInMinutes < 60) return `hace ${diffInMinutes} min`;
        if (diffInHours < 24) return `hace ${diffInHours} h`;
        if (diffInDays === 1) return `ayer`;
        if (diffInDays < 7) return `hace ${diffInDays} días`;
        return past.toLocaleDateString('es-ES'); // Formato fecha si es más antiguo
    }

    /** Devuelve el icono FA según el tipo de notificación */
    function getNotificationIcon(type) {
        switch (type) {
            case 'recordatorio_gasto_fijo': return 'fas fa-calendar-alt icon recordatorio_gasto_fijo'; // Cambia el icono si quieres
            case 'presupuesto_excedido': return 'fas fa-exclamation-triangle icon presupuesto_excedido';
            case 'meta_alcanzada': return 'fas fa-trophy icon meta_alcanzada';
            default: return 'fas fa-info-circle icon';
        }
    }

     const iconMap = {
        // Ingresos
        'nomina': 'fas fa-money-check-alt', 'salario': 'fas fa-money-check-alt',
        'freelance': 'fas fa-briefcase', 'negocio': 'fas fa-store',
        'regalo recibido': 'fas fa-gift', 'otros ingresos': 'fas fa-dollar-sign',
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
        'spotify': 'fab fa-spotify', // Asegúrate de tener Font Awesome Brands si usas 'fab'
        'salud': 'fas fa-heartbeat', 'medico': 'fas fa-stethoscope', 'farmacia': 'fas fa-pills',
        'gimnasio': 'fas fa-dumbbell', 'deporte': 'fas fa-running',
        'regalos': 'fas fa-gift', 'donacion': 'fas fa-hand-holding-heart',
        'educacion': 'fas fa-graduation-cap', 'cursos': 'fas fa-chalkboard-teacher',
        'mascotas': 'fas fa-paw',
        'viajes': 'fas fa-plane-departure', 'vacaciones': 'fas fa-umbrella-beach',
        'tasas': 'fas fa-gavel', 'impuestos': 'fas fa-landmark',
        'inversion': 'fas fa-chart-line', // Para gastos relacionados
        'otros gastos': 'fas fa-question-circle',
        // Metas (repite algunos o añade específicos)
        'viaje': 'fas fa-plane-departure', 'japon': 'fas fa-torii-gate',
        'piso': 'fas fa-building', 'entrada': 'fas fa-key',
        'ahorro': 'fas fa-piggy-bank', 'emergencia': 'fas fa-briefcase-medical',
        // Default
        'default': 'fas fa-tag'
    };
     function getIconClass(iconKeyword) { return iconMap[iconKeyword?.toLowerCase()] || (iconKeyword?.startsWith('fa') ? iconKeyword : 'fas fa-tag') ; }

    // --- Funciones de Carga de Datos para Widgets (Esqueletos) ---

    function toggleTransactionModal(show) {
        // (Misma lógica que en Transactions.js para mostrar/ocultar #transactionModal)
        if (!transactionModal) return;
        if (show) { transactionModal.style.display = 'flex'; setTimeout(() => transactionModal.classList.add('active'), 10); }
        else { transactionModal.classList.remove('active'); setTimeout(() => { transactionModal.style.display = 'none'; if (transactionForm) transactionForm.reset(); if (transactionIdInput) transactionIdInput.value = ''; if (modalTransactionError){ modalTransactionError.textContent=''; modalTransactionError.style.display='none';} if(typeToggleExpense) typeToggleExpense.checked = true; /* Reset a gasto */ }, 300); }
    }
    
    // Modificada para aceptar un tipo por defecto
    function openTransactionModal(defaultType = 'gasto', transaction = null) {
        console.log('--- DEBUG: openTransactionModal Iniciada ---'); // Log inicio función
        console.log('DEBUG: openTransactionModal - Array global accounts:', accounts); // ¿Tiene datos?
        console.log('DEBUG: openTransactionModal - Array global categories:', categories); // ¿Tiene datos?
        console.log('DEBUG: openTransactionModal - Elemento <select> de Cuenta:', transactionAccountInput); // ¿Es el elemento o null?
        console.log('DEBUG: Cuenta Select Destino:', transactionAccountDestinationInput);
        console.log('DEBUG: openTransactionModal - Elemento <select> de Categoría:', transactionCategoryInput); // ¿Es el elemento o null?
        // (Misma lógica que en Transactions.js para resetear/precargar el form)
        if (!transactionForm || !modalTitleTransaction || !transactionIdInput || !typeToggleExpense || !typeToggleIncome || !typeToggleTransfer || !transactionAmountInput || !transactionDateInput || !transactionDescriptionInput || !transactionAccountInput || !transactionAccountDestinationInput || !transactionCategoryInput || !transactionNotesInput || !saveTransactionButton || !categoryGroup || !accountDestinationGroup || !transactionAccountLabel) { console.error("Error: Elementos del modal de transacción no encontrados."); return; }
        transactionForm.reset(); transactionIdInput.value = ''; modalTransactionError.style.display = 'none'; saveTransactionButton.disabled = false; saveTransactionButton.textContent = 'Guardar Transacción';
        console.log('DEBUG: Poblando cuenta origen/principal'); // Log antes de poblar
        populateSelect(transactionAccountInput, accounts, 'id', 'name', 'Selecciona origen...'); // Rellenar cuentas
        console.log('DEBUG: Poblando cuenta destino...');
        populateSelect(transactionAccountDestinationInput, accounts, 'id', 'name', 'Selecciona destino...');
    
        if (transaction) { // Modo Edición (no usado desde Quick Actions, pero mantenemos por si acaso)
            modalTitleTransaction.textContent = 'Editar Transacción';
            saveTransactionButton.textContent = 'Guardar Cambios';
            transactionIdInput.value = transaction.id;
            transactionAmountInput.value = Math.abs(transaction.amount);
            transactionDateInput.value = transaction.transaction_date ? transaction.transaction_date.split('T')[0] : '';
            transactionDescriptionInput.value = transaction.description || '';
            transactionAccountInput.value = transaction.account_id || ''; // Solo cuenta principal en edición simple
            transactionNotesInput.value = transaction.notes || '';
            // NO preseleccionar cuenta destino ni ocultar categoría en edición simple
            accountDestinationGroup.style.display = 'none';
            categoryGroup.style.display = 'block';
            transactionAccountDestinationInput.required = false;
            transactionCategoryInput.required = false;


            if (transaction.type === 'ingreso') {
                typeToggleIncome.checked = true;
                populateCategoryFilter('ingreso');
            } else { // Gasto (o Transferencia se trataría como gasto en edición simple)
                typeToggleExpense.checked = true;
                populateCategoryFilter('gasto');
            }
            transactionCategoryInput.value = transaction.category_id || '';
            // Deshabilitar cambio de tipo en edición si es complejo manejar transferencias editadas
            typeToggleExpense.disabled = true;
            typeToggleIncome.disabled = true;
            typeToggleTransfer.disabled = true;
            document.querySelectorAll('.type-toggle label').forEach(l => l.classList.add('disabled'));
        } else { // Modo Añadir
            modalTitleTransaction.textContent = 'Añadir Movimiento';
            saveTransactionButton.textContent = 'Guardar';
            transactionDateInput.valueAsDate = new Date(); // Fecha de hoy
            // Habilitar cambio de tipo
            typeToggleExpense.disabled = false;
            typeToggleIncome.disabled = false;
            typeToggleTransfer.disabled = false;
            document.querySelectorAll('.type-toggle label').forEach(l => l.classList.remove('disabled'));
    
            // *** NUEVO: Preseleccionar tipo Gasto/Ingreso ***
            if (defaultType === 'ingreso') {
                typeToggleIncome.checked = true;
                document.querySelector('.type-toggle label.income-btn').classList.add('active'); // Activar estilo
                document.querySelector('.type-toggle label.expense-btn').classList.remove('active');
                populateCategoryFilter('ingreso');
            } else {
                typeToggleExpense.checked = true;
                document.querySelector('.type-toggle label.expense-btn').classList.add('active'); // Activar estilo
                document.querySelector('.type-toggle label.income-btn').classList.remove('active');
                populateCategoryFilter('gasto');
            }
        }

        // Asegurar estilos visuales de botones de tipo
    document.querySelectorAll('#transactionModal .type-toggle label').forEach(label => label.classList.remove('active'));
    const checkedRadio = document.querySelector('#transactionModal input[name="transactionType"]:checked');
    if(checkedRadio) {
        checkedRadio.parentElement.classList.add('active');
    } else { //Fallback si nada está checked
         typeToggleExpense.checked = true;
         typeToggleExpense.parentElement.classList.add('active');
         updateModalUI('gasto');
    }

        toggleTransactionModal(true);
         setTimeout(() => transactionDescriptionInput.focus(), 350); // Enfocar descripción
    }

    // EN Dashboard.js - AÑADE ESTA NUEVA FUNCIÓN COMPLETA

async function loadNextTripSummary() {
    console.log("Cargando Resumen Próximo Viaje...");
    if (!currentUserId || !nextTripSummaryContent) {
        console.error("loadNextTripSummary: UserID o elemento contenedor no encontrado.");
        if(nextTripSummaryContent) nextTripSummaryContent.innerHTML = '<p class="panel-loading error-text">Error interno.</p>';
        return;
    }
    nextTripSummaryContent.innerHTML = '<p class="panel-loading">Buscando próximo viaje...</p>';

    try {
        const today = new Date().toISOString().split('T')[0]; // Fecha de hoy YYYY-MM-DD

        // 1. Buscar el próximo viaje (fecha inicio >= hoy, ordenado por fecha inicio asc)
        const { data: nextTripData, error: tripError } = await supabase
            .from('trips')
            .select('id, name, destination, start_date, end_date, budget, saved_amount') // Campos necesarios
            .eq('user_id', currentUserId)
            .gte('start_date', today) // Fecha inicio desde hoy en adelante
            .order('start_date', { ascending: true }) // El más cercano primero
            .limit(1) // Solo queremos uno
            .maybeSingle(); // Para manejar si no hay ninguno

        if (tripError) throw new Error(`Error buscando próximo viaje: ${tripError.message}`);

        if (!nextTripData) {
            nextTripSummaryContent.innerHTML = '<p class="panel-loading no-data">No tienes viajes próximos planificados.</p>';
            return;
        }

        // 2. Calcular progreso de ahorro
        const budget = Number(nextTripData.budget) || 0;
        const saved = Number(nextTripData.saved_amount) || 0;
        const progress = budget > 0 ? Math.min(100, Math.max(0, (saved / budget) * 100)) : (saved > 0 ? 100 : 0); // Si no hay presupuesto pero se ahorró -> 100%? O 0%? Decidamos 0% si no hay presupuesto.
        const progressToShow = budget > 0 ? progress : 0; // Mostrar 0% si no hay presupuesto definido

        // Color barra progreso (puedes ajustar)
        let progressBarColor = 'var(--accent-purple)'; // Morado ahorro
        if (progressToShow >= 100) progressBarColor = 'var(--accent-green)'; // Verde completado
        else if (progressToShow >= 75) progressBarColor = 'var(--accent-orange)'; // Naranja avanzado

        // 3. Mostrar usando creación manual DOM y clases dedicadas
        nextTripSummaryContent.innerHTML = ''; // Limpiar "cargando"

        const itemDiv = document.createElement('div');
        itemDiv.classList.add('trip-summary-item'); // <<< Nueva clase CSS dedicada

        // Crear icono
        const iconSpan = document.createElement('span');
        iconSpan.className = 'trip-summary-icon';
        const iconI = document.createElement('i');
        iconI.className = getIconForTrip(); // Icono genérico de viaje
        iconSpan.appendChild(iconI);

        // Crear Info (Nombre, Destino, Fechas, Barra)
        const infoDiv = document.createElement('div');
        infoDiv.className = 'trip-summary-info';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'trip-summary-name';
        nameSpan.textContent = nextTripData.name || 'Próximo Viaje';
        infoDiv.appendChild(nameSpan);

        if (nextTripData.destination) { // Mostrar destino solo si existe
            const destSpan = document.createElement('span');
            destSpan.className = 'trip-summary-destination';
            destSpan.textContent = nextTripData.destination;
            infoDiv.appendChild(destSpan);
        }

        const dateSpan = document.createElement('span');
        dateSpan.className = 'trip-summary-dates';
        dateSpan.textContent = `${formatDate(nextTripData.start_date)} - ${formatDate(nextTripData.end_date)}`;
        infoDiv.appendChild(dateSpan);

        const progressBarContainer = document.createElement('div');
        progressBarContainer.className = 'progress-bar-container mini'; // Reutilizar clase mini
         const progressBar = document.createElement('div');
         progressBar.className = 'progress-bar mini'; // Reutilizar clase mini
         progressBar.style.width = `${progressToShow.toFixed(1)}%`;
         progressBar.style.backgroundColor = progressBarColor;
         progressBar.title = `${progressToShow.toFixed(1)}% Ahorrado`;
         progressBarContainer.appendChild(progressBar);
        infoDiv.appendChild(progressBarContainer);


        // Crear Cantidades (Ahorrado / Presupuesto)
        const amountSpan = document.createElement('span');
        amountSpan.className = 'trip-summary-amount'; // Nueva clase dedicada
        amountSpan.innerHTML = `${formatCurrency(saved)} / ${formatCurrency(budget)}`; // Mostrar Ahorrado / Presupuesto

        // Añadir todo al item principal
        itemDiv.appendChild(iconSpan);
        itemDiv.appendChild(infoDiv);
        itemDiv.appendChild(amountSpan);

        nextTripSummaryContent.appendChild(itemDiv); // Añadir el item del viaje

        // Añadir enlace "Ver todos..." (opcional)
        const link = document.createElement('a');
        //link.href = '/Trips.html'; // Ruta a la página de viajes
        //link.textContent = 'Ver todos los viajes...';
        link.classList.add('panel-link', 'more-link');
        nextTripSummaryContent.appendChild(link);


    } catch (error) {
        console.error("Error cargando resumen del próximo viaje:", error);
        nextTripSummaryContent.innerHTML = `<p class="panel-loading error-text">Error al cargar viaje.</p>`;
    }
}

    async function loadAccountsSummary() {
        console.log("Cargando Resumen Cuentas...");
        if (!currentUserId || !accountsSummaryContent) {
             console.error("loadAccountsSummary: UserID o elemento contenedor no encontrado.");
             if(accountsSummaryContent) accountsSummaryContent.innerHTML = '<p class="panel-loading error-text">Error interno.</p>';
             return;
        }
        accountsSummaryContent.innerHTML = '<p class="panel-loading">Cargando cuentas...</p>';
    
        try {
            // 1. Obtener cuentas
            const { data: accounts, error: accountsError } = await supabase
                .from('accounts')
                .select('id, name, type, currency')
                .eq('user_id', currentUserId)
                .neq('type', 'tarjeta_credito')
                .order('name', { ascending: true })
                .limit(3);
    
            if (accountsError) throw new Error(`Error cargando cuentas: ${accountsError.message}`);
    
            if (!accounts || accounts.length === 0) {
                accountsSummaryContent.innerHTML = '<p class="panel-loading no-data">No tienes cuentas (aparte de crédito).</p>';
                return;
            }
    
            // 2. Calcular saldos
            const accountBalancePromises = accounts.map(async (acc) => {
                const { data, error } = await supabase
                    .from('transactions')
                    .select('amount')
                    .eq('user_id', currentUserId)
                    .eq('account_id', acc.id);
    
                if (error) {
                    console.error(`Error calculando saldo para cuenta ${acc.name}:`, error);
                    return { ...acc, calculatedBalance: null };
                }
                const balance = (data || []).reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
                return { ...acc, calculatedBalance: balance };
            });
    
            const accountsWithBalances = await Promise.all(accountBalancePromises);
    
            // 3. Mostrar cuentas (Usando createElement en lugar de innerHTML)
            accountsSummaryContent.innerHTML = ''; // Limpiar "cargando"
    
            accountsWithBalances.forEach(acc => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'account-summary-item'; // Clase principal del item
    
                // --- INICIO: Creación Manual DOM ---
                itemDiv.innerHTML = ''; // Asegurar que esté vacío
    
                // Crear icono
                const iconSpan = document.createElement('span');
                iconSpan.className = 'account-summary-icon';
                const iconI = document.createElement('i');
                iconI.className = getIconForAccountType(acc.type); // Obtener clase Font Awesome
                iconSpan.appendChild(iconI);
    
                // Crear nombre
                const nameSpan = document.createElement('span');
                nameSpan.className = 'account-summary-name';
                nameSpan.textContent = acc.name || 'Sin Nombre'; // Asignar texto
    
                // Crear saldo
                const balanceSpan = document.createElement('span');
                const balanceText = (acc.calculatedBalance !== null)
                                    ? formatCurrency(acc.calculatedBalance, acc.currency || 'EUR')
                                    : 'Error';
                let balanceClass = 'neutral';
                if (acc.calculatedBalance !== null) {
                    if (acc.calculatedBalance > 0) balanceClass = 'income';
                    else if (acc.calculatedBalance < 0) balanceClass = 'expense';
                }
                balanceSpan.className = `account-summary-balance ${balanceClass}`; // Asignar clases
                balanceSpan.textContent = balanceText; // Asignar texto formateado
    
                // Añadir los spans al div del item
                itemDiv.appendChild(iconSpan);
                itemDiv.appendChild(nameSpan);
                itemDiv.appendChild(balanceSpan);
                // --- FIN: Creación Manual DOM ---
    
                accountsSummaryContent.appendChild(itemDiv); // Añadir el item completo
            });
    
            // Añadir enlace "Ver todas..." (código igual que antes)
            const { count: totalAccounts } = await supabase
                .from('accounts')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', currentUserId)
                .neq('type', 'tarjeta_credito');
    
            if (totalAccounts > accounts.length) {
                const link = document.createElement('a');
                //link.href = '/Accounts.html';
                //link.textContent = 'Ver todas las cuentas...';
                link.classList.add('panel-link', 'more-link');
                accountsSummaryContent.appendChild(link);
            }
    
        } catch (error) {
            console.error("Error cargando resumen de cuentas:", error);
            accountsSummaryContent.innerHTML = `<p class="panel-loading error-text">Error al cargar cuentas.</p>`;
        }
    }

    async function loadEvaluationSummary() {
        console.log("Cargando Resumen Evaluación...");
        if (!currentUserId || !evaluationSummaryContent) {
            console.error("loadEvaluationSummary: UserID o elemento contenedor no encontrado.");
            if(evaluationSummaryContent) evaluationSummaryContent.innerHTML = '<p class="panel-loading error-text">Error interno.</p>';
            return;
        }
        evaluationSummaryContent.innerHTML = '<p class="panel-loading">Cargando planificación...</p>';
    
        try {
            // Obtener fechas del mes actual
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth();
            const firstDayOfMonth = new Date(year, month, 1).toISOString().split('T')[0];
            const lastDayOfMonth = new Date(year, month + 1, 0).toISOString().split('T')[0];
    
            // Buscar la evaluación para el mes actual
            const { data: evaluationData, error: evaluationError } = await supabase
                .from('evaluaciones')
                // Seleccionar todas las columnas de planificación
                .select('ingreso, ahorro_mes, colchon, viajes, inversion, fijos, variables, extra')
                .eq('user_id', currentUserId)
                .gte('evaluation_date', firstDayOfMonth)
                .lte('evaluation_date', lastDayOfMonth)
                .maybeSingle(); // Solo debería haber una por mes
    
            if (evaluationError) throw new Error(`Error obteniendo evaluación: ${evaluationError.message}`);
    
            if (!evaluationData) {
                evaluationSummaryContent.innerHTML = '<p class="panel-loading no-data">No hay planificación definida para este mes.</p>';
                return;
            }
    
            // Mapear los datos a un formato de lista para mostrar
            // Ajusta los iconos a tu gusto (clases Font Awesome)
            const planItems = [
                { label: 'Ingresos Planificados', amount: evaluationData.ingreso, icon: 'fa-arrow-down' }, // Icono para ingreso
                { label: 'Gastos Fijos', amount: evaluationData.fijos, icon: 'fa-file-invoice-dollar' },
                { label: 'Gastos Variables', amount: evaluationData.variables, icon: 'fa-shopping-cart' },
                { label: 'Ahorro Mes', amount: evaluationData.ahorro_mes, icon: 'fa-piggy-bank' },
                { label: 'Ahorro Colchón', amount: evaluationData.colchon, icon: 'fa-shield-alt' },
                { label: 'Inversiones', amount: evaluationData.inversion, icon: 'fa-chart-line' },
                { label: 'Viajes', amount: evaluationData.viajes, icon: 'fa-plane-departure' },
                { label: 'Extra/Imprevistos', amount: evaluationData.extra, icon: 'fa-question-circle' }
            ];
    
            evaluationSummaryContent.innerHTML = ''; // Limpiar "cargando"
    
            planItems.forEach(item => {
                // Solo mostrar si tiene un importe asignado (o mostrar 0 si prefieres)
                const amountValue = Number(item.amount) || 0;
                if (amountValue > 0 || item.label === 'Ingresos Planificados') {
                    const itemDiv = document.createElement('div');
                    // >>> USA CLASES ESPECÍFICAS <<<
                    itemDiv.classList.add('evaluation-item'); // Nueva clase

                    // Crear icono
                    const iconSpan = document.createElement('span');
                    iconSpan.className = 'evaluation-icon'; // Nueva clase
                    const iconI = document.createElement('i');
                    iconI.className = `fas ${item.icon}`;
                    iconSpan.appendChild(iconI);

                    // Crear descripción/label
                    const descSpan = document.createElement('span');
                    descSpan.className = 'evaluation-label'; // Nueva clase
                    descSpan.textContent = item.label;

                    // Crear importe
                    const amountSpan = document.createElement('span');
                    const amountClass = item.label === 'Ingresos Planificados' ? 'income' : 'expense';
                    amountSpan.className = `evaluation-amount ${amountClass}`; // Nueva clase + income/expense
                    amountSpan.textContent = formatCurrency(amountValue);

                    // Añadir los elementos creados al div principal del item
                    itemDiv.appendChild(iconSpan);
                    itemDiv.appendChild(descSpan);
                    itemDiv.appendChild(amountSpan);

                    // Añadir el item completo al contenedor del widget
                    evaluationSummaryContent.appendChild(itemDiv);
                }
            });
    
                    // Añadir enlace a evaluaciones (opcional)
                    const link = document.createElement('a');
                    //link.href = '/Evaluaciones.html'; // Ajusta la ruta si es diferente
                    //link.textContent = 'Ver/Editar Planificación...';
                    link.classList.add('panel-link', 'more-link');
                    evaluationSummaryContent.appendChild(link);
    
    
        } catch (error) {
            console.error("Error cargando resumen de evaluación:", error);
            evaluationSummaryContent.innerHTML = `<p class="panel-loading error-text">Error al cargar planificación.</p>`;
        }
    }

    // Añade esta nueva función en Dashboard.js
    function updateModalUI(selectedType) {
        const isTransfer = selectedType === 'transferencia';

        // Mostrar/Ocultar campos
        if (categoryGroup) categoryGroup.style.display = isTransfer ? 'none' : 'block';
        if (accountDestinationGroup) accountDestinationGroup.style.display = isTransfer ? 'block' : 'none';

        // Cambiar etiqueta de la primera cuenta
        if (transactionAccountLabel) {
            transactionAccountLabel.textContent = isTransfer ? 'Cuenta Origen' : 'Cuenta';
        }

        // Ajustar campos requeridos
        if (transactionAccountDestinationInput) transactionAccountDestinationInput.required = isTransfer;
        if (transactionCategoryInput) transactionCategoryInput.required = !isTransfer; // Categoría no requerida para transferencias

        // Repoblar categorías si es Gasto/Ingreso
        if (!isTransfer) {
            populateCategoryFilter(selectedType);
        }
    }

    async function handleTransactionFormSubmit(event) {
        event.preventDefault();
        if (!supabase || !currentUserId || !transactionForm || !saveTransactionButton || !transactionAccountInput || !transactionAccountDestinationInput || !transactionCategoryInput) return;
    
        const transactionId = transactionIdInput.value;
        const isEditing = !!transactionId;
        const originalSaveText = saveTransactionButton.textContent; // Usa saveButton, no saveTransactionButton? Verifica ID
    
        // --- OBTENER DATOS COMUNES ---
        const typeInput = document.querySelector('#transactionModal input[name="transactionType"]:checked');
        const type = typeInput ? typeInput.value : 'gasto'; // Gasto por defecto si falla
        const amount = Math.abs(parseFloat(transactionAmountInput.value) || 0); // Siempre positivo aquí
        const transaction_date = transactionDateInput.value;
        const description = transactionDescriptionInput.value.trim();
        const notes = transactionNotesInput.value.trim() || null;
    
        // --- VALIDACIONES COMUNES ---
        if (isNaN(amount) || amount <= 0) { modalTransactionError.textContent = 'El importe debe ser mayor que cero.'; modalTransactionError.style.display = 'block'; return; }
        if (!transaction_date) { modalTransactionError.textContent = 'La fecha es obligatoria.'; modalTransactionError.style.display = 'block'; return; }
        if (!description) { modalTransactionError.textContent = 'La descripción es obligatoria.'; modalTransactionError.style.display = 'block'; return; }
    
        modalTransactionError.style.display = 'none';
        saveTransactionButton.disabled = true; // Usa saveButton? Verifica ID
        saveTransactionButton.textContent = isEditing ? 'Guardando...' : 'Creando...';
    
        try {
            let result = null; // Para almacenar el resultado de Supabase
    
            // --- LÓGICA SEGÚN TIPO ---
            if (type === 'transferencia') {
                console.log("Procesando TRANSFERENCIA...");
                const sourceAccountId = transactionAccountInput.value;
                const destinationAccountId = transactionAccountDestinationInput.value;
    
                // Validación específica de transferencia
                if (!sourceAccountId || !destinationAccountId) {
                    throw new Error('Debes seleccionar cuenta origen y destino para transferencias.');
                }
                if (sourceAccountId === destinationAccountId) {
                    throw new Error('La cuenta origen y destino no pueden ser la misma.');
                }
    
                // ID de categoría para transferencias (¡¡IMPORTANTE!!)
                // Debes tener una (o dos) categorías para esto en tu tabla 'categories'
                // Busca su UUID y ponlo aquí. Ejemplo:
                const TRANSFER_CATEGORY_ID_OUT = '2d55034c-0587-4d9c-9d93-5284d6880c76'; // REEMPLAZA ESTO
                const TRANSFER_CATEGORY_ID_IN = '7547fdfa-f7b2-44f4-af01-f937bfcc5be3'; // REEMPLAZA ESTO (o usa la misma si solo tienes una)
    
                 if (!TRANSFER_CATEGORY_ID_OUT || !TRANSFER_CATEGORY_ID_IN) {
                     console.error("ERROR CRÍTICO: IDs de categoría de transferencia no definidos en el código JS.");
                     throw new Error("Error de configuración interno (IDs de categoría de transferencia).");
                 }
    
    
                // Crear los dos registros de transacción
                const gastoTransferencia = {
                    user_id: currentUserId,
                    account_id: sourceAccountId,
                    category_id: TRANSFER_CATEGORY_ID_OUT,
                    type: 'gasto',
                    description: `Transferencia a ${accounts.find(a => a.id === destinationAccountId)?.name || 'otra cuenta'}: ${description}`, // Descripción auto-generada
                    amount: -amount, // Negativo para gasto
                    transaction_date: transaction_date,
                    notes: notes
                };
                const ingresoTransferencia = {
                    user_id: currentUserId,
                    account_id: destinationAccountId,
                    category_id: TRANSFER_CATEGORY_ID_IN,
                    type: 'ingreso',
                    description: `Transferencia desde ${accounts.find(a => a.id === sourceAccountId)?.name || 'otra cuenta'}: ${description}`, // Descripción auto-generada
                    amount: amount, // Positivo para ingreso
                    transaction_date: transaction_date,
                    notes: notes
                };
    
                // Insertar ambas en una sola llamada
                console.log("Insertando transferencia (2 transacciones):", gastoTransferencia, ingresoTransferencia);
                try { // Añadir un try/catch específico aquí
                    console.log(">>> INTENTANDO AWAIT supabase.from('transactions').insert([...])"); // Log ANTES
                    result = await supabase.from('transactions').insert([gastoTransferencia, ingresoTransferencia]);
                    console.log(">>> AWAIT insert COMPLETADO. Resultado:", result); // Log DESPUÉS (solo si funciona)
                } catch (insertError) {
                    console.error(">>> ERROR específico durante el insert de transferencia:", insertError); // Log si falla el insert
                    throw insertError; // Relanzar para que lo capture el catch principal
                }
    
            } else { // Gasto o Ingreso normal
                 console.log(`Procesando ${type.toUpperCase()}...`);
                 const account_id = transactionAccountInput.value || null;
                 const category_id = transactionCategoryInput.value || null;
                 const signedAmount = type === 'gasto' ? -amount : amount;
    
                 if (!account_id) throw new Error('Debes seleccionar una cuenta.');
                 // Puedes añadir validación de categoría si es obligatoria para Gasto/Ingreso
    
                 const transactionData = { user_id: currentUserId, account_id, category_id, type, description, amount: signedAmount, transaction_date, notes };
    
                 if (isEditing) { // Edición (simplificada, no maneja cambio a/desde transferencia)
                    console.warn("Editando transacción desde Dashboard modal?");
                     delete transactionData.user_id; // No se debe enviar en update si RLS protege
                     result = await supabase.from('transactions').update(transactionData).eq('id', transactionId).eq('user_id', currentUserId);
                 } else { // Inserción
                     console.log("Insertando transacción única:", transactionData);
                     result = await supabase.from('transactions').insert([transactionData]);
                 }
            }
    
            // Verificar error del resultado de Supabase
            if (result.error) throw result.error;
    
            // Éxito
            console.log('Operación guardada:', type, (isEditing ? '(Editado)' : '(Creado)'));
            closeTransactionModal();
            loadRecentActivity(); // Actualizar widget de actividad
            loadSummaryData(); // Actualizar widget principal (Gasto Variable Restante)
            // Podrías querer recargar también el saldo total de la página de Cuentas si estuvieras allí
             if (typeof loadAccountsAndUser === 'function') loadAccountsAndUser(currentUser);
    
    
        } catch (error) {
            console.error(`Error guardando ${type}:`, error);
            modalTransactionError.textContent = `Error: ${error.message}`;
            modalTransactionError.style.display = 'block';
        } finally {
            saveTransactionButton.disabled = false;
            saveTransactionButton.textContent = isEditing ? 'Guardar Cambios' : 'Guardar';
        }
    }

    // Modificar la función que carga todo o añadir una nueva llamada
    async function loadInitialData(user) {
        console.log("Dashboard.js: loadInitialData - FUNCTION START")
        // Comprobación inicial
        if (!user) {
            console.warn("Dashboard.js: loadInitialData llamado sin usuario.");
            return;
        }
        currentUserId = user.id; // Asignar user ID
        currentUser = user; // Guardar el objeto user completo si lo necesitas
        console.log("Dashboard.js: Loading initial data for user:", currentUserId);
    
        // Poner avatar por defecto mientras carga (asumiendo que userAvatarHeader ya fue obtenido en DOMContentLoaded)
        if (userAvatarHeader) { // Comprobar si el elemento existe
             userAvatarHeader.src = defaultAvatarPath;
        }
         // Poner saludo básico mientras carga (asumiendo que greetingEl ya fue obtenido)
         if(greetingEl) {
             greetingEl.textContent = `¡Hola!`;
         }
         // Asegurar que los botones de acción rápida empiecen deshabilitados (por si el HTML no lo hizo)
         //if (quickAddExpenseBtn) quickAddExpenseBtn.disabled = true;
         //if (quickAddIncomeBtn) quickAddIncomeBtn.disabled = true;
    
    
        try {
            // Cargar perfil, cuentas y categorías en paralelo
            const [profileRes, accountsRes, categoriesRes] = await Promise.all([
                supabase.from('profiles').select('avatar_url, full_name').eq('id', currentUserId).single(),
                supabase.from('accounts').select('id, name').eq('user_id', currentUserId).order('name'),
                // Asegúrate de que este select incluya 'type' si lo necesitas para populateCategoryFilter
                supabase.from('categories').select('id, name, type').or(`user_id.eq.${currentUserId},is_default.eq.true`).order('name')
            ]);

    
            // -- Procesar resultados --
    
            // Avatar y Saludo
            // Comprobar si los elementos existen antes de usarlos
            if (userAvatarHeader) {
                 const avatarUrl = profileRes.data?.avatar_url;
                 if (avatarUrl) {
                     // Añadir timestamp para caché
                     const url = new URL(avatarUrl);
                     url.searchParams.set('t', new Date().getTime());
                     userAvatarHeader.src = url.toString();
                 } else {
                     userAvatarHeader.src = defaultAvatarPath;
                 }
            }
            if (greetingEl) {
                greetingEl.textContent = `¡Hola${profileRes.data?.full_name ? ', ' + profileRes.data.full_name.split(' ')[0] : ''}!`;
            }
    
            // Cuentas (para modal)
            if (accountsRes.error) {
                 console.error("Error cargando cuentas:", accountsRes.error);
                 // Lanzar error para que lo capture el catch principal y los botones no se activen
                 throw new Error(`Error al cargar cuentas: ${accountsRes.error.message}`);
            }
            accounts = accountsRes.data || []; // Asignar a variable global
            
            console.log("Dashboard.js: loadInitialData - Accounts asignados, length:", accounts?.length); // Log tras asignar
    
            // Categorías (para modal)
            if (categoriesRes.error) {
                console.error("Error cargando categorías:", categoriesRes.error);
                // Lanzar error
                throw new Error(`Error al cargar categorías: ${categoriesRes.error.message}`);
            }
            categories = categoriesRes.data || []; // Asignar a variable global
            
            console.log("Dashboard.js: loadInitialData - Categories asignados, length:", categories?.length); // Log tras asignar
    
            // -- Habilitar Botones de Acción Rápida (DESPUÉS de cargar datos necesarios) --
    
            console.error('!!!! INTENTANDO HABILITAR BOTONES AHORA !!!!');

            // Log para depurar si encontramos los botones y los datos
            console.log(`DEBUG: Antes de habilitar - Accounts length: ${accounts?.length}, Categories length: ${categories?.length}`);
            console.log('DEBUG: Antes de habilitar - Botón Gasto:', quickAddExpenseBtn); // ¿Es un elemento o null?
            console.log('DEBUG: Antes de habilitar - Botón Ingreso:', quickAddIncomeBtn);
            console.log('DEBUG: Antes de habilitar - Botón Ingreso:', quickAddTripExpenseBtn); // ¿Es un elemento o null?
    
            if (accounts.length > 0 && categories.length > 0) {
                initialDataLoaded = true;
                console.log(">>>> Flag initialDataLoaded puesto a TRUE <<<<");
           } else {
                initialDataLoaded = false; // Asegurar que sea false si falta algo
                console.warn("WARN: Cuentas o categorías vacías tras carga, initialDataLoaded = false.");
           }
            console.log("Dashboard.js: loadInitialData - Antes de loadAllDashboardData");
            // Cargar los widgets del dashboard (esto puede seguir)
            loadAllDashboardData(); // Esta función llama a las demás load...()
            console.log("Dashboard.js: loadInitialData - Después de llamar a loadAllDashboardData");

        } catch (error) {
            // Si OCURRE UN ERROR durante la carga inicial, lo mostramos y nos aseguramos
            // de que los botones permanezcan deshabilitados.
            console.error("Error cargando datos iniciales (Dashboard):", error);
            initialDataLoaded = false;
           // if (quickAddExpenseBtn) quickAddExpenseBtn.disabled = true;
            //if (quickAddIncomeBtn) quickAddIncomeBtn.disabled = true;
            // Mostrar un error general si falla la carga inicial (opcional)
            // Por ejemplo, en el panel de saludo:
            if(greetingEl) greetingEl.textContent = 'Error al cargar';
            if(totalBalanceEl) totalBalanceEl.textContent = '-';
            // O podrías reemplazar todo el grid:
            // const dashboardGrid = document.getElementById('dashboardGrid');
            // if (dashboardGrid) dashboardGrid.innerHTML = `<p class="error-text" style="text-align: center; padding: 40px;">Error cargando datos del dashboard: ${error.message}</p>`;
        } finally { // <-- BLOQUE FINALLY AÑADIDO
            console.log("Dashboard.js: loadInitialData - FUNCTION END (Finally)");
        }
    }
    
    function closeTransactionModal() { toggleTransactionModal(false); }

    /** Muestra u oculta el panel de notificaciones */
    function toggleNotificationPanel(show) {
        if (!notificationPanel) return;
        isNotificationPanelOpen = show ?? !isNotificationPanelOpen; // Toggle si no se especifica show
        if (isNotificationPanelOpen) {
            notificationPanel.classList.add('active');
            fetchAndDisplayNotifications(); // Cargar al abrir
        } else {
            notificationPanel.classList.remove('active');
        }
        console.log("Panel notificaciones visible:", isNotificationPanelOpen);
    }

    /** Busca y muestra las notificaciones */
    async function fetchAndDisplayNotifications() {
        if (!currentUserId || !notificationList) return;
        notificationList.innerHTML = '<p class="panel-loading">Cargando...</p>'; // Mostrar cargando

        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', currentUserId)
                .order('created_at', { ascending: false }) // Más recientes primero
                .limit(15); // Limitar a las últimas 15

            if (error) throw error;

            notificationsCache = data || []; // Guardar en caché
            if (notificationsCache.length === 0) {
                notificationList.innerHTML = '<p class="panel-empty">No tienes notificaciones.</p>';
                return;
            }

            notificationList.innerHTML = ''; // Limpiar
            notificationsCache.forEach(n => {
                const item = document.createElement('div');
                item.classList.add('notification-item');
                if (!n.is_read) item.classList.add('unread');
                item.setAttribute('data-id', n.id);

                item.innerHTML = `
                    <span class="${getNotificationIcon(n.type)}"></span>
                    <div class="content">
                        <p class="message">${n.message || ''}</p>
                        <span class="timestamp">${timeAgo(n.created_at)}</span>
                    </div>
                `;
                // Añadir listener para marcar como leída al hacer clic (opcional)
                item.addEventListener('click', () => handleNotificationClick(n.id));
                notificationList.appendChild(item);
            });

        } catch (error) {
            console.error("Error cargando notificaciones:", error);
            notificationList.innerHTML = '<p class="panel-empty error-text">Error al cargar.</p>';
        }
    }

    /** Marca notificaciones como leídas */
    async function markNotificationsRead(notificationIds = null) { // null para marcar todas las no leídas
        if (!currentUserId || !supabase) {
            console.error("markNotificationsRead: UserID o Supabase client no disponible.");
            return;
        }
        const operationType = notificationIds ? `IDs específicos: ${notificationIds.join(', ')}` : 'Todas las no leídas';
        console.log(`Marcando notificaciones como leídas: ${operationType}`);

        // Mostrar un indicador de carga (opcional)
        if(markAllReadBtn) markAllReadBtn.textContent = 'Marcando...';

        try {
            const updatePayload = { is_read: true };
            console.log("Datos a actualizar:", updatePayload); // Log para ver qué se envía
            let query = supabase.from('notifications')
            .update(updatePayload)
            .eq('user_id', currentUserId);
            //let query = supabase.from('notifications')
            //    .update({ is_read: true, updated_at: new Date() })
            //    .eq('user_id', currentUserId);

            if (Array.isArray(notificationIds) && notificationIds.length > 0) {
                query = query.in('id', notificationIds); // Marcar IDs específicos
                console.log("Aplicando filtro: IDs específicos");
            } else if (notificationIds === null) {
                query = query.eq('is_read', false); // Marcar todas las no leídas
                console.log("Aplicando filtro: is_read = false");
            } else {
                console.warn("Llamada inválida a markNotificationsRead, no se especificaron IDs ni null.");
                return; // No hacer nada si el input no es válido
            }

            console.log("Ejecutando query UPDATE...");
            const { data, error } = await query.select(); // Añadir .select() para obtener más info en caso de éxito/error
            console.log("Resultado de la query UPDATE:", { data, error }); // Log del resultado completo
            if (error) throw error;

            console.log("Notificaciones marcadas como leídas en BD.");
            // Refrescar contador y lista visualmente
            loadNotificationCount();
            // Marcar visualmente en la lista cacheada si está abierta
            if (isNotificationPanelOpen && notificationList) {
                const idsToMark = notificationIds || notificationsCache.filter(n => !n.is_read).map(n => n.id);
                idsToMark.forEach(id => {
                    const item = notificationList.querySelector(`.notification-item[data-id="${id}"]`);
                    if (item) item.classList.remove('unread');
                    // Actualizar caché local
                    const cachedIndex = notificationsCache.findIndex(n => n.id === id);
                    if(cachedIndex > -1) notificationsCache[cachedIndex].is_read = true;
                });
                fetchAndDisplayNotifications();
            }

        } catch (error) {
            // --- Log de error más detallado ---
            console.error("Error marcando notificaciones como leídas (Bloque Catch):", {
                 message: error?.message,
                 details: error?.details,
                 hint: error?.hint,
                 code: error?.code,
                 rawError: error // Mostrar el objeto de error completo
             });
            alert(`Error al marcar notificaciones como leídas: ${error?.message || 'Error desconocido'}`); // Informar al usuario
        } finally {
             // Quitar indicador de carga (opcional)
             if(markAllReadBtn) markAllReadBtn.textContent = 'Marcar todas como leídas';
        }
    }

    /** Maneja el clic en una notificación individual */
    function handleNotificationClick(notificationId) {
        console.log("Clic en notificación:", notificationId);
        const notification = notificationsCache.find(n => n.id === notificationId);
        // Marcarla como leída si no lo estaba
        if (notification && !notification.is_read) {
            markNotificationsRead([notificationId]);
        }
        // Opcional: Redirigir a la sección relacionada si existe
         if (notification?.related_entity_type === 'goals') {
            window.location.href = `/Goals.html#goal-${notification.related_entity_id}`;
         }
        // O simplemente cerrar el panel
         toggleNotificationPanel(false);
    }


    async function loadSummaryData() {
        console.log("Cargando datos de Resumen...");
        if (!currentUserId || !greetingEl || !totalBalanceEl) {
            console.error("loadSummaryData: Elementos DOM o UserID no disponibles.");
            return;
       }
        greetingEl.textContent = `¡Hola${currentUser?.user_metadata?.full_name ? ', ' + currentUser.user_metadata.full_name.split(' ')[0] : ''}!`; // Saludo con nombre
        totalBalanceEl.textContent = 'Calculando...';
        const progressBarContainer = document.getElementById('variableSpendingProgress');
        if (progressBarContainer) {
            // Mostrar placeholder o limpiar mientras carga
            progressBarContainer.innerHTML = '<div class="progress-bar-placeholder" style="height: 10px; background-color: var(--border-color); border-radius: 5px;"></div>';
        }
        try {
            // --- Paso 1: Obtener la asignación para gastos variables del mes actual ---
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth(); // 0-11
            // Buscar evaluación cuya fecha esté en el mes actual
            // Importante: Asume que evaluation_date se guarda bien para el mes
            const firstDayOfMonth = new Date(year, month, 1);
            const lastDayOfMonth = new Date(year, month + 1, 0);
    
            const { data: evaluationData, error: evaluationError } = await supabase
                .from('evaluaciones')
                .select('variables') // Seleccionar la columna donde guardas la asignación
                .eq('user_id', currentUserId)
                .gte('evaluation_date', firstDayOfMonth.toISOString().split('T')[0])
                .lte('evaluation_date', lastDayOfMonth.toISOString().split('T')[0])
                .maybeSingle(); // Puede que no haya evaluación para el mes
    
            if (evaluationError) throw new Error(`Error obteniendo evaluación: ${evaluationError.message}`);
            const variableAllocation = Number(evaluationData?.variables) || 0; // Asignación inicial, o 0 si no hay
            console.log("Asignación Variable para el mes:", variableAllocation);
    
            // --- Paso 2: Obtener IDs de categorías variables de tipo gasto ---
            // ASUME que has añadido la columna 'is_variable' (boolean) a 'categories'
            const { data: variableCategories, error: categoriesError } = await supabase
                .from('categories')
                .select('id')
                .eq('type', 'gasto') // Solo categorías de gasto
                .is('is_variable', true); // Solo las marcadas como variables
    
            if (categoriesError) throw new Error(`Error obteniendo categorías variables: ${categoriesError.message}`);
    
            const variableCategoryIds = variableCategories ? variableCategories.map(cat => cat.id) : [];
            console.log("IDs de Categorías Variables de Gasto:", variableCategoryIds);
    
            let totalVariableSpending = 0;
            if (variableCategoryIds.length > 0) {
                // --- Paso 3: Sumar transacciones de gasto del mes actual para esas categorías ---
                const firstDayOfMonthStr = firstDayOfMonth.toISOString().split('T')[0];
                const lastDayOfMonthStr = lastDayOfMonth.toISOString().split('T')[0];
    
                const { data: transactions, error: transactionsError } = await supabase
                    .from('transactions')
                    .select('amount')
                    .eq('user_id', currentUserId)
                    .eq('type', 'gasto')
                    .gte('transaction_date', firstDayOfMonthStr)
                    .lte('transaction_date', lastDayOfMonthStr)
                    .in('category_id', variableCategoryIds); // Filtrar por las categorías variables
    
                if (transactionsError) throw new Error(`Error obteniendo gastos variables: ${transactionsError.message}`);
    
                totalVariableSpending = (transactions || []).reduce((sum, tx) => sum + Math.abs(Number(tx.amount) || 0), 0);
                console.log("Suma de Gastos Variables del mes:", totalVariableSpending);
            } else {
                console.log("No se encontraron categorías marcadas como variables o no hay IDs.");
            }
    
    
            // --- Paso 4: Calcular restante y mostrar ---
            const remainingVariableAmount = variableAllocation - totalVariableSpending;
            const percentageSpent = (variableAllocation > 0)
            ? Math.min(100, Math.max(0, (totalVariableSpending / variableAllocation) * 100))
            : 0; // 0% si no hay presupuesto
            console.log("Restante Variable:", remainingVariableAmount);
            console.log("Porcentaje Gastado:", percentageSpent);
    
            totalBalanceEl.textContent = formatCurrency(remainingVariableAmount);
            // Opcional: Añadir texto descriptivo
            // totalBalanceEl.insertAdjacentHTML('beforebegin', '<span class="summary-label" style="font-size: 0.7em; color: var(--text-muted);">Gasto Variable Restante:</span>');
            if (progressBarContainer) {
                let progressBarColor = 'var(--accent-green)'; // Verde por defecto (Ej: #4CAF50)
                if (percentageSpent >= 95) progressBarColor = 'var(--accent-red)'; // Rojo (Ej: #f44336)
                else if (percentageSpent >= 75) progressBarColor = 'var(--accent-orange)'; // Naranja (Ej: #ff9800)
    
                progressBarContainer.innerHTML = `
                    <div class="progress-bar" style="width: ${percentageSpent.toFixed(1)}%; background-color: ${progressBarColor}; height: 10px; border-radius: 5px; transition: width 0.5s ease;"></div>
                `;
                // Nota: Usamos la clase 'progress-bar' genérica. Asume que tienes estilos base para ella.
                // Si tienes '.progress-bar.mini', puedes quitar '.mini' o ajustar el CSS.
            }
    
        } catch (error) {
             console.error("Error cargando saldo total:", error);
             totalBalanceEl.textContent = "Error";
             if (progressBarContainer) progressBarContainer.innerHTML = '<p class="error-text" style="font-size:0.8em;">Error al cargar progreso</p>';
        }
    }

    async function loadBudgetData() {
        console.log("Cargando datos de Presupuestos para Dashboard...");
        if (!currentUserId || !budgetSummaryList) return;
        budgetSummaryList.innerHTML = '<p class="panel-loading">Cargando presupuestos...</p>';

        try {
            // Calcular mes actual (formato YYYY-MM-DD para start_date)
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth();
            const firstDayOfMonth = new Date(year, month, 1).toISOString().split('T')[0];
            const lastDayOfMonth = new Date(year, month + 1, 0).toISOString().split('T')[0];

            // 1. Obtener presupuestos del mes actual con nombre de categoría
            const { data: budgets, error: budgetsError } = await supabase
                .from('budgets')
                .select(`
                    id,
                    category_id,
                    amount,
                    categories ( name, icon )
                `)
                .eq('user_id', currentUserId)
                .eq('start_date', firstDayOfMonth); // Asume que start_date es clave

            if (budgetsError) throw new Error(`Error cargando presupuestos: ${budgetsError.message}`);

            if (!budgets || budgets.length === 0) {
                budgetSummaryList.innerHTML = '<p class="panel-loading no-data">No hay presupuestos definidos para este mes.</p>';
                return;
            }

            // 2. Obtener gastos del mes actual
            const { data: transactions, error: transactionsError } = await supabase
                .from('transactions')
                .select('category_id, amount')
                .eq('user_id', currentUserId)
                .eq('type', 'gasto')
                .not('category_id', 'is', null)
                .gte('transaction_date', firstDayOfMonth)
                .lte('transaction_date', lastDayOfMonth);

            if (transactionsError) throw new Error(`Error cargando gastos: ${transactionsError.message}`);

            // 3. Calcular gasto por categoría
            const spendingMap = {};
            (transactions || []).forEach(tx => {
                spendingMap[tx.category_id] = (spendingMap[tx.category_id] || 0) + Math.abs(tx.amount);
            });

            // 4. Renderizar la lista de presupuestos en el widget
            budgetSummaryList.innerHTML = ''; // Limpiar "cargando"
            // Mostrar solo algunos (ej. los 3 primeros o los más importantes)
            budgets.slice(0, 7).forEach(b => { // Mostrar máximo 3
                const categoryName = b.categories?.name || 'Desconocido';
                const categoryIcon = getIconClass(b.categories?.icon);
                const budgetAmount = Number(b.amount) || 0;
                const spentAmount = spendingMap[b.category_id] || 0;
                const percentage = budgetAmount > 0 ? Math.min((spentAmount / budgetAmount) * 100, 100) : 0;

                let progressBarColor = '#4CAF50'; // Verde por defecto (#48bb78)
                if (percentage >= 95) progressBarColor = '#f44336'; // Rojo (#f56565)
                else if (percentage >= 75) progressBarColor = '#ff9800'; // Naranja/Amarillo (#ecc94b)

                const item = document.createElement('div');
                item.classList.add('budget-item');
                item.innerHTML = `
                    <span class="budget-icon"><i class="${categoryIcon}"></i></span>
                    <div class="budget-info">
                        <span class="budget-name">${categoryName}</span>
                        <div class="progress-bar-container mini">
                            <div class="progress-bar mini" style="width: ${percentage.toFixed(1)}%; background-color: ${progressBarColor};"></div>
                        </div>
                    </div>
                    <span class="budget-amount">${formatCurrency(spentAmount)} / ${formatCurrency(budgetAmount)}</span>
                `;
                budgetSummaryList.appendChild(item);
            });
             // Añadir enlace si hay más presupuestos
             if (budgets.length > 3) {
                 const link = document.createElement('a');
                 link.href = '/Budgets.html';
                 //link.textContent = 'Ver todos...';
                 //link.classList.add('panel-link', 'more-link');
                 budgetSummaryList.appendChild(link);
             }


        } catch (error) {
             console.error("Error cargando resumen presupuestos:", error);
             budgetSummaryList.innerHTML = `<p class="panel-loading error-text">Error al cargar presupuestos.</p>`;
        }
    }

    async function loadDebtsSummary() {
        console.log("Cargando Resumen Deudas (Lista Items)...");
        const debtsContentEl = document.getElementById('debtsSummaryContent');
        if (!currentUserId || !debtsContentEl) return;
        debtsContentEl.innerHTML = '<p class="panel-loading">Cargando deudas...</p>';
    
        try {
            const { data: activeDebts, error } = await supabase
                .from('debts')
                // Seleccionar campos necesarios para la lista y el progreso
                .select('id, creditor, current_balance, initial_amount')
                .eq('user_id', currentUserId)
                .neq('status', 'Pagada') // Deudas activas
                .order('due_date', { ascending: true, nullsLast: true }) // Ordenar opcionalmente por fecha
                .limit(3); // Mostrar máximo 3 deudas
    
            if (error) throw error;
    
            if (!activeDebts || activeDebts.length === 0) {
                debtsContentEl.innerHTML = '<p class="panel-loading no-data">No tienes deudas activas.</p>';
                return;
            }
    
            debtsContentEl.innerHTML = ''; // Limpiar "cargando"
    
            activeDebts.forEach(debt => {
                const initialAmount = Number(debt.initial_amount) || 0;
                const currentBalance = Number(debt.current_balance) || 0;
                // Calcular porcentaje PAGADO para la barra de progreso
                const paidAmount = initialAmount - currentBalance;
                // Asegurarse que paidAmount no sea negativo si current_balance > initial (raro)
                const safePaidAmount = Math.max(0, paidAmount);
                const percentagePaid = initialAmount > 0 ? Math.min((safePaidAmount / initialAmount) * 100, 100) : 0;
    
                let progressBarColor = '#f44336'; // Rojo por defecto (deuda)
                if (percentagePaid >= 95) progressBarColor = '#ff9800'; // Naranja si está casi pagada
                if (percentagePaid >= 100) progressBarColor = '#4CAF50'; // Verde si está pagada (aunque no debería aparecer por el filtro de status)
    
    
                const item = document.createElement('div');
                // Usar una clase como las de budget/goal o una nueva: 'debt-item'
                item.classList.add('debt-item'); // Usa la misma clase contenedora que Metas
                item.innerHTML = `
                    <span class="goal-icon"><i class="fas fa-file-invoice-dollar"></i></span> <div class="goal-info"> <span class="goal-name">${debt.creditor}</span> <div class="progress-bar-container mini">
                            <div class="progress-bar mini" style="width: ${percentagePaid.toFixed(1)}%; background-color: ${progressBarColor};"></div>
                        </div>
                    </div>
                    <span class="goal-amount expense">${formatCurrency(currentBalance)}</span> `;
                debtsContentEl.appendChild(item);
            });
    
            // Añadir enlace "Ver todos..." si hay más de 3 deudas activas
            const { count: totalActive } = await supabase.from('debts').select('*', { count: 'exact', head: true }).eq('user_id', currentUserId).neq('status', 'Pagada');
            if (totalActive > activeDebts.length) {
                 const link = document.createElement('a'); link.href = '/Debts.html'; link.textContent = 'Ver todas...'; link.classList.add('panel-link', 'more-link'); debtsContentEl.appendChild(link);
            }
    
        } catch (error) {
            console.error("Error cargando resumen deudas:", error);
            debtsContentEl.innerHTML = `<p class="panel-loading error-text">Error al cargar deudas.</p>`;
        }
    }

    // EN Dashboard.js - Asegúrate que esta función existe o cópiala/adátala de Trips.js
// VERSIÓN MODIFICADA
async function handleTripExpenseFormSubmit(event) {
    console.log("%%%% handleTripExpenseFormSubmit INICIADA %%%%"); // <-- LOG 1
    event.preventDefault(); // <-- LA LÍNEA CLAVE
    console.log("%%%% event.preventDefault() LLAMADO %%%%"); // <-- LOG 2
    if (!currentUserId || !tripExpenseForm || !saveTripExpenseButton || !quickExpenseTripSelect || !expenseTripIdInput || !tripSelectorGroup) return;

    const expenseId = tripExpenseIdInput.value;
    const isEditing = !!expenseId; // No se edita desde Quick Add
    const originalButtonText = saveTripExpenseButton.textContent;

    let tripId = null;

    // Determinar el tripId: si el selector está visible, lo leemos de ahí; si no, del input oculto
    if (tripSelectorGroup.style.display !== 'none') {
        tripId = quickExpenseTripSelect.value;
        if (!tripId) {
             modalTripExpenseError.textContent = 'Debes seleccionar un viaje.';
             modalTripExpenseError.style.display = 'block'; return;
        }
    } else {
        tripId = expenseTripIdInput.value; // Para cuando se llama desde la vista de detalle
         if (!tripId) {
             modalTripExpenseError.textContent = 'Error: No se pudo identificar el viaje asociado.';
             modalTripExpenseError.style.display = 'block'; return;
         }
    }
    console.log(">>> ID del Viaje seleccionado para el gasto:", tripId); // <-- AÑADIR ESTE LOG
    const formData = {
        user_id: currentUserId,
        trip_id: tripId, // <<< USA EL tripId DETERMINADO
        description: tripExpenseDescriptionInput.value.trim(),
        amount: parseFloat(tripExpenseAmountInput.value), // O positivo si así guardas
        expense_date: tripExpenseDateInput.value, // <-- Prueba con ISO String
        category: tripExpenseCategoryInput.value.trim() || null,
        notes: tripExpenseNotesInput.value.trim() || null
    };

    // Validaciones...
    if (!formData.description || isNaN(formData.amount) || formData.amount <= 0 || !formData.expense_date) { modalTripExpenseError.textContent = 'Descripción, Importe (>0) y Fecha son obligatorios.'; modalTripExpenseError.style.display = 'block'; return; }

    modalTripExpenseError.style.display = 'none';
    saveTripExpenseButton.disabled = true;
    saveTripExpenseButton.textContent = isEditing ? 'Guardando...' : 'Creando...';

    try {
        console.log("Insertando gasto de viaje:", JSON.stringify(formData, null, 2)); // Log detallado de datos
        let result;
        // Asegurar que amount sea negativo para guardar como gasto en la tabla de gastos
         // ¡OJO! Si tu tabla trip_expenses guarda gastos como positivos, quita el Math.abs y el -1
         //formData.amount = -Math.abs(formData.amount); // <<< Guardar como negativo

        if (isEditing) {
            // ... Lógica de Update (no relevante para Quick Add ahora) ...
             console.warn("Se intentó editar desde Quick Add (no soportado aún en esta UI)");
             throw new Error("La edición no está soportada desde aquí.");
        } else {
            
            console.log(">>> INTENTANDO AWAIT con datos MÍNIMOS:", formData);
            try {
                 result = await supabase.from('trip_expenses').insert([formData]).select();
                 console.log(">>> AWAIT insert MÍNIMO COMPLETADO. Resultado:", result);
            } catch (insertError) {
                 console.error(">>> ERROR específico durante el insert MÍNIMO:", insertError);
                 throw insertError;
            } // Log DESPUÉS
        }

        const error = result?.error;
        const data = result?.data; // Para insert, data puede ser útil verificar
    
        if (error) {
            console.error("handleTripExpenseFormSubmit: Error detectado en resultado Supabase", error);
            throw error;
        }
         if (!isEditing && (!data || data.length === 0)) { // Si es insert y no devuelve datos
             console.error("handleTripExpenseFormSubmit: Inserción no devolvió datos (posible RLS o error silencioso).");
             throw new Error("La inserción no devolvió confirmación.");
         }
    
        console.log("handleTripExpenseFormSubmit: Operación BD exitosa.");
        alert('Gasto de viaje añadido.'); // Cambiado de 'Operación guardada'
        closeTripExpenseModal();
        loadRecentActivity();
        loadNextTripSummary();


    } catch (error) {
        console.error('Error guardando gasto del viaje (Catch Block):', error);
        modalTripExpenseError.textContent = `Error: ${error.message || 'Error desconocido'}`;
        modalTripExpenseError.style.display = 'block';
    } finally {
        console.log("handleTripExpenseFormSubmit: Bloque FINALLY ejecutado.");
        saveTripExpenseButton.disabled = false;
        saveTripExpenseButton.textContent = originalButtonText;
    }
}
    

    async function loadLoansSummary() {
        console.log("Cargando Resumen Préstamos (Lista Items)...");
        const loansContentEl = document.getElementById('loansSummaryContent');
        if (!currentUserId || !loansContentEl) return;
        loansContentEl.innerHTML = '<p class="panel-loading">Cargando préstamos...</p>';
    
        try {
            const { data: activeLoans, error } = await supabase
                .from('loans')
                .select('id, debtor, current_balance, initial_amount')
                .eq('user_id', currentUserId)
                .neq('status', 'Cobrado') // Préstamos activos
                .order('due_date', { ascending: true, nullsLast: true })
                .limit(3); // Mostrar máximo 3 préstamos
    
            if (error) throw error;
    
            if (!activeLoans || activeLoans.length === 0) {
                loansContentEl.innerHTML = '<p class="panel-loading no-data">No tienes préstamos activos.</p>';
                return;
            }
    
            loansContentEl.innerHTML = ''; // Limpiar "cargando"
    
            activeLoans.forEach(loan => {
                const initialAmount = Number(loan.initial_amount) || 0;
                const currentBalance = Number(loan.current_balance) || 0;
                 // Calcular porcentaje COBRADO para la barra de progreso
                const collectedAmount = initialAmount - currentBalance;
                const safeCollectedAmount = Math.max(0, collectedAmount);
                const percentageCollected = initialAmount > 0 ? Math.min((safeCollectedAmount / initialAmount) * 100, 100) : 0;
    
                let progressBarColor = '#4CAF50'; // Verde (ingreso)
                 // Podrías cambiar color si está casi cobrado, pero verde suele estar bien para progreso de cobro
    
                const item = document.createElement('div');
                 // Usar clase consistente: 'loan-item', 'budget-item', 'goal-item'...
                item.classList.add('loan-item'); // O reutiliza si el CSS es genérico
                item.classList.add('goal-item'); // Usa la misma clase contenedora que Metas
                item.innerHTML = `
                    <span class="goal-icon"><i class="fas fa-hand-holding-usd"></i></span> <div class="goal-info"> <span class="goal-name">${loan.debtor}</span> <div class="progress-bar-container mini">
                            <div class="progress-bar mini" style="width: ${percentageCollected.toFixed(1)}%; background-color: ${progressBarColor};"></div>
                        </div>
                    </div>
                    <span class="goal-amount income">${formatCurrency(currentBalance)}</span> `;
                loansContentEl.appendChild(item);
            });
    
             // Añadir enlace "Ver todos..." si hay más
            const { count: totalActive } = await supabase.from('loans').select('*', { count: 'exact', head: true }).eq('user_id', currentUserId).neq('status', 'Cobrado');
            if (totalActive > activeLoans.length) {
                 const link = document.createElement('a'); link.href = '/Loans.html'; link.textContent = 'Ver todos...'; link.classList.add('panel-link', 'more-link'); loansContentEl.appendChild(link);
            }
    
        } catch (error) {
            console.error("Error cargando resumen préstamos:", error);
            loansContentEl.innerHTML = `<p class="panel-loading error-text">Error al cargar préstamos.</p>`;
        }
    }



    async function loadUpcomingPayments() {
         console.log("Cargando Próximos Pagos...");
         if (!currentUserId || !upcomingPaymentsList) return;
         upcomingPaymentsList.innerHTML = '<p class="panel-loading">Cargando pagos...</p>';
         try {
            const today = new Date().toISOString().split('T')[0];
            const { data, error } = await supabase
                .from('scheduled_fixed_expenses')
                .select('id, description, amount, next_due_date, categories(icon)')
                .eq('user_id', currentUserId)
                .eq('is_active', true)
                .gte('next_due_date', today) // Desde hoy en adelante
                .order('next_due_date', { ascending: true })
                .limit(4); // Limitar a 4 por ejemplo

            if (error) throw error;

            if(data && data.length > 0) {
                upcomingPaymentsList.innerHTML = ''; // Limpiar "cargando"
                data.forEach(p => {
                     const item = document.createElement('div');
                     item.classList.add('payment-item');
                     const icon = getIconClass(p.categories?.icon);
                     item.innerHTML = `
                         <span class="payment-icon"><i class="${icon}"></i></span>
                         <span class="payment-desc">${p.description}</span>
                         <span class="payment-date">${formatDate(p.next_due_date)}</span>
                         <span class="payment-amount">${formatCurrency(p.amount)}</span>
                     `;
                     upcomingPaymentsList.appendChild(item);
                });
            } else {
                 upcomingPaymentsList.innerHTML = '<p class="panel-loading no-data">No hay pagos programados próximamente.</p>';
            }

         } catch (error) {
              console.error("Error cargando próximos pagos:", error);
               upcomingPaymentsList.innerHTML = `<p class="panel-loading error-text">Error al cargar pagos.</p>`;
         }
    }

    async function loadGoalsProgress() {
        console.log("Cargando Progreso Metas para Dashboard...");
        if (!currentUserId || !goalsProgressList) return;
        goalsProgressList.innerHTML = '<p class="panel-loading">Cargando metas...</p>';
        try {
            // Obtener las próximas 2 metas por fecha objetivo (o las primeras si no hay fecha)
            const { data: goals, error } = await supabase
               .from('goals')
               .select('id, name, current_amount, target_amount, icon')
               .eq('user_id', currentUserId)
               // Excluir metas ya alcanzadas (opcional)
               // .lt('current_amount', 'target_amount') // Descomentar si no quieres mostrar completadas
               .order('target_date', { ascending: true, nullsFirst: false }) // Próximas por fecha
               .limit(2); // Mostrar máximo 2

            if (error) throw error;

            if(goals && goals.length > 0) {
                goalsProgressList.innerHTML = ''; // Limpiar "cargando"
                goals.forEach(g => {
                    const targetAmount = Number(g.target_amount) || 0;
                    const currentAmount = Number(g.current_amount) || 0;
                    const percentage = targetAmount > 0 ? Math.max(0, Math.min((currentAmount / targetAmount) * 100, 100)) : (currentAmount > 0 ? 100 : 0); // 100% si no hay objetivo pero sí ahorro
                    const isComplete = currentAmount >= targetAmount;

                    let progressBarColor = '#4CAF50'; // Verde
                    if (isComplete) progressBarColor = '#8a82d5'; // Morado completado
                    else if (percentage >= 75) progressBarColor = '#ff9800'; // Naranja

                    const item = document.createElement('div');
                    item.classList.add('goal-item');
                    item.innerHTML = `
                        <span class="goal-icon"><i class="${getIconClass(g.icon)}"></i></span>
                        <div class="goal-info">
                            <span class="goal-name">${g.name}</span>
                            <div class="progress-bar-container mini">
                                <div class="progress-bar mini" style="width: ${percentage.toFixed(1)}%; background-color: ${progressBarColor};"></div>
                            </div>
                        </div>
                        <span class="goal-amount">${formatCurrency(currentAmount)} / ${formatCurrency(targetAmount)}</span>
                    `;
                    goalsProgressList.appendChild(item);
                });
                // Añadir enlace si hay más metas
                 const { count: totalGoals } = await supabase.from('goals').select('*', { count: 'exact', head: true }).eq('user_id', currentUserId);
                 if (totalGoals > goals.length) {
                     const link = document.createElement('a'); link.href = '/Goals.html'; link.textContent = 'Ver todas...'; link.classList.add('panel-link', 'more-link'); goalsProgressList.appendChild(link);
                 }

            } else {
                goalsProgressList.innerHTML = '<p class="panel-loading no-data">No tienes metas definidas.</p>';
            }

        } catch (error) {
            console.error("Error cargando progreso metas:", error);
            goalsProgressList.innerHTML = `<p class="panel-loading error-text">Error al cargar metas.</p>`;
        }
   }

    async function loadRecentActivity() {
         console.log("Cargando Actividad Reciente...");
         if (!currentUserId || !recentActivityList) return;
         recentActivityList.innerHTML = '<p class="panel-loading">Cargando actividad...</p>';
         try {
             const { data, error } = await supabase
                .from('transactions')
                .select('id, description, type, amount, transaction_date, categories(icon)')
                .eq('user_id', currentUserId)
                .order('transaction_date', { ascending: false })
                .order('created_at', { ascending: false }) // Desempate por creación
                .limit(5); // Limitar a 5

             if (error) throw error;

             if(data && data.length > 0) {
                 recentActivityList.innerHTML = ''; // Limpiar "cargando"
                 data.forEach(tx => {
                      const item = document.createElement('div');
                      item.classList.add('activity-item');
                      const icon = getIconClass(tx.categories?.icon);
                      const amountClass = tx.type === 'ingreso' ? 'income' : 'expense';
                      const amountSign = tx.type === 'ingreso' ? '+' : '-';
                      item.innerHTML = `
                          <span class="activity-icon ${amountClass}"><i class="${icon}"></i></span>
                          <span class="activity-desc">${tx.description}</span>
                          <span class="activity-date">${formatDate(tx.transaction_date)}</span>
                          <span class="activity-amount ${amountClass}">${amountSign}${formatCurrency(Math.abs(tx.amount))}</span>
                      `;
                      recentActivityList.appendChild(item);
                 });
             } else {
                 recentActivityList.innerHTML = '<p class="panel-loading no-data">No hay actividad reciente.</p>';
             }
         } catch (error) {
              console.error("Error cargando actividad reciente:", error);
              recentActivityList.innerHTML = `<p class="panel-loading error-text">Error al cargar actividad.</p>`;
         }
    }

     async function loadNotificationCount() {
         console.log("Cargando contador notificaciones...");
         if (!currentUserId || !notificationBadge) return;
         try {
             const { count, error } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true }) // Solo contar
                .eq('user_id', currentUserId)
                .eq('is_read', false);

             if (error) { console.error("Error contando notificaciones:", error); return; }

             if (count !== null && count > 0) {
                notificationBadge.textContent = count > 9 ? '9+' : count;
                notificationBadge.style.display = 'flex';
             } else {
                notificationBadge.style.display = 'none';
             }
         } catch (error) {
             console.error("Excepción contando notificaciones:", error);
         }
     }


    /** Carga todos los datos del dashboard */
    function loadAllDashboardData() {
        if (!currentUserId) return;
        isLoadingData = true; // Podríamos usar un estado general
        // Llamar a todas las funciones de carga (pueden ser en paralelo)
        Promise.allSettled([
            loadSummaryData(),
            loadBudgetData(),
            loadUpcomingPayments(),
            loadGoalsProgress(),
            loadRecentActivity(),
            loadNotificationCount(),
            loadDebtsSummary(), 
            loadLoansSummary(),
            loadEvaluationSummary(),
            loadAccountsSummary(),
            loadNextTripSummary() 
        ]).then(results => {
            console.log("Carga de datos del dashboard completada (AllSettled).");
            results.forEach((result, index) => {
                if (result.status === 'rejected') {
                     console.error(`Error cargando widget ${index}:`, result.reason);
                }
            });
            isLoadingData = false;
        });
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
        console.log('Dashboard.js: Received authReady event.');
        currentUser = e.detail.user;
        currentUserId = currentUser?.id;
        if (currentUserId) {
             if(userAvatarHeader) userAvatarHeader.src = currentUser.user_metadata?.avatar_url || defaultAvatarPath;
             loadAllDashboardData();
        } else {
            console.warn("Dashboard.js: No user session found.");
             // auth-listener debería redirigir si estamos aquí sin user
        }
        if (currentUserId) {
            loadInitialData(currentUser); // Llamar a cargar datos
        }
    });

    document.addEventListener('DOMContentLoaded', () => {
         console.log("Dashboard.js: DOM fully loaded.");

         // Listener para botones de Sidebar (Navegación)
         navButtons.forEach(button => {
             button.addEventListener('click', (e) => {
                e.preventDefault(); // Prevenir comportamiento por defecto si son <a>
                 if (isLoadingData) return; // No navegar si está cargando datos

                 const page = button.dataset.page;
                 if (page && page !== window.location.pathname) {
                     console.log("Navegando a:", page);
                     window.location.href = page;
                 } else if (page === window.location.pathname) {
                      console.log("Ya estás en", page);
                      // Podríamos añadir lógica para recargar datos aquí si es necesario
                 }
             });
         });
         

         // Listener para botón Logout en Sidebar
         if (btnLogoutSidebar && supabase) {
             btnLogoutSidebar.addEventListener('click', async () => {
                 console.log('Cerrando sesión desde Sidebar...');
                 btnLogoutSidebar.disabled = true; // Deshabilitar mientras cierra
                 const { error } = await supabase.auth.signOut();
                 if (error) {
                     console.error('Error al cerrar sesión:', error);
                     alert('Error al cerrar sesión: ' + error.message);
                     btnLogoutSidebar.disabled = false;
                 }
                 // No necesitamos redirigir, auth-listener lo hará
             });
         }

         console.log("Initializing sidebar...");
         setActiveSidebarLink();             // <--- LLAMADA 1
         addSidebarNavigationListeners();    // <--- LLAMADA 2

         // Listener para botón de perfil en Header
         if (profileBtnHeader) {
             profileBtnHeader.addEventListener('click', () => {
                window.location.href = '/Profile.html';
             });
         }

          // Listener para campana de notificaciones (Placeholder)
          if (notificationBell) {
            notificationBell.addEventListener('click', (e) => {
                e.stopPropagation(); // Evita que el clic cierre inmediatamente si hay listener en body/window
                toggleNotificationPanel(); // Abre o cierra
            });
            console.log("DEBUG: Listener añadido a #notificationBell.");
        } else { console.error("ERROR: Botón #notificationBell no encontrado!"); }

        // Listener para botón "Marcar todas leídas" (NUEVO)
        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                markNotificationsRead(null); // null = marcar todas las no leídas
            });
            console.log("DEBUG: Listener añadido a #markAllReadBtn.");
        } else { console.warn("WARN: Botón #markAllReadBtn no encontrado!"); }

        // Opcional: Listener para cerrar el panel si se hace clic fuera
         document.addEventListener('click', (event) => {
            if (isNotificationPanelOpen && !notificationPanel?.contains(event.target) && event.target !== notificationBell && !notificationBell?.contains(event.target)) {
                 toggleNotificationPanel(false);
            }
         });

          // Listeners para Acciones Rápidas (Placeholder)
          if (quickAddExpenseBtn) {
            quickAddExpenseBtn.addEventListener('click', () => {
                console.log("--- DEBUG: Quick Add Gasto Clicked ---");
                if (initialDataLoaded) { // <-- COMPROBAR FLAG
                    console.log("Datos iniciales listos. Abriendo modal...");
                    console.log("Accounts:", accounts); // Verificar que ahora sí tienen datos
                    console.log("Categories:", categories);
                    openTransactionModal('gasto'); // Llamar si los datos están listos
                } else {
                    console.warn("WARN: Quick Add Gasto - Datos iniciales (cuentas/categorías) aún no cargados. Intenta de nuevo.");
                    // Opcional: Mostrar mensaje NO bloqueante
                    alert("Los datos aún se están cargando, por favor espera un segundo e inténtalo de nuevo."); // Volvemos al alert temporalmente para que veas si salta aquí
                }
            });
             console.log("DEBUG: Listener MODIFICADO añadido a #quickAddExpenseBtn.");
        } else { console.error("ERROR: Botón #quickAddExpenseBtn no encontrado!"); }

        if (quickAddIncomeBtn) {
            quickAddIncomeBtn.addEventListener('click', () => {
                console.log("--- DEBUG: Quick Add Ingreso Clicked ---");
                 if (initialDataLoaded) { // <-- COMPROBAR FLAG
                    console.log("Datos iniciales listos. Abriendo modal...");
                    console.log("Accounts:", accounts);
                    console.log("Categories:", categories);
                    openTransactionModal('ingreso');
                 } else {
                     console.warn("WARN: Quick Add Ingreso - Datos iniciales (cuentas/categorías) aún no cargados. Intenta de nuevo.");
                      alert("Los datos aún se están cargando, por favor espera un segundo e inténtalo de nuevo."); // Alert temporal
                 }
            });
             console.log("DEBUG: Listener MODIFICADO añadido a #quickAddIncomeBtn.");
        } else { console.error("ERROR: Botón #quickAddIncomeBtn no encontrado!"); }

        // Listener para el nuevo botón Quick Add Trip Expense
        if (quickAddTripExpenseBtn) {
            quickAddTripExpenseBtn.addEventListener('click', async () => {
                console.log("DEBUG: Clic en Quick Add Gasto Viaje");
                if (!currentUserId) { alert("Necesitas iniciar sesión."); return; }

                // Necesitamos cargar la lista de viajes activos/futuros para el selector
                try {
                    quickAddTripExpenseBtn.disabled = true; // Deshabilitar mientras carga viajes
                    const today = new Date().toISOString().split('T')[0];
                    const { data: trips, error } = await supabase
                        .from('trips')
                        .select('id, name') // Solo necesitamos id y nombre para el select
                        .eq('user_id', currentUserId)
                        // Ajusta este filtro si quieres incluir viajes pasados recientes también
                        .gte('start_date', today) // Viajes futuros/actuales
                        .order('start_date', { ascending: false }); // Más recientes primero

                    if (error) throw error;

                    if (!trips || trips.length === 0) {
                        alert("No tienes viajes registrados para añadirles un gasto.");
                        return;
                    }

                    // Llamar a la función que prepara y abre el modal
                    openTripExpenseModalForQuickAdd(trips);

                } catch (error) {
                    alert("Error al cargar la lista de viajes.");
                    console.error("Error fetching trips for quick expense modal:", error);
                } finally {
                    if(quickAddTripExpenseBtn) quickAddTripExpenseBtn.disabled = false; // Rehabilitar
                }
            });
            console.log("DEBUG: Listener añadido a #quickAddTripExpenseBtn.");
        }

        if (tripExpenseForm) {
            console.log("DEBUG: Añadiendo listener de submit a #tripExpenseForm");
            tripExpenseForm.addEventListener('submit', handleTripExpenseFormSubmit);
        } else {
            console.error("ERROR: Formulario #tripExpenseForm no encontrado!");
        }

        if (cancelTripExpenseButton) {
            cancelTripExpenseButton.addEventListener('click', () => {
                console.log("!!!! Botón Cancelar Gasto Viaje CLICADO !!!!"); // <-- AÑADE ESTE LOG
                closeTripExpenseModal(); // Llama a la función de cierre
            });
             console.log("DEBUG: Listener añadido a #cancelTripExpenseButton."); // Verifica este log también
        } else { console.error("ERROR: Botón #cancelTripExpenseButton no encontrado!");}
        
        // Listener para clic fuera del modal de GASTO DE VIAJE
        if (tripExpenseModal) {
            tripExpenseModal.addEventListener('click', (event) => {
                console.log("!!!! Clic detectado en área modal Gasto Viaje !!!!"); // <-- AÑADE ESTE LOG
                if (event.target === tripExpenseModal) {
                    console.log("Clic fue en el overlay -> Cerrando modal Gasto Viaje"); // <-- AÑADE ESTE LOG
                    closeTripExpenseModal(); // Llama a la función de cierre
                } else {
                    console.log("Clic fue dentro del contenido, no se cierra."); // <-- AÑADE ESTE LOG
                }
            });
             console.log("DEBUG: Listener de clic fuera añadido a #tripExpenseModal."); // Verifica este log también
        } else { console.error("ERROR: Modal #tripExpenseModal no encontrado!");}

         // ---- Listeners para el Modal de Transacción (NUEVO) ----
        if (cancelTransactionButton) cancelTransactionButton.addEventListener('click', closeTransactionModal);
        if (transactionModal) transactionModal.addEventListener('click', (event) => { if (event.target === transactionModal) closeTransactionModal(); });
        if (transactionForm) transactionForm.addEventListener('submit', handleTransactionFormSubmit);
        // Listener para cambio de Tipo (Ingreso/Gasto) en Modal
        if (typeToggleExpense && typeToggleIncome && typeToggleTransfer) { // Comprobar los 3
            const typeRadios = [typeToggleExpense, typeToggleIncome, typeToggleTransfer]; // Incluir los 3
            typeRadios.forEach(radio => {
                radio.addEventListener('change', () => {
                     if(radio.checked){ // Asegurarse que el evento es del que se selecciona
                         console.log(`Tipo cambiado a: ${radio.value}`);
                         // Actualizar estilo visual
                         document.querySelectorAll('#transactionModal .type-toggle label').forEach(label => label.classList.remove('active'));
                         radio.parentElement.classList.add('active');
        
                         // Actualizar UI (mostrar/ocultar campos, cambiar label)
                         updateModalUI(radio.value);
                     }
                });
            });
            // Quitar la lógica de estado inicial de aquí, se maneja en openTransactionModal
        } else { console.error("Error: Elementos para el toggle de tipo de transacción no encontrados.");}

         // Scroll top
         if (scrollTopBtn) { window.addEventListener('scroll', () => { scrollTopBtn.classList.toggle('visible', window.scrollY > 300); }); scrollTopBtn.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); }); }

    }); // Fin DOMContentLoaded

} // Fin check Supabase