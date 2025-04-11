// Trips.js (Single Dynamic Page Approach - COMPLETO)
// ASEGÚRATE que supabase-init.js y auth-listener.js se cargaron antes

console.log('DEBUG: Trips.js - Cargado (Dynamic Page)');

if (typeof supabase === 'undefined' || supabase === null) {
    console.error('Trips.js: ¡Error Crítico! Cliente Supabase no inicializado.');
    // Considera mostrar un error en la UI más permanente
    const tripsListView = document.getElementById('tripsListView');
    if(tripsListView) tripsListView.innerHTML = '<p style="color:red; text-align:center; padding: 20px;">Error crítico: No se puede cargar la aplicación.</p>';

} else {
    console.log('Trips.js: Cliente Supabase encontrado.');

    // --- Selección de Elementos DOM ---
    const backButton = document.getElementById('backButton');
    const userAvatarSmall = document.getElementById('userAvatarSmall');

    // Vistas Principales
    const tripsListView = document.getElementById('tripsListView');
    const tripDetailView = document.getElementById('tripDetailView');

    // Elementos Vista Lista
    const addTripBtn = document.getElementById('addTripBtn');
    const addTripFromEmptyBtn = document.getElementById('addTripFromEmptyBtn'); // Asegúrate que este ID existe en tu HTML
    const tripListContainer = document.getElementById('tripListContainer');
    const loadingTripsMessage = document.getElementById('loadingTripsMessage');
    const noTripsMessage = document.getElementById('noTripsMessage');
    const summaryFooterList = document.getElementById('summary-footer-list');
    const nextTripDateEl = document.getElementById('nextTripDate');
    const totalBudgetedTripsEl = document.getElementById('totalBudgetedTrips');
    const totalSavedForTripsEl = document.getElementById('totalSavedForTrips');

    // Elementos Vista Detalle
    const backToListBtn = document.getElementById('backToListBtn');
    const tripDetailHeader = document.getElementById('tripDetailHeader');
    const detailTripNameEl = document.getElementById('detailTripName');
    const detailTripDatesEl = document.getElementById('detailTripDates');
    const detailTripBudgetEl = document.getElementById('detailTripBudget');
    const detailTripSpentEl = document.getElementById('detailTripSpent');
    const detailTripRemainingEl = document.getElementById('detailTripRemaining');
    const addTripExpenseBtn = document.getElementById('addTripExpenseBtn');
    const tripExpensesListContainer = document.getElementById('tripExpensesListContainer');
    const loadingTripExpensesMessage = document.getElementById('loadingTripExpensesMessage');
    const noTripExpensesMessage = document.getElementById('noTripExpensesMessage');
    const tripExpensesTableWrapper = document.getElementById('tripExpensesTableWrapper');
    const tripExpensesTableBody = document.getElementById('tripExpensesTableBody');

    // Modal Viaje (Añadir/Editar)
    const tripModal = document.getElementById('tripModal');
    const tripForm = document.getElementById('tripForm');
    const modalTitleTrip = document.getElementById('modalTitleTrip');
    const tripIdInput = document.getElementById('tripId');
    const tripNameInput = document.getElementById('tripName');
    const tripDestinationInput = document.getElementById('tripDestination');
    const tripStartDateInput = document.getElementById('tripStartDate');
    const tripEndDateInput = document.getElementById('tripEndDate');
    const tripBudgetInput = document.getElementById('tripBudget');
    const tripSavedAmountInput = document.getElementById('tripSavedAmount');
    const tripNotesInput = document.getElementById('tripNotes');
    const cancelTripButton = document.getElementById('cancelTripButton');
    const saveTripButton = document.getElementById('saveTripButton');
    const modalTripError = document.getElementById('modalTripError');

    // Modal Gasto Viaje (Añadir/Editar)
    const tripExpenseModal = document.getElementById('tripExpenseModal');
    const tripExpenseForm = document.getElementById('tripExpenseForm');
    const modalTitleTripExpense = document.getElementById('modalTitleTripExpense');
    const tripExpenseIdInput = document.getElementById('tripExpenseId');
    const expenseTripIdInput = document.getElementById('expenseTripId'); // Hidden input for trip_id
    const tripExpenseDescriptionInput = document.getElementById('tripExpenseDescription');
    const tripExpenseAmountInput = document.getElementById('tripExpenseAmount');
    const tripExpenseDateInput = document.getElementById('tripExpenseDate');
    const tripExpenseCategoryInput = document.getElementById('tripExpenseCategory');
    const tripExpenseNotesInput = document.getElementById('tripExpenseNotes');
    const cancelTripExpenseButton = document.getElementById('cancelTripExpenseButton');
    const saveTripExpenseButton = document.getElementById('saveTripExpenseButton');
    const modalTripExpenseError = document.getElementById('modalTripExpenseError');

    // Otros
    const scrollTopBtn = document.getElementById('scrollTopBtn');

    // --- Variables de Estado ---
    let currentUserId = null;
    let currentView = 'list'; // 'list' or 'detail'
    let currentTripId = null; // ID del viaje seleccionado en vista detalle
    let allTripsData = []; // Cache de todos los viajes
    let currentTripExpenses = []; // Cache de gastos del viaje seleccionado
    let currentUser = null; // Guardar el objeto user completo

    // --- Constantes ---
    const defaultAvatarPath = 'https://finai.es/images/avatar_predeterminado.png';

    // --- Funciones Auxiliares ---
    function formatCurrency(value, currency = 'EUR') {
        if (isNaN(value) || value === null) return '€0.00';
        try { return new Intl.NumberFormat('es-ES', { style: 'currency', currency: currency, minimumFractionDigits: 2 }).format(value); }
        catch (e) { return `${Number(value).toFixed(2)} ${currency}`; }
    }
    function formatDate(dateString, options = { day: '2-digit', month: '2-digit', year: 'numeric' }) {
        if (!dateString) return '--/--/----';
        try {
            const date = new Date(dateString);
            const offset = date.getTimezoneOffset();
            const adjustedDate = new Date(date.getTime() + (offset * 60 * 1000));
            if (isNaN(adjustedDate.getTime())) return '--/--/----';
            return adjustedDate.toLocaleDateString('es-ES', options);
        } catch (e) { console.error("Error formateando fecha:", dateString, e); return '--/--/----'; }
    }
    function getIconForTrip(name = '', destination = '') {
        const text = `${(name || '').toLowerCase()} ${(destination || '').toLowerCase()}`;
        if (text.includes('japón') || text.includes('asia') || text.includes('tokio')) return 'fas fa-torii-gate';
        if (text.includes('parís') || text.includes('francia') || text.includes('europa') || text.includes('torre eiffel')) return 'fas fa-archway';
        if (text.includes('montaña') || text.includes('senderismo') || text.includes('rural') || text.includes('trekking')) return 'fas fa-hiking';
        if (text.includes('playa') || text.includes('costa') || text.includes('cancún') || text.includes('méxico') || text.includes('caribe')) return 'fas fa-umbrella-beach';
        if (text.includes('avión') || text.includes('vuelo')) return 'fas fa-plane';
        return 'fas fa-suitcase-rolling';
    }
    function populateSelect(selectElement, items, valueField = 'id', textField = 'name', defaultOptionText = 'Selecciona...', includeAllOption = false, allOptionText = 'Todos/as', firstOptionValue = '') {
         if (!selectElement) { console.error("populateSelect: Elemento select no encontrado"); return; }
         selectElement.innerHTML = ''; let hasDefaultSelected = false;
         if (includeAllOption) { const allOpt = document.createElement('option'); allOpt.value = 'all'; allOpt.textContent = allOptionText; selectElement.appendChild(allOpt); }
         if (defaultOptionText) { const defaultOpt = document.createElement('option'); defaultOpt.value = firstOptionValue; defaultOpt.textContent = defaultOptionText; defaultOpt.disabled = (firstOptionValue === ''); defaultOpt.selected = (firstOptionValue === ''); if(defaultOpt.selected) hasDefaultSelected = true; selectElement.appendChild(defaultOpt); }
         items.forEach(item => { const option = document.createElement('option'); option.value = item[valueField]; option.textContent = item[textField]; selectElement.appendChild(option); });
         if (!hasDefaultSelected && firstOptionValue === '' && selectElement.options.length > (includeAllOption ? 1 : 0)) { selectElement.value = ''; }
     }


    // --- Funciones de Gestión de Vistas ---
    function switchView(viewToShow) {
        currentView = viewToShow;
        if (viewToShow === 'list') {
            if(tripDetailView) tripDetailView.style.display = 'none';
            if(tripsListView) tripsListView.style.display = 'block';
            if(tripDetailView) tripDetailView.classList.remove('active');
            if(tripsListView) tripsListView.classList.add('active');
            currentTripId = null;
             displayListSummary(allTripsData); // Re-render list summary
        } else if (viewToShow === 'detail') {
            if(tripsListView) tripsListView.style.display = 'none';
            if(tripDetailView) tripDetailView.style.display = 'block';
            if(tripsListView) tripsListView.classList.remove('active');
            if(tripDetailView) tripDetailView.classList.add('active');
        }
        window.scrollTo(0, 0);
        console.log(`Vista cambiada a: ${currentView}`);
    }

    async function showDetailView(tripId) {
        if (!tripId || !currentUserId) return;
        console.log(`Mostrando detalles para viaje ID: ${tripId}`);
        currentTripId = tripId;
        switchView('detail');

        // Resetear y mostrar carga
        if(loadingTripExpensesMessage) loadingTripExpensesMessage.style.display = 'block'; loadingTripExpensesMessage.textContent = 'Cargando gastos...';
        if(noTripExpensesMessage) noTripExpensesMessage.style.display = 'none';
        if(tripExpensesTableBody) tripExpensesTableBody.innerHTML = '';
        if(tripExpensesTableWrapper) tripExpensesTableWrapper.style.display = 'none';
        if(tripDetailHeader) tripDetailHeader.style.opacity = '0.5';

        try {
            const tripDetails = allTripsData.find(t => t.id === tripId);
            if (!tripDetails) { // Si no está en caché (raro, pero posible), buscarlo
                 console.warn("Detalles del viaje no en caché, buscando en DB...");
                 const { data: singleTrip, error: singleTripError } = await supabase.from('trips').select('*').eq('user_id', currentUserId).eq('id', tripId).single();
                 if (singleTripError || !singleTrip) throw singleTripError || new Error("Viaje no encontrado.");
                 currentTripDetails = singleTrip;
            } else {
                 currentTripDetails = tripDetails;
            }


            const { data: expenses, error: expensesError } = await supabase
                .from('trip_expenses')
                .select('*')
                .eq('user_id', currentUserId)
                .eq('trip_id', tripId)
                .order('expense_date', { ascending: false });

            if (expensesError) throw expensesError;
            currentTripExpenses = expenses || [];

            displayTripDetailHeader(currentTripDetails, currentTripExpenses);
            displayTripExpenses(currentTripExpenses);

        } catch (error) {
            console.error("Error al cargar detalles/gastos del viaje:", error);
            if(loadingTripExpensesMessage) { loadingTripExpensesMessage.textContent = `Error: ${error.message}`; loadingTripExpensesMessage.style.display = 'block'; }
        } finally {
            if(loadingTripExpensesMessage && loadingTripExpensesMessage.textContent.startsWith('Cargando')) loadingTripExpensesMessage.style.display = 'none';
            if(tripDetailHeader) tripDetailHeader.style.opacity = '1';
        }
    }

    // --- Funciones de Renderizado ---

    function displayListSummary(trips) { /* ... (igual que antes) ... */ }
    function displayTripsList(trips) { /* ... (igual que antes, renderiza las tarjetas) ... */ }
    function displayTripDetailHeader(trip, expenses) { /* ... (igual que antes, actualiza cabecera detalle) ... */ }
    function displayTripExpenses(expenses) { /* ... (igual que antes, renderiza tabla gastos) ... */ }


    // --- Funciones de Modales y CRUD ---

    // -- VIAJES --
    function toggleTripModal(show) {
        if (!tripModal) return;
        if (show) { tripModal.style.display = 'flex'; setTimeout(() => tripModal.classList.add('active'), 10); }
        else { tripModal.classList.remove('active'); setTimeout(() => { tripModal.style.display = 'none'; if (tripForm) tripForm.reset(); if (tripIdInput) tripIdInput.value = ''; if (modalTripError) { modalTripError.textContent = ''; modalTripError.style.display = 'none'; } }, 300); }
    }

    function openTripModal(trip = null) {
        if (!tripForm) { console.error("Modal de viaje no encontrado."); return; }
        tripForm.reset(); tripIdInput.value = ''; modalTripError.style.display = 'none'; saveTripButton.disabled = false; saveTripButton.textContent = 'Guardar Viaje';

        if (trip) { // Editando
            modalTitleTrip.textContent = 'Editar Viaje';
            tripIdInput.value = trip.id;
            tripNameInput.value = trip.name;
            tripDestinationInput.value = trip.destination || '';
            tripStartDateInput.value = trip.start_date || '';
            tripEndDateInput.value = trip.end_date || '';
            tripBudgetInput.value = trip.budget || 0;
            tripSavedAmountInput.value = trip.saved_amount || 0;
            tripNotesInput.value = trip.notes || '';
        } else { // Añadiendo
            modalTitleTrip.textContent = 'Añadir Nuevo Viaje';
            // Dejar valores por defecto o vacíos
        }
        toggleTripModal(true);
    }
    function closeTripModal() { toggleTripModal(false); }

    async function handleTripFormSubmit(event) {
        event.preventDefault();
        if (!currentUserId || !tripForm) return;

        const tripId = tripIdInput.value;
        const isEditing = !!tripId;
        const originalButtonText = saveTripButton.textContent;

        const formData = {
            user_id: currentUserId,
            name: tripNameInput.value.trim(),
            destination: tripDestinationInput.value.trim() || null,
            start_date: tripStartDateInput.value || null,
            end_date: tripEndDateInput.value || null,
            budget: parseFloat(tripBudgetInput.value) || 0,
            saved_amount: parseFloat(tripSavedAmountInput.value) || 0,
            notes: tripNotesInput.value.trim() || null
        };

        if (!formData.name) { modalTripError.textContent = 'El nombre del viaje es obligatorio.'; modalTripError.style.display = 'block'; return; }
        if (formData.start_date && formData.end_date && new Date(formData.end_date) < new Date(formData.start_date)) { modalTripError.textContent = 'La fecha fin no puede ser anterior a la fecha inicio.'; modalTripError.style.display = 'block'; return; }

        modalTripError.style.display = 'none';
        saveTripButton.disabled = true;
        saveTripButton.textContent = isEditing ? 'Guardando...' : 'Creando...';

        try {
            let result;
            if (isEditing) {
                // No incluir user_id en el update
                const { user_id, ...updateData } = formData;
                updateData.updated_at = new Date(); // Añadir timestamp de actualización
                result = await supabase.from('trips').update(updateData).eq('id', tripId).eq('user_id', currentUserId);
            } else {
                result = await supabase.from('trips').insert([formData]);
            }

            const { error } = result;
            if (error) throw error;

            alert(isEditing ? 'Viaje actualizado.' : 'Viaje creado.');
            closeTripModal();
            loadInitialData(currentUser); // Recargar lista de viajes

        } catch (error) {
            console.error('Error guardando viaje:', error);
            modalTripError.textContent = `Error: ${error.message}`;
            modalTripError.style.display = 'block';
        } finally {
            saveTripButton.disabled = false;
            saveTripButton.textContent = originalButtonText;
        }
    }

    async function handleDeleteTrip(tripId) {
        if (!currentUserId || !tripId) return;
        const tripToDelete = allTripsData.find(t => t.id === tripId);
        if (!tripToDelete) return;

        if (!confirm(`¿Seguro que quieres eliminar el viaje "${tripToDelete.name}" y TODOS sus gastos asociados?\n¡Esta acción no se puede deshacer!`)) return;

        console.log(`Intentando eliminar viaje ${tripId} y sus gastos...`);
        try {
            // 1. Eliminar gastos asociados (más seguro que depender de CASCADE)
            console.log(`Eliminando gastos para trip_id: ${tripId}`);
            const { error: expenseError } = await supabase.from('trip_expenses').delete().eq('user_id', currentUserId).eq('trip_id', tripId);
            // No consideramos un error si no había gastos que borrar
            if (expenseError) {
                console.error("Error eliminando gastos del viaje (continuando):", expenseError);
                // Podríamos parar aquí si es crítico: throw new Error(`Error eliminando gastos: ${expenseError.message}`);
            } else {
                 console.log("Gastos asociados eliminados (o no existían).");
            }

            // 2. Eliminar el viaje
             console.log(`Eliminando viaje: ${tripId}`);
            const { error: tripError } = await supabase.from('trips').delete().eq('user_id', currentUserId).eq('id', tripId);
            if (tripError) throw new Error(`Error eliminando el viaje: ${tripError.message}`);

            alert('Viaje y sus gastos eliminados.');
            loadInitialData(currentUser); // Recargar lista

        } catch (error) {
            console.error("Error durante la eliminación del viaje:", error);
            alert(`Error: ${error.message}`);
        }
    }

    // -- GASTOS DE VIAJE --
     function toggleExpenseModal(show) {
        if (!tripExpenseModal) return;
        if (show) { tripExpenseModal.style.display = 'flex'; setTimeout(() => tripExpenseModal.classList.add('active'), 10); }
        else { tripExpenseModal.classList.remove('active'); setTimeout(() => { tripExpenseModal.style.display = 'none'; if (tripExpenseForm) tripExpenseForm.reset(); if (tripExpenseIdInput) tripExpenseIdInput.value = ''; if(expenseTripIdInput) expenseTripIdInput.value = ''; if (modalTripExpenseError) { modalTripExpenseError.textContent = ''; modalTripExpenseError.style.display = 'none'; } }, 300); }
    }

    function openTripExpenseModal(expense = null, tripId = currentTripId) {
        if (!tripId) { alert("Error: No se pudo identificar el viaje actual para añadir/editar gasto."); return; }
        if (!tripExpenseForm) { console.error("Modal de gasto de viaje no encontrado."); return; }

        tripExpenseForm.reset(); tripExpenseIdInput.value = ''; modalTripExpenseError.style.display = 'none'; saveTripExpenseButton.disabled = false; saveTripExpenseButton.textContent = 'Guardar Gasto';
        expenseTripIdInput.value = tripId; // ¡Importante! Asignar el tripId actual

        if (expense) { // Editando
            modalTitleTripExpense.textContent = 'Editar Gasto del Viaje';
            tripExpenseIdInput.value = expense.id;
            tripExpenseDescriptionInput.value = expense.description;
            tripExpenseAmountInput.value = expense.amount;
            tripExpenseDateInput.value = expense.expense_date ? expense.expense_date.split('T')[0] : ''; // Formato YYYY-MM-DD
            tripExpenseCategoryInput.value = expense.category || '';
            tripExpenseNotesInput.value = expense.notes || '';
        } else { // Añadiendo
            modalTitleTripExpense.textContent = 'Añadir Gasto del Viaje';
            // Poner fecha de hoy por defecto
            tripExpenseDateInput.valueAsDate = new Date();
        }
        toggleExpenseModal(true);
    }
    function closeTripExpenseModal() { toggleExpenseModal(false); }

    async function handleTripExpenseFormSubmit(event) {
        event.preventDefault();
        if (!currentUserId || !tripExpenseForm) return;

        const expenseId = tripExpenseIdInput.value; const isEditing = !!expenseId;
        const tripId = expenseTripIdInput.value; // Obtener tripId del input oculto
        const originalButtonText = saveTripExpenseButton.textContent;

        if (!tripId) { modalTripExpenseError.textContent = 'Error: Falta ID del viaje asociado.'; modalTripExpenseError.style.display = 'block'; return; }

        const formData = {
            user_id: currentUserId,
            trip_id: tripId, // Asegurarse de incluir trip_id
            description: tripExpenseDescriptionInput.value.trim(),
            amount: parseFloat(tripExpenseAmountInput.value),
            expense_date: tripExpenseDateInput.value,
            category: tripExpenseCategoryInput.value.trim() || null, // Guardar como texto
            notes: tripExpenseNotesInput.value.trim() || null
        };

        if (!formData.description || isNaN(formData.amount) || formData.amount <= 0 || !formData.expense_date) { modalTripExpenseError.textContent = 'Descripción, Importe (>0) y Fecha son obligatorios.'; modalTripExpenseError.style.display = 'block'; return; }

        modalTripExpenseError.style.display = 'none';
        saveTripExpenseButton.disabled = true;
        saveTripExpenseButton.textContent = isEditing ? 'Guardando...' : 'Creando...';

        try {
            let result;
            if (isEditing) {
                // No incluir user_id ni trip_id en el update si no cambian
                const { user_id, trip_id, ...updateData } = formData;
                 result = await supabase.from('trip_expenses').update(updateData).eq('id', expenseId).eq('user_id', currentUserId).eq('trip_id', tripId); // Asegurar pertenencia
            } else {
                result = await supabase.from('trip_expenses').insert([formData]);
            }

            const { error } = result;
            if (error) throw error;

            alert(isEditing ? 'Gasto actualizado.' : 'Gasto añadido.');
            closeTripExpenseModal();
            showDetailView(tripId); // Recargar SOLO la vista de detalle del viaje actual

        } catch (error) {
            console.error('Error guardando gasto del viaje:', error);
            modalTripExpenseError.textContent = `Error: ${error.message}`;
            modalTripExpenseError.style.display = 'block';
        } finally {
            saveTripExpenseButton.disabled = false;
            saveTripExpenseButton.textContent = originalButtonText;
        }
    }

     async function handleDeleteTripExpense(expenseId) {
        if (!currentUserId || !expenseId || !currentTripId) return; // Necesitamos saber el tripId actual

        if (!confirm("¿Seguro que quieres eliminar este gasto del viaje?")) return;

        console.log(`Intentando eliminar gasto de viaje: ${expenseId}`);
        try {
            const { error } = await supabase.from('trip_expenses').delete().eq('user_id', currentUserId).eq('id', expenseId);
            if (error) throw error;

            alert('Gasto eliminado.');
            showDetailView(currentTripId); // Recargar SOLO la vista de detalle del viaje actual

        } catch (error) {
            console.error("Error eliminando gasto:", error);
            alert(`Error: ${error.message}`);
        }
    }

    // --- Asignación de Event Listeners ---
    document.addEventListener('authReady', (e) => {
        console.log('Trips.js: Received authReady event.');
        currentUser = e.detail.user; // Guardar el usuario
        loadInitialData(currentUser);
    });

    document.addEventListener('DOMContentLoaded', () => {
        console.log("Trips.js: DOM fully loaded.");
        if (backButton) backButton.addEventListener('click', () => { if (currentView === 'detail') switchView('list'); else window.location.href = '/Dashboard.html'; });
        if (addTripBtn) addTripBtn.addEventListener('click', () => openTripModal());
        if (addTripFromEmptyBtn) addTripFromEmptyBtn.addEventListener('click', () => openTripModal()); // Asignar también aquí
        if (backToListBtn) backToListBtn.addEventListener('click', () => switchView('list'));
        if (addTripExpenseBtn) addTripExpenseBtn.addEventListener('click', () => openTripExpenseModal(null, currentTripId)); // Pasar null y currentTripId

        // Modales Viaje
        if (cancelTripButton) cancelTripButton.addEventListener('click', closeTripModal);
        if (tripModal) tripModal.addEventListener('click', (event) => { if (event.target === tripModal) closeTripModal(); });
        if (tripForm) tripForm.addEventListener('submit', handleTripFormSubmit);

        // Modales Gasto Viaje
        if (cancelTripExpenseButton) cancelTripExpenseButton.addEventListener('click', closeTripExpenseModal);
        if (tripExpenseModal) tripExpenseModal.addEventListener('click', (event) => { if (event.target === tripExpenseModal) closeTripExpenseModal(); });
        if (tripExpenseForm) tripExpenseForm.addEventListener('submit', handleTripExpenseFormSubmit);

        // Delegación en Lista de Viajes
        if (tripListContainer) {
            tripListContainer.addEventListener('click', (event) => {
                const viewBtn = event.target.closest('.btn-view-expenses');
                if (viewBtn) { showDetailView(viewBtn.dataset.id); return; }
                const editBtn = event.target.closest('.btn-edit-trip');
                if (editBtn) { const trip = allTripsData.find(t => t.id === editBtn.dataset.id); if(trip) openTripModal(trip); return; }
                const deleteBtn = event.target.closest('.btn-delete-trip');
                if (deleteBtn) { handleDeleteTrip(deleteBtn.dataset.id); return; }
            });
        }

        // Delegación en Tabla de Gastos
         if (tripExpensesTableBody) {
            tripExpensesTableBody.addEventListener('click', (event) => {
                const editBtn = event.target.closest('.btn-edit-expense');
                if (editBtn) { const expense = currentTripExpenses.find(e => e.id === editBtn.dataset.id); if(expense) openTripExpenseModal(expense, currentTripId); return; }
                const deleteBtn = event.target.closest('.btn-delete-expense');
                if (deleteBtn) { handleDeleteTripExpense(deleteBtn.dataset.id); return; }
            });
        }

        // Scroll to top
        if (scrollTopBtn) { window.addEventListener('scroll', () => { scrollTopBtn.classList.toggle('visible', window.scrollY > 300); }); scrollTopBtn.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); }); }

    });

} // Fin check Supabase