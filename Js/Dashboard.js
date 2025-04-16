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
    // Widgets (Contenedores y elementos específicos para actualizar)
    const greetingEl = document.getElementById('greeting');
    const totalBalanceEl = document.getElementById('totalBalance');
    const budgetSummaryList = document.getElementById('budgetSummaryList');
    const upcomingPaymentsList = document.getElementById('upcomingPaymentsList');
    const goalsProgressList = document.getElementById('goalsProgressList');
    const recentActivityList = document.getElementById('recentActivityList');
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

     function populateSelect(selectElement, items, valueField = 'id', textField = 'name', defaultOptionText = 'Selecciona...', includeAllOption = false, allOptionText = 'Todos/as') {
        if (!selectElement) return; selectElement.innerHTML = '';
        if (includeAllOption) { const allOpt = document.createElement('option'); allOpt.value = 'all'; allOpt.textContent = allOptionText; selectElement.appendChild(allOpt); }
        if (defaultOptionText) { const defaultOpt = document.createElement('option'); defaultOpt.value = ''; defaultOpt.textContent = defaultOptionText; defaultOpt.disabled = true; if (!includeAllOption) defaultOpt.selected = true; selectElement.appendChild(defaultOpt); }
        items.forEach(item => { const option = document.createElement('option'); option.value = item[valueField]; option.textContent = item[textField]; selectElement.appendChild(option); });
    }
    // Necesitamos esta función específica del modal de transacciones
    function populateCategoryFilter(transactionType = 'gasto') {
        if (!transactionCategoryInput || !categories) return;
        // Filtrar categorías (INGRESOS o GASTOS)
        const filteredForType = categories.filter(cat => cat.type === transactionType);
        // Rellenar select
        populateSelect(transactionCategoryInput, filteredForType, 'id', 'name', '(Sin categoría)', false, '', ''); // Permitir selección vacía
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
        // (Misma lógica que en Transactions.js para resetear/precargar el form)
        if (!transactionForm || !modalTitleTransaction || !transactionIdInput || !typeToggleExpense || !typeToggleIncome || !transactionAmountInput || !transactionDateInput || !transactionDescriptionInput || !transactionAccountInput || !transactionCategoryInput || !transactionNotesInput || !saveTransactionButton) { console.error("Error: Elementos del modal de transacción no encontrados."); return; }
        transactionForm.reset(); transactionIdInput.value = ''; modalTransactionError.style.display = 'none'; saveTransactionButton.disabled = false; saveTransactionButton.textContent = 'Guardar Transacción';
        populateSelect(transactionAccountInput, accounts, 'id', 'name', 'Selecciona cuenta...'); // Rellenar cuentas
    
        if (transaction) { // Modo Edición (no usado desde Quick Actions, pero mantenemos por si acaso)
            modalTitleTransaction.textContent = 'Editar Transacción'; /* ... (precargar datos) ... */
        } else { // Modo Añadir
            modalTitleTransaction.textContent = 'Añadir Transacción';
            transactionDateInput.valueAsDate = new Date(); // Fecha de hoy
    
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
            // *** FIN NUEVO ***
        }
        toggleTransactionModal(true);
         setTimeout(() => transactionDescriptionInput.focus(), 350); // Enfocar descripción
    }

    async function handleTransactionFormSubmit(event) {
        event.preventDefault();
        if (!supabase || !currentUserId || !transactionForm || !saveTransactionButton) return;
    
        const transactionId = transactionIdInput.value;
        const isEditing = !!transactionId; // No debería ser true desde Quick Actions
        const originalSaveText = saveTransactionButton.textContent;
    
        // Obtener datos del formulario
        const typeInput = document.querySelector('#transactionModal input[name="transactionType"]:checked');
        const type = typeInput ? typeInput.value : 'gasto'; // Default a gasto si algo falla
        const amount = parseFloat(transactionAmountInput.value);
        const signedAmount = type === 'gasto' ? -Math.abs(amount) : Math.abs(amount);
        const transaction_date = transactionDateInput.value;
        const description = transactionDescriptionInput.value.trim();
        const account_id = transactionAccountInput.value || null;
        const category_id = transactionCategoryInput.value || null;
        const notes = transactionNotesInput.value.trim() || null;
    
        // Validaciones
        if (isNaN(signedAmount)) { modalTransactionError.textContent = 'Importe inválido.'; modalTransactionError.style.display = 'block'; return; }
        if (!transaction_date) { modalTransactionError.textContent = 'Fecha obligatoria.'; modalTransactionError.style.display = 'block'; return; }
        if (!description) { modalTransactionError.textContent = 'Descripción obligatoria.'; modalTransactionError.style.display = 'block'; return; }
        if (!account_id) { modalTransactionError.textContent = 'Cuenta obligatoria.'; modalTransactionError.style.display = 'block'; return; }
    
        modalTransactionError.style.display = 'none';
        saveTransactionButton.disabled = true; saveTransactionButton.textContent = 'Guardando...';
    
        try {
            const transactionData = { user_id: currentUserId, account_id, category_id, type, description, amount: signedAmount, transaction_date, notes };
            let error;
    
            if (isEditing) { // No debería ocurrir desde Quick Add
                console.warn("Intentando editar desde Quick Add?");
                 const { error: updateError } = await supabase.from('transactions').update(transactionData).eq('id', transactionId).eq('user_id', currentUserId);
                 error = updateError;
            } else {
                // INSERT
                const { error: insertError } = await supabase.from('transactions').insert([transactionData]);
                error = insertError;
            }
            if (error) throw error;
    
            console.log('Transacción rápida guardada');
            closeTransactionModal();
            // Opcional: ¿Recargar widget de actividad reciente?
             loadRecentActivity(); // Si quieres verla reflejada inmediatamente
            // Opcional: ¿Mostrar mensaje de éxito breve?
            // showMessage('success', '¡Transacción añadida!');
    
        } catch (error) {
             console.error('Error guardando transacción rápida:', error);
             modalTransactionError.textContent = `Error: ${error.message}`;
             modalTransactionError.style.display = 'block';
        } finally {
             saveTransactionButton.disabled = false; saveTransactionButton.textContent = 'Guardar Transacción';
        }
    }

    // Modificar la función que carga todo o añadir una nueva llamada
    async function loadInitialData(user) {
        // ... (código existente para cargar avatar, etc.) ...
        if (!user) { /* ... */ return; }
        currentUserId = user.id;
        console.log("Dashboard.js: Loading initial data for user:", currentUserId);
        if(userAvatarHeader) userAvatarHeader.src = defaultAvatarPath; // Default mientras carga

        try {
            const [profileRes, accountsRes, categoriesRes] = await Promise.all([
                supabase.from('profiles').select('avatar_url, full_name').eq('id', currentUserId).single(),
                supabase.from('accounts').select('id, name').eq('user_id', currentUserId).order('name'),
                // Necesitamos TODAS las categorías (Gasto e Ingreso) para el modal
                supabase.from('categories').select('id, name, type').or(`user_id.eq.${currentUserId},is_default.eq.true`).order('name')
            ]);

            // Avatar y Saludo
            if (userAvatarHeader) userAvatarHeader.src = profileRes.data?.avatar_url || defaultAvatarPath;
            if (greetingEl) greetingEl.textContent = `¡Hola${profileRes.data?.full_name ? ', ' + profileRes.data.full_name.split(' ')[0] : ''}!`;

            // Cuentas (para modal)
            if (accountsRes.error) throw accountsRes.error;
            accounts = accountsRes.data || [];

            // Categorías (para modal)
            if (categoriesRes.error) throw categoriesRes.error;
            categories = categoriesRes.data || [];

            // Cargar los widgets del dashboard
            loadAllDashboardData(); // Esta función llama a las demás load...()

        } catch (error) {
            console.error("Error cargando datos iniciales (Dashboard):", error);
            // Mostrar un error general si falla la carga inicial
            // document.getElementById('dashboardGrid').innerHTML = `<p class="error-text">Error cargando datos del dashboard.</p>`;
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
        if (!currentUserId || !supabase) return;
        console.log("Marcando notificaciones como leídas:", notificationIds || 'Todas las no leídas');

        try {
            let query = supabase.from('notifications')
                .update({ is_read: true, updated_at: new Date() })
                .eq('user_id', currentUserId);

            if (Array.isArray(notificationIds) && notificationIds.length > 0) {
                query = query.in('id', notificationIds); // Marcar IDs específicos
            } else if (notificationIds === null) {
                query = query.eq('is_read', false); // Marcar todas las no leídas
            } else {
                return; // No hacer nada si el input no es válido
            }

            const { error } = await query;
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
            }

        } catch (error) {
            console.error("Error marcando notificaciones como leídas:", error);
            // Podríamos mostrar un error al usuario
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
        if (!currentUserId || !greetingEl || !totalBalanceEl) return;
        greetingEl.textContent = `¡Hola${currentUser?.user_metadata?.full_name ? ', ' + currentUser.user_metadata.full_name.split(' ')[0] : ''}!`; // Saludo con nombre
        totalBalanceEl.textContent = 'Calculando...';
        try {
            // Sumar saldos de cuentas (excluyendo crédito)
            const { data: accounts, error } = await supabase
                .from('accounts')
                .select('balance, type')
                .eq('user_id', currentUserId);
            if (error) throw error;
            let total = 0;
            accounts.forEach(acc => { if (acc.type !== 'tarjeta_credito') total += Number(acc.balance) || 0; });
            totalBalanceEl.textContent = formatCurrency(total);
        } catch (error) {
             console.error("Error cargando saldo total:", error);
             totalBalanceEl.textContent = "Error";
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
                .is('category_id', 'not.null')
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
            budgets.slice(0, 3).forEach(b => { // Mostrar máximo 3
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
                 link.textContent = 'Ver todos...';
                 link.classList.add('panel-link', 'more-link');
                 budgetSummaryList.appendChild(link);
             }


        } catch (error) {
             console.error("Error cargando resumen presupuestos:", error);
             budgetSummaryList.innerHTML = `<p class="panel-loading error-text">Error al cargar presupuestos.</p>`;
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
            loadNotificationCount()
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
                console.log("DEBUG: Clic en Quick Add Gasto");
                // Asegurarse que tenemos datos de cuentas/categorías cargados
                if (accounts.length === 0 || categories.length === 0) {
                    alert("Espera a que carguen las cuentas y categorías...");
                    loadInitialData(currentUser); // Intentar recargar si no estaban
                    return;
                }
                openTransactionModal('gasto'); // Abrir modal preseleccionando 'gasto'
            });
             console.log("DEBUG: Listener añadido a #quickAddExpenseBtn.");
         } else { console.error("ERROR: Botón #quickAddExpenseBtn no encontrado!"); }

         if (quickAddIncomeBtn) {
            quickAddIncomeBtn.addEventListener('click', () => {
                console.log("DEBUG: Clic en Quick Add Ingreso");
                if (accounts.length === 0 || categories.length === 0) {
                     alert("Espera a que carguen las cuentas y categorías...");
                     loadInitialData(currentUser);
                     return;
                }
                openTransactionModal('ingreso'); // Abrir modal preseleccionando 'ingreso'
            });
             console.log("DEBUG: Listener añadido a #quickAddIncomeBtn.");
         } else { console.error("ERROR: Botón #quickAddIncomeBtn no encontrado!"); }

         // ---- Listeners para el Modal de Transacción (NUEVO) ----
        if (cancelTransactionButton) cancelTransactionButton.addEventListener('click', closeTransactionModal);
        if (transactionModal) transactionModal.addEventListener('click', (event) => { if (event.target === transactionModal) closeTransactionModal(); });
        if (transactionForm) transactionForm.addEventListener('submit', handleTransactionFormSubmit);
        // Listener para cambio de Tipo (Ingreso/Gasto) en Modal
        if (typeToggleExpense && typeToggleIncome && transactionCategoryInput) {
            const typeRadios = [typeToggleExpense, typeToggleIncome];
            typeRadios.forEach(radio => {
                radio.addEventListener('change', () => {
                    // Actualizar estilo visual (quitar active de todos, añadir al seleccionado)
                    document.querySelectorAll('#transactionModal .type-toggle label').forEach(label => label.classList.remove('active'));
                    radio.parentElement.classList.add('active');
                    // Repoblar categorías según el tipo seleccionado
                    populateCategoryFilter(radio.value);
                });
            });
            // Asegurar estilo inicial correcto al cargar el script (por si acaso)
            const initialType = document.querySelector('#transactionModal input[name="transactionType"]:checked')?.value || 'gasto';
            document.querySelectorAll('#transactionModal .type-toggle label').forEach(label => label.classList.remove('active'));
            document.querySelector(`#transactionModal input[value="${initialType}"]`).parentElement.classList.add('active');

        } else { console.error("Error: Elementos para el toggle de tipo de transacción no encontrados.");}

         // Scroll top
         if (scrollTopBtn) { window.addEventListener('scroll', () => { scrollTopBtn.classList.toggle('visible', window.scrollY > 300); }); scrollTopBtn.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); }); }

    }); // Fin DOMContentLoaded

} // Fin check Supabase