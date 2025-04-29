// Reports.js
// ASEGÚRATE que supabase-init.js y auth-listener.js se cargaron antes

console.log('DEBUG: Reports.js - Cargado');

if (typeof supabase === 'undefined' || supabase === null) {
    console.error('Reports.js: ¡Error Crítico! Cliente Supabase no inicializado.');
    alert("Error crítico al cargar la página de informes.");
} else {
    console.log('Reports.js: Cliente Supabase encontrado.');

    // --- Selección de Elementos DOM ---
    const backButton = document.getElementById('backButton');
    const userAvatarSmall = document.getElementById('userAvatarSmall');
    // Report Type Selection
    const reportTypeSelector = document.querySelector('.report-type-selector');
    const transactionTypeBtn = document.querySelector('button[data-report-type="transactions"]');
    const tripExpenseTypeBtn = document.querySelector('button[data-report-type="trip_expenses"]');
    // Filters Containers
    const transactionFilters = document.getElementById('transactionFilters');
    const tripFilters = document.getElementById('tripFilters');
    // Transaction Filters
    const dateFromInput = document.getElementById('dateFrom');
    const dateToInput = document.getElementById('dateTo');
    const filterTypeSelector = document.getElementById('filterTypeSelector');
    const accountFilterTrigger = document.getElementById('accountFilterTrigger');
    const selectedAccountFilterEl = document.getElementById('selectedAccountFilter');
    const categoryFilterTrigger = document.getElementById('categoryFilterTrigger');
    const selectedCategoryFilterEl = document.getElementById('selectedCategoryFilter');
    // Trip Filters
    const tripFilterSelect = document.getElementById('tripFilterSelect');
    const tripDateFromInput = document.getElementById('tripDateFrom');
    const tripDateToInput = document.getElementById('tripDateTo');
    // Format Selection
    const formatSelector = document.getElementById('formatSelector');
    const formatCsvBtn = document.querySelector('button[data-format="csv"]');
    const formatPdfBtn = document.querySelector('button[data-format="pdf"]');
    // Action
    const generateReportBtn = document.getElementById('generateReportBtn');
    const reportMessage = document.getElementById('reportMessage');
    // Modals (si se usa el genérico de settings)
    const selectionModal = document.getElementById('selectionModal');
    const selectionModalTitle = document.getElementById('selectionModalTitle');
    const selectionForm = document.getElementById('selectionForm');
    const selectionSettingKeyInput = document.getElementById('selectionSettingKey'); // Reutilizado para guardar tipo de filtro
    const selectionOptionsContainer = document.getElementById('selectionOptionsContainer');
    const cancelSelectionButton = document.getElementById('cancelSelectionButton');
    const saveSelectionButton = document.getElementById('saveSelectionButton');
    const modalSelectionError = document.getElementById('modalSelectionError');
    const infoModal = document.getElementById('infoModal');
    const infoModalTitle = document.getElementById('infoModalTitle');
    const infoModalMessage = document.getElementById('infoModalMessage');
    const infoModalCloseBtn = document.getElementById('infoModalCloseBtn');
    // Otros
    const scrollTopBtn = document.getElementById('scrollTopBtn');

    // --- Variables de Estado ---
    let currentUserId = null;
    let currentUser = null;
    let isLoading = false;
    let selectedReportType = 'transactions'; // Default
    let selectedFormat = 'csv'; // Default
    // Filtros específicos
    let accounts = [];
    let categories = [];
    let trips = [];
    let filters = {
        dateFrom: '', dateTo: '',
        type: 'all', // 'all', 'ingreso', 'gasto'
        accountId: 'all', // 'all' or specific ID
        categoryId: 'all', // 'all', 'none', or specific ID
        tripId: '' // specific ID
    };

    // --- Constantes ---
    const defaultAvatarPath = 'https://finai.es/images/avatar_predeterminado.png';

    // --- Funciones ---

    function toggleInfoModal(show) {
        if (!infoModal) return;
        if (show) { infoModal.style.display = 'flex'; setTimeout(() => infoModal.classList.add('active'), 10); }
        else { infoModal.classList.remove('active'); setTimeout(() => { infoModal.style.display = 'none'; }, 300); }
    }

    function openInfoModal(title, message) {
        if (!infoModalTitle || !infoModalMessage) { console.error("Elementos modal info no encontrados"); return; }
        infoModalTitle.innerHTML = `<i class="fas fa-info-circle"></i> ${title}`; // Poner título con icono
        infoModalMessage.textContent = message;
        toggleInfoModal(true);
         // Opcional: Enfocar botón al abrir
         setTimeout(() => infoModalCloseBtn?.focus(), 350);
    }

    function closeInfoModal() { toggleInfoModal(false); }

    function toggleSelectionModal(show) {
        console.log(`DEBUG: toggleSelectionModal llamada con show = ${show}`); // Log entrada
        const modalElement = document.getElementById('selectionModal'); // Intentar encontrar el modal
        console.log("DEBUG: Resultado getElementById('selectionModal') dentro de toggle:", modalElement); // <-- ¡VERIFICA ESTE LOG!
    
        if (!modalElement) {
             console.error("ERROR FATAL: toggleSelectionModal NO puede encontrar #selectionModal en el DOM!");
             alert("Error interno: No se encuentra el contenedor del modal de selección. ¿Está el HTML en Reports.html?");
             return;
         }
    
        // Lógica original para mostrar/ocultar (sin el setTimeout al mostrar)
        if (show) {
            modalElement.style.display = 'flex';
            requestAnimationFrame(() => { // Usar requestAnimationFrame puede ayudar
                modalElement.classList.add('active');
                console.log(`DEBUG: Modal display=flex, class 'active' added.`);
            });
        } else {
            modalElement.classList.remove('active');
            modalElement.addEventListener('transitionend', () => {
                if (!modalElement.classList.contains('active')) {
                     modalElement.style.display = 'none';
                     console.log(`DEBUG: Modal display=none after transition.`);
                }
            }, { once: true });
            if (selectionForm) selectionForm.reset();
            if(selectionOptionsContainer) selectionOptionsContainer.innerHTML = '';
            if (modalSelectionError) { modalSelectionError.textContent = ''; modalSelectionError.style.display = 'none'; }
            console.log(`DEBUG: Modal class 'active' removed, hiding triggered.`);
        }
    }

    function openSelectionModal(filterKey, title, options, currentValue) {
        // filterKey será 'accountId' o 'categoryId'
        if (!selectionModal || !selectionModalTitle || !selectionSettingKeyInput || !selectionOptionsContainer || !saveSelectionButton) { console.error("Elementos del modal de selección no encontrados."); return; }

        modalSelectionError.style.display = 'none';
        selectionModalTitle.textContent = title;
        selectionSettingKeyInput.value = filterKey; // Guardar qué filtro estamos cambiando
        selectionOptionsContainer.innerHTML = ''; // Limpiar

        // Crear radio buttons
        options.forEach(option => {
            const label = document.createElement('label');
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'selectedValue';
            radio.value = option.value;
            radio.id = `option-${filterKey}-${option.value}`;
            // Marcar el actual (puede ser 'all', 'none', o un ID)
            if (option.value === currentValue) {
                radio.checked = true;
            }
            label.appendChild(radio);
            label.appendChild(document.createTextNode(` ${option.text}`));
            label.htmlFor = radio.id;
            selectionOptionsContainer.appendChild(label);
        });

        saveSelectionButton.disabled = false;
        saveSelectionButton.textContent = 'Aplicar Filtro'; // Cambiar texto botón
        toggleSelectionModal(true);
    }

    function closeSelectionModal() { toggleSelectionModal(false); }

    async function handleSelectionFormSubmit(event) {
        event.preventDefault();
        if (!selectionForm || isLoading) return;

        const filterKey = selectionSettingKeyInput.value; // 'accountId' o 'categoryId'
        const selectedRadio = selectionForm.querySelector('input[name="selectedValue"]:checked');

        if (!filterKey || !selectedRadio) {
            modalSelectionError.textContent = 'Por favor, selecciona una opción.';
            modalSelectionError.style.display = 'block';
            return;
        }

        const selectedValue = selectedRadio.value;
        modalSelectionError.style.display = 'none';

        console.log(`Filtro ${filterKey} actualizado a: ${selectedValue}`);
        filters[filterKey] = selectedValue; // Actualizar el estado del filtro

        // Actualizar el texto en la página principal
        updateFilterDisplay();

        closeSelectionModal();
        // No necesitamos guardar en DB aquí, solo se usa para generar el reporte
    }

    function updateFilterDisplay() {
        if(selectedAccountFilterEl) {
            let accountText = 'Todas las cuentas';
            if (filters.accountId !== 'all') {
                 const selectedAcc = accounts.find(a => a.id === filters.accountId);
                 accountText = selectedAcc ? selectedAcc.name : 'Error - Selección inválida';
            }
            selectedAccountFilterEl.innerHTML = `${accountText} <i class="fas fa-chevron-right"></i>`;
        }
         if(selectedCategoryFilterEl) {
            let categoryText = 'Todas las categorías';
             if (filters.categoryId === 'none') {
                categoryText = '(Sin Categoría)';
            } else if (filters.categoryId !== 'all') {
                 const selectedCat = categories.find(c => c.id === filters.categoryId);
                 categoryText = selectedCat ? selectedCat.name : 'Error - Selección inválida';
            }
            selectedCategoryFilterEl.innerHTML = `${categoryText} <i class="fas fa-chevron-right"></i>`;
        }
    }

    function populateSelect(selectElement, items, valueField = 'id', textField = 'name', defaultOptionText = 'Selecciona...', includeAllOption = false, allOptionText = 'Todos/as', firstOptionValue = '') {
        if (!selectElement) { console.error("populateSelect: Elemento select no encontrado:", selectElement); return; }
        selectElement.innerHTML = ''; // Limpiar siempre
        let hasDefaultSelected = false;

        if (includeAllOption) { const allOpt = document.createElement('option'); allOpt.value = 'all'; allOpt.textContent = allOptionText; selectElement.appendChild(allOpt); }
        if (defaultOptionText !== null) { // Solo añadir si no es null
            const defaultOpt = document.createElement('option');
            defaultOpt.value = firstOptionValue; // Usar el valor proporcionado o ''
            defaultOpt.textContent = defaultOptionText;
            // Deshabilitar si el valor es vacío (ej: "Selecciona...")
            defaultOpt.disabled = (firstOptionValue === '');
            // Seleccionar si el valor es vacío (y no hay 'all')
            defaultOpt.selected = (firstOptionValue === '' && !includeAllOption);
            if(defaultOpt.selected) hasDefaultSelected = true;
            selectElement.appendChild(defaultOpt);
        }

        items.forEach(item => { const option = document.createElement('option'); option.value = item[valueField]; option.textContent = item[textField]; selectElement.appendChild(option); });

        // Si ninguna opción por defecto fue seleccionada y hay una opción vacía, seleccionarla
        if (!hasDefaultSelected && firstOptionValue === '' && selectElement.options.length > (includeAllOption ? 1 : 0)) {
             selectElement.value = '';
        }
    }

    /** Muestra/Oculta un estado de carga visual */
    function setLoadingState(loading) {
        isLoading = loading;
        // Deshabilitar controles principales durante carga/generación
        const controls = [generateReportBtn, reportTypeSelector, formatSelector, dateFromInput, dateToInput, filterTypeSelector, accountFilterTrigger, categoryFilterTrigger, tripFilterSelect, tripDateFromInput, tripDateToInput];
        controls.forEach(el => { if (el) el.disabled = loading; }); // Añadir check por si no existen aún
        if(generateReportBtn) generateReportBtn.innerHTML = loading ? '<i class="fas fa-spinner fa-spin"></i> Generando...' : '<i class="fas fa-cogs"></i> Generar Informe';
        console.log(`Loading state: ${loading ? 'ON' : 'OFF'}`);
    }


    /** Muestra/Oculta los filtros correctos según tipo de reporte */
    function toggleFilterSections() {
        if (!transactionFilters || !tripFilters) { console.warn("Contenedores de filtros no encontrados"); return; }

        // Ocultar ambos primero
        transactionFilters.classList.remove('active');
        tripFilters.classList.remove('active');

        // Mostrar el correcto
        if (selectedReportType === 'transactions') {
            transactionFilters.classList.add('active');
            console.log("Mostrando filtros de Transacciones");
        } else if (selectedReportType === 'trip_expenses') {
            tripFilters.classList.add('active');
            console.log("Mostrando filtros de Gastos de Viaje");
        }
    }

     /** Muestra mensaje de feedback */
     function showMessage(type, text) {
        if (reportMessage) { reportMessage.textContent = text; reportMessage.className = `message ${type}`; reportMessage.style.display = 'block'; }
     }
     function hideMessage() { if (reportMessage) reportMessage.style.display = 'none'; }


    /** Carga datos necesarios para los filtros (cuentas, categorías, viajes) */
    async function loadFilterData() {
        if (!currentUserId) { console.error("loadFilterData: No user ID"); return; }
        console.log("Cargando datos para filtros...");
        setLoadingState(true); // Indicar carga
        try {
            // Peticiones en paralelo
            const [accountsRes, categoriesRes, tripsRes] = await Promise.all([
                supabase.from('accounts').select('id, name').eq('user_id', currentUserId).order('name'),
                supabase.from('categories').select('id, name').or(`user_id.eq.${currentUserId},is_default.eq.true`).order('name'), // Todas las categorías
                supabase.from('trips').select('id, name').eq('user_id', currentUserId).order('start_date', { ascending: false })
            ]);

            if (accountsRes.error) throw accountsRes.error;
            accounts = accountsRes.data || [];
            console.log("Cuentas cargadas:", accounts.length);
            // TODO: Poblar selector de cuentas (se hará al abrir modal)

            if (categoriesRes.error) throw categoriesRes.error;
            categories = categoriesRes.data || [];
            console.log("Categorías cargadas:", categories.length);
            // TODO: Poblar selector de categorías (se hará al abrir modal)

            if (tripsRes.error) throw tripsRes.error;
            trips = tripsRes.data || [];
            console.log("Viajes cargados:", trips.length);
            // Poblar select de viajes AHORA
            populateSelect(tripFilterSelect, trips, 'id', 'name', 'Selecciona un viaje...'); // OK

        } catch (error) {
            console.error("Error cargando datos para filtros:", error);
            showMessage('error', `Error cargando opciones de filtro: ${error.message}`);
        } finally {
            setLoadingState(false); // Finalizar carga
        }
    }

    /** Maneja la generación del informe */
    async function handleGenerateReport() {
        if (isLoading || !supabase || !currentUserId) return;
        hideMessage();
        setLoadingState(true); // Activar loading state
    
        try {
            console.log("--- Usando fetch básico para llamar a la función ---");
    
            // 1. Recopilar filtros (como antes)
            const currentFilters = {
                dateFrom: dateFromInput?.value || null,
                dateTo: dateToInput?.value || null,
                type: filterTypeSelector?.querySelector('.type-option.active')?.dataset.type || 'all',
                accountId: filters.accountId,
                categoryId: filters.categoryId,
                tripId: selectedReportType === 'trip_expenses' ? tripFilterSelect?.value || null : null
            };
    
            // 2. Validaciones Frontend (como antes)
            if (selectedReportType === 'trip_expenses' && !currentFilters.tripId) {
                 throw new Error('Debes seleccionar un viaje para exportar sus gastos.');
            }
            if (currentFilters.dateFrom && currentFilters.dateTo && new Date(currentFilters.dateTo) < new Date(currentFilters.dateFrom)) {
                 throw new Error('La fecha "Hasta" no puede ser anterior a la fecha "Desde".');
            }
    
            // 3. Preparar el PAYLOAD REAL
            const payload = {
                reportType: selectedReportType,
                filters: currentFilters,
                format: 'csv' // Forzamos CSV
            };
    
            // --- Código Fetch Adaptado ---
            const supabaseUrl = 'https://exwdzrnguktrpmwgvioo.supabase.co'; // CONFIRMA tu URL base
            const functionUrl = `${supabaseUrl}/functions/v1/generate_filtered_report`;
    
            const session = await supabase.auth.getSession();
            const accessToken = session?.data?.session?.access_token;
            // CONFIRMA TU API KEY ANON! Asegúrate que sea la correcta.
            const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4d2R6cm5ndWt0cnBtd2d2aW9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwMDgzNzcsImV4cCI6MjA1ODU4NDM3N30.y0spDaSiheZYsnwLxTnE5V_m4jxnC3h8KNW-U4vgR2M';
    
            if (!accessToken) throw new Error("Token de acceso no encontrado. Asegúrate de estar logueado.");
            if (!apiKey) throw new Error("API Key ANON no encontrada.");
    
            console.log("Enviando con fetch a:", functionUrl);
            console.log("Payload REAL para fetch:", JSON.stringify(payload));
    
            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'apikey': apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
    
            console.log("Respuesta de fetch - Status:", response.status, response.statusText);
    
            // Procesar la respuesta
            if (!response.ok) {
                const errorBodyText = await response.text();
                console.error("La petición fetch falló. Respuesta:", errorBodyText);
                try {
                    const errorJson = JSON.parse(errorBodyText);
                    if (errorJson.error) throw new Error(`Error desde la función: ${errorJson.error}`);
                } catch (e) { /* Ignorar error de parseo */ }
                throw new Error(`Error en la petición fetch: ${response.status} ${response.statusText}. Respuesta: ${errorBodyText.substring(0, 150)}...`);
            } else {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('text/csv')) {
                    console.log("Respuesta CSV recibida. El navegador debería gestionar la descarga.");
                    showMessage('success', 'Informe generado. Iniciando descarga...');
                    setTimeout(hideMessage, 3000);
                } else if (contentType && contentType.includes('application/json')) {
                    const data = await response.json();
                    if (data && data.status === 'empty') {
                        console.log("Generación completada, no había datos.");
    
                        openInfoModal('Informe Vacío', data.message || "No se encontraron datos con los filtros seleccionados.");
                        
                    } else {
                        console.warn("Respuesta JSON inesperada:", data);
                        throw new Error("Se recibió una respuesta JSON inesperada de la función.");
                    }
                } else {
                    const responseBodyText = await response.text();
                    console.warn("Respuesta 2xx con Content-Type desconocido:", contentType, responseBodyText);
                    showMessage('info', `Respuesta recibida (${response.status}), pero formato no reconocido.`);
                }
            }
            // --- Fin Código Fetch Adaptado ---
    
        } catch (error) {
            console.error('Error generando informe:', error);
            showMessage('error', `Error al generar el informe: ${error.message}`);
        } finally {
            setLoadingState(false);
        }
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
        console.log('Reports.js: Received authReady event.');
        currentUser = e.detail.user;
        currentUserId = currentUser?.id;
        if (currentUserId) {
            // Cargar avatar
            supabase.from('profiles').select('avatar_url').eq('id', currentUserId).single().then(({ data }) => {
                 if (userAvatarSmall) userAvatarSmall.src = data?.avatar_url || defaultAvatarPath;
            });
            // Cargar datos para filtros
            loadFilterData();
        } else {
            console.warn("Reports.js: No user session found.");
            // Manejar UI para usuario no logueado (auth-listener debería redirigir)
             showMessage('error', 'Debes iniciar sesión para generar informes.');
        }
    });

    document.addEventListener('DOMContentLoaded', () => {
        console.log("Reports.js: DOM fully loaded.");

        // Verificar si los elementos gatillo existen ANTES de añadir listeners
        const accountTriggerExists = !!accountFilterTrigger;
        const categoryTriggerExists = !!categoryFilterTrigger;
        console.log("DEBUG: Elemento #accountFilterTrigger encontrado?", accountTriggerExists);
        console.log("DEBUG: Elemento #categoryFilterTrigger encontrado?", categoryTriggerExists);


        if (backButton) backButton.addEventListener('click', () => { if (!isLoading) window.location.href = '/Dashboard.html'; });

        // Listener para selección de Tipo de Informe
        if(reportTypeSelector) {
            reportTypeSelector.addEventListener('click', (event) => {
                const button = event.target.closest('.report-type-option');
                if (button && !button.classList.contains('active') && !isLoading) {
                    // Quitar active de todos, poner en el clickeado
                    reportTypeSelector.querySelectorAll('.report-type-option').forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');
                    selectedReportType = button.dataset.reportType;
                    console.log("Tipo de reporte cambiado a:", selectedReportType);
                    toggleFilterSections(); // Mostrar/ocultar filtros correctos
                    hideMessage(); // Limpiar mensajes previos
                }
            });
            console.log("DEBUG: Listener añadido a .report-type-selector");
        } else { console.error("ERROR: Contenedor .report-type-selector NO encontrado!"); }

        // Listener para selección de Tipo (Ingreso/Gasto/Todos)
        if(filterTypeSelector) {
             filterTypeSelector.addEventListener('click', (event) => {
                 const button = event.target.closest('.type-option');
                 if (button && !button.classList.contains('active') && !isLoading) {
                      filterTypeSelector.querySelectorAll('.type-option').forEach(btn => btn.classList.remove('active'));
                      button.classList.add('active');
                      filters.type = button.dataset.type; // Actualizar estado del filtro
                      console.log("Filtro Tipo cambiado a:", filters.type);
                 }
             });
             console.log("DEBUG: Listener añadido a #filterTypeSelector");
        } else { console.warn("WARN: Elemento #filterTypeSelector NO encontrado!"); }

        console.log("Initializing sidebar...");
         setActiveSidebarLink();             // <--- LLAMADA 1
         addSidebarNavigationListeners(); 

        // Listener para selección de Formato (CSV/PDF)
        if(formatSelector) {
            formatSelector.addEventListener('click', (event) => {
                 const button = event.target.closest('.format-option:not(.disabled)'); // Solo si no está deshabilitado
                 if (button && !button.classList.contains('active') && !isLoading) {
                      formatSelector.querySelectorAll('.format-option').forEach(btn => btn.classList.remove('active'));
                      button.classList.add('active');
                      selectedFormat = button.dataset.format;
                      console.log("Formato cambiado a:", selectedFormat);
                 }
            });
            console.log("DEBUG: Listener añadido a #formatSelector");
        } else { console.error("ERROR: Contenedor #formatSelector NO encontrado!"); }

        // Listeners para abrir modales de selección (Cuenta, Categoría) - Placeholder
        if (accountFilterTrigger) {
            accountFilterTrigger.addEventListener('click', () => {
                console.log("DEBUG: Clic en #accountFilterTrigger detectado. isLoading:", isLoading);
                if (isLoading) { console.log("DEBUG: Ignorando clic (isLoading=true)"); return; }
                try {
                    console.log("DEBUG: Preparando opciones de cuenta...");
                    // Añadir comprobación por si 'accounts' no es un array
                    if (!Array.isArray(accounts)) { throw new Error("'accounts' no es un array válido."); }
                    const accountOptions = [
                         { value: 'all', text: 'Todas las cuentas' },
                         ...accounts.map(acc => ({ value: acc.id, text: acc.name }))
                     ];
                     console.log("DEBUG: Opciones de cuenta preparadas:", accountOptions.length);
                     console.log("DEBUG: Comprobando si 'openSelectionModal' está definida...");
                     if (typeof openSelectionModal !== 'function') { throw new Error("'openSelectionModal' no está definida o no es una función."); }
                     console.log("DEBUG: Llamando a openSelectionModal para accountId...");
                     openSelectionModal('accountId', 'Seleccionar Cuenta', accountOptions, filters.accountId);
                     console.log("DEBUG: openSelectionModal para accountId llamada (aparentemente).");
                } catch(e) {
                     console.error("ERROR dentro del listener de accountFilterTrigger:", e);
                     alert(`Error al preparar selección de cuenta: ${e.message}`); // Mostrar error al usuario
                }
            });
            console.log("DEBUG: Listener añadido a #accountFilterTrigger CORRECTAMENTE.");
        } else {
             console.error("ERROR: No se pudo añadir listener a #accountFilterTrigger porque no se encontró.");
        }

        if (categoryFilterTrigger) {
            categoryFilterTrigger.addEventListener('click', () => {
               console.log("DEBUG: Clic en #categoryFilterTrigger detectado. isLoading:", isLoading);
                if (isLoading) { console.log("DEBUG: Ignorando clic (isLoading=true)"); return; }
                try {
                   console.log("DEBUG: Preparando opciones de categoría...");
                   if (!Array.isArray(categories)) { throw new Error("'categories' no es un array válido."); }
                    const categoryOptions = [
                        { value: 'all', text: 'Todas las categorías' },
                        { value: 'none', text: '(Sin Categoría)' },
                        ...categories.map(cat => ({ value: cat.id, text: cat.name }))
                    ];
                   console.log("DEBUG: Opciones de categoría preparadas:", categoryOptions.length);
                   console.log("DEBUG: Comprobando si 'openSelectionModal' está definida...");
                   if (typeof openSelectionModal !== 'function') { throw new Error("'openSelectionModal' no está definida o no es una función."); }
                   console.log("DEBUG: Llamando a openSelectionModal para categoryId...");
                   openSelectionModal('categoryId', 'Seleccionar Categoría', categoryOptions, filters.categoryId);
                   console.log("DEBUG: openSelectionModal para categoryId llamada (aparentemente).");
               } catch(e) {
                    console.error("ERROR dentro del listener de categoryFilterTrigger:", e);
                    alert(`Error al preparar selección de categoría: ${e.message}`);
               }
            });
            console.log("DEBUG: Listener añadido a #categoryFilterTrigger CORRECTAMENTE.");
       } else {
            console.error("ERROR: No se pudo añadir listener a #categoryFilterTrigger porque no se encontró.");
       }

        // Listener Botón Generar Informe
        if (generateReportBtn) {
            generateReportBtn.addEventListener('click', handleGenerateReport);
            console.log("DEBUG: Listener añadido a #generateReportBtn");
        } else { console.error("ERROR: Botón #generateReportBtn NO encontrado!"); }

        if (infoModalCloseBtn) {
            infoModalCloseBtn.addEventListener('click', closeInfoModal);
        }

        // Listeners para el Modal de Selección Genérico
        if (cancelSelectionButton) { cancelSelectionButton.addEventListener('click', closeSelectionModal); console.log("DEBUG: Listener añadido a #cancelSelectionButton"); }
        if (selectionModal) { selectionModal.addEventListener('click', (event) => { if (event.target === selectionModal) closeSelectionModal(); }); console.log("DEBUG: Listener añadido a #selectionModal"); }
        if (selectionForm) { selectionForm.addEventListener('submit', handleSelectionFormSubmit); console.log("DEBUG: Listener añadido a #selectionForm"); }

        // Inicializar vista de filtros
        toggleFilterSections();

         // Scroll top
         if (scrollTopBtn) { window.addEventListener('scroll', () => { scrollTopBtn.classList.toggle('visible', window.scrollY > 300); }); scrollTopBtn.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); }); }

    }); // Fin DOMContentLoaded

} // Fin check Supabase