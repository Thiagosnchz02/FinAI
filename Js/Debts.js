// Debts.js (MODIFICADO PARA AÑADIR PAGO)
// ASEGÚRATE que supabase-init.js y auth-listener.js se cargaron antes

console.log('DEBUG: Debts.js - Cargado (v con Pago)');

if (typeof supabase === 'undefined' || supabase === null) {
    console.error('Debts.js: ¡Error Crítico! Cliente Supabase no inicializado.');
    const debtList = document.getElementById('debtList');
    if(debtList) debtList.innerHTML = '<p style="text-align: center; color: red;">Error crítico.</p>';
} else {
    console.log('Debts.js: Cliente Supabase encontrado. Procediendo...');

    // --- Selección de Elementos DOM ---
    const backButton = document.getElementById('backButton');
    const userAvatarSmall = document.getElementById('userAvatarSmall');
    const addDebtBtn = document.getElementById('addDebtBtn');
    const debtList = document.getElementById('debtList');
    const loadingDebtsMessage = document.getElementById('loadingDebtsMessage');
    const noDebtsMessage = document.getElementById('noDebtsMessage');
    const addDebtFromEmptyBtn = document.getElementById('addDebtFromEmptyBtn');
    // Summary Footer Elements
    const summaryFooter = document.getElementById('summary-footer');
    const totalPendingAmountEl = document.getElementById('totalPendingAmount');
    const totalInitialAmountEl = document.getElementById('totalInitialAmount');
    const nextDueDateEl = document.getElementById('nextDueDate');
    // Modal Deuda (Añadir/Editar)
    const debtModal = document.getElementById('debtModal');
    const debtForm = document.getElementById('debtForm');
    const modalTitleDebt = document.getElementById('modalTitleDebt');
    const debtIdInput = document.getElementById('debtId');
    const debtCreditorInput = document.getElementById('debtCreditor');
    const debtDescriptionInput = document.getElementById('debtDescription');
    const debtInitialAmountInput = document.getElementById('debtInitialAmount');
    const debtCurrentBalanceInput = document.getElementById('debtCurrentBalance');
    const debtInterestRateInput = document.getElementById('debtInterestRate');
    const debtDueDateInput = document.getElementById('debtDueDate');
    const debtStatusInput = document.getElementById('debtStatus');
    const debtNotesInput = document.getElementById('debtNotes');
    const cancelDebtButton = document.getElementById('cancelDebtButton');
    const saveDebtButton = document.getElementById('saveDebtButton');
    const modalDebtError = document.getElementById('modalDebtError');
    // Modal Pago Deuda (NUEVO)
    const addPaymentModal = document.getElementById('addPaymentModal');
    const addPaymentForm = document.getElementById('addPaymentForm');
    const modalTitlePayment = document.getElementById('modalTitlePayment'); // Título del nuevo modal
    const paymentDebtIdInput = document.getElementById('paymentDebtId');
    const paymentDebtCreditorEl = document.getElementById('paymentDebtCreditor'); // Para mostrar a quién se paga
    const paymentCurrentBalanceEl = document.getElementById('paymentCurrentBalance'); // Para mostrar saldo actual
    const paymentAmountInput = document.getElementById('paymentAmount');
    const paymentDateInput = document.getElementById('paymentDate');
    const paymentAccountInput = document.getElementById('paymentAccount'); // Select de cuenta origen
    const paymentNotesInput = document.getElementById('paymentNotes');
    const cancelPaymentButton = document.getElementById('cancelPaymentButton');
    const savePaymentButton = document.getElementById('savePaymentButton');
    const modalPaymentError = document.getElementById('modalPaymentError');
    // Otros
    const scrollTopBtn = document.getElementById('scrollTopBtn');

    // --- Variables de Estado ---
    let currentUserId = null;
    let debtsData = []; // Cache local de deudas
    let accountsData = []; // Cache local de cuentas
    let paymentCategoryId = null; // ID de la categoría "Pago Deudas"

    // --- Constantes ---
    const defaultAvatarPath = 'https://finai.es/images/avatar_predeterminado.png';
    const PAYMENT_CATEGORY_NAME = 'Pago Deudas'; // Nombre exacto de la categoría GASTO para registrar pagos

    // --- Funciones Auxiliares ---
    function formatCurrency(value, currency = 'EUR') {
        if (isNaN(value) || value === null) return 'N/A';
        try {
             return new Intl.NumberFormat('es-ES', { style: 'currency', currency: currency, minimumFractionDigits: 2 }).format(value);
        } catch(e) { return `${Number(value).toFixed(2)} ${currency}`; }
    }

    function formatDate(dateString) {
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
        } catch (e) { console.error("Error formateando fecha:", dateString, e); return '--/--/----'; }
    }

    function getIconForDebt(description = '', creditor = '') {
        const desc = (description || '').toLowerCase(); // Asegurar string
        const cred = (creditor || '').toLowerCase(); // Asegurar string
        if (desc.includes('coche') || desc.includes('car') || desc.includes('vehiculo') || desc.includes('moto')) return 'fas fa-car-side';
        if (desc.includes('hipoteca') || desc.includes('piso') || desc.includes('vivienda') || desc.includes('propiedad') || desc.includes('property')) return 'fas fa-house-damage';
        if (desc.includes('estudios') || desc.includes('master') || desc.includes('universidad') || desc.includes('educacion') || desc.includes('education')) return 'fas fa-graduation-cap';
        if (desc.includes('personal') || cred.includes('maria') || cred.includes('juan')) return 'fas fa-user-friends';
        if (cred.includes('banco') || cred.includes('bank') || cred.includes('caixa') || cred.includes('santander') || cred.includes('bbva') || cred.includes('ing')) return 'fas fa-landmark';
        return 'fas fa-money-bill-wave';
    }

    function getStatusBadgeClass(status) {
        switch (status) {
            case 'pagada': return 'status-paid';
            case 'pendiente': return 'status-pending';
            case 'parcial': return 'status-partial';
            default: return 'status-pending';
        }
    }
     function getStatusText(status) {
        switch (status) {
            case 'pagada': return 'Pagada';
            case 'pendiente': return 'Pendiente';
            case 'parcial': return 'Parcial';
            default: return 'Pendiente';
        }
    }
    function populateSelect(selectElement, items, valueField = 'id', textField = 'name', defaultOptionText = 'Selecciona...', includeAllOption = false, allOptionText = 'Todos/as', firstOptionValue = '') {
        if (!selectElement) { console.error("populateSelect: Elemento select no encontrado"); return; }
        selectElement.innerHTML = '';
        let hasDefaultSelected = false;
        if (includeAllOption) { const allOpt = document.createElement('option'); allOpt.value = 'all'; allOpt.textContent = allOptionText; selectElement.appendChild(allOpt); }
        if (defaultOptionText) { const defaultOpt = document.createElement('option'); defaultOpt.value = firstOptionValue; defaultOpt.textContent = defaultOptionText; defaultOpt.disabled = (firstOptionValue === ''); defaultOpt.selected = (firstOptionValue === ''); if(defaultOpt.selected) hasDefaultSelected = true; selectElement.appendChild(defaultOpt); }
        items.forEach(item => { const option = document.createElement('option'); option.value = item[valueField]; option.textContent = item[textField]; selectElement.appendChild(option); });
         if (!hasDefaultSelected && firstOptionValue === '' && selectElement.options.length > (includeAllOption ? 1 : 0)) {
              selectElement.value = ''; // Seleccionar la opción vacía si existe y no hubo otra selección
         }
    }

    // --- Funciones Modales (Deuda) ---
    function toggleModal(show) {
        if (!debtModal) return;
        if (show) { debtModal.style.display = 'flex'; setTimeout(() => debtModal.classList.add('active'), 10); }
        else { debtModal.classList.remove('active'); setTimeout(() => { debtModal.style.display = 'none'; if (debtForm) debtForm.reset(); if (debtIdInput) debtIdInput.value = ''; if (modalDebtError) { modalDebtError.textContent = ''; modalDebtError.style.display = 'none'; } if(debtCurrentBalanceInput) debtCurrentBalanceInput.readOnly = false; }, 300); }
    }
    function openModal(debt = null) {
        if (!debtForm || !debtIdInput || !modalTitleDebt || !debtCreditorInput || !debtDescriptionInput || !debtInitialAmountInput || !debtCurrentBalanceInput || !debtInterestRateInput || !debtDueDateInput || !debtStatusInput || !debtNotesInput || !saveDebtButton) {
            console.error("Error: Elementos del modal de deuda no encontrados.");
            return;
        }
        debtForm.reset();
        debtIdInput.value = '';
        modalDebtError.style.display = 'none';
        saveDebtButton.disabled = false;
        saveDebtButton.textContent = 'Guardar Deuda';
        debtCurrentBalanceInput.readOnly = false; // Editable por defecto (al añadir)

        if (debt) { // Modo Edición
            modalTitleDebt.textContent = 'Editar Deuda';
            debtIdInput.value = debt.id;
            debtCreditorInput.value = debt.creditor;
            debtDescriptionInput.value = debt.description || '';
            debtInitialAmountInput.value = debt.initial_amount;
            debtCurrentBalanceInput.value = debt.current_balance;
            // debtCurrentBalanceInput.readOnly = true; // Hacemos que el saldo actual SÍ sea editable
            debtInterestRateInput.value = debt.interest_rate || '';
            debtDueDateInput.value = debt.due_date || ''; // Formato YYYY-MM-DD
            debtStatusInput.value = debt.status || 'pendiente';
            debtNotesInput.value = debt.notes || '';
        } else { // Modo Añadir
            modalTitleDebt.textContent = 'Añadir Nueva Deuda';
            debtStatusInput.value = 'pendiente'; // Estado por defecto
            // No ponemos readOnly para que puedan poner el saldo actual si ya existe la deuda
        }
        toggleModal(true);
    }
    function closeModal() { toggleModal(false); }

    // --- Funciones Modales (Pago Deuda) ---
    function togglePaymentModal(show) {
        if (!addPaymentModal) return;
        if (show) { addPaymentModal.style.display = 'flex'; setTimeout(() => addPaymentModal.classList.add('active'), 10); }
        else { addPaymentModal.classList.remove('active'); setTimeout(() => { addPaymentModal.style.display = 'none'; if (addPaymentForm) addPaymentForm.reset(); if (paymentDebtIdInput) paymentDebtIdInput.value = ''; if (modalPaymentError) { modalPaymentError.textContent = ''; modalPaymentError.style.display = 'none'; } }, 300); }
    }
    function openPaymentModal(debtId, creditorName, currentBalance) {
        if (!addPaymentForm || !paymentDebtIdInput || !paymentDebtCreditorEl || !paymentAmountInput || !paymentDateInput || !paymentAccountInput || !paymentCurrentBalanceEl) { console.error("Error: Elementos del modal de pago no encontrados."); return; }
        addPaymentForm.reset();
        paymentDebtIdInput.value = debtId;
        paymentDebtCreditorEl.textContent = creditorName;
        paymentCurrentBalanceEl.textContent = formatCurrency(currentBalance);
        populateSelect(paymentAccountInput, accountsData, 'id', 'name', 'Selecciona cuenta origen...');
        paymentDateInput.valueAsDate = new Date();
        modalPaymentError.style.display = 'none';
        savePaymentButton.disabled = false;
        savePaymentButton.textContent = 'Registrar Pago';
        togglePaymentModal(true);
        setTimeout(() => paymentAmountInput.focus(), 350);
    }
    function closePaymentModal() { togglePaymentModal(false); }

    // --- Funciones Principales ---

    function displaySummary(debts) {
         if (!summaryFooter || !totalPendingAmountEl || !totalInitialAmountEl || !nextDueDateEl) return;
         let totalPending = 0; let totalInitialActive = 0; let nextDue = null;
         const today = new Date(); today.setHours(0, 0, 0, 0);
         debts.forEach(debt => {
             if (debt.status !== 'pagada') {
                 totalPending += Number(debt.current_balance) || 0;
                 totalInitialActive += Number(debt.initial_amount) || 0;
                 if (debt.due_date) { try { const dueDate = new Date(debt.due_date); const offset = dueDate.getTimezoneOffset(); const adjustedDueDate = new Date(dueDate.getTime() + (offset * 60 * 1000)); adjustedDueDate.setHours(0,0,0,0); if (adjustedDueDate >= today) { if (nextDue === null || adjustedDueDate < nextDue) nextDue = adjustedDueDate; } } catch (e) {} }
             }
         });
         totalPendingAmountEl.textContent = formatCurrency(totalPending);
         totalInitialAmountEl.textContent = formatCurrency(totalInitialActive);
         nextDueDateEl.textContent = nextDue ? formatDate(nextDue.toISOString().split('T')[0]) : '--/--/----';
         summaryFooter.style.display = debts.length > 0 ? 'grid' : 'none';
     }

    function displayDebts(debts) {
        if (!debtList || !noDebtsMessage || !loadingDebtsMessage) return;
        debtList.innerHTML = '';

        if (!debts || debts.length === 0) { noDebtsMessage.style.display = 'block'; loadingDebtsMessage.style.display = 'none'; debtList.style.display = 'none'; displaySummary([]); return; }
        noDebtsMessage.style.display = 'none'; loadingDebtsMessage.style.display = 'none'; debtList.style.display = 'flex';

        debts.sort((a, b) => { const statusOrder = { 'pendiente': 1, 'parcial': 2, 'pagada': 3 }; if (statusOrder[a.status] !== statusOrder[b.status]) return statusOrder[a.status] - statusOrder[b.status]; const dateA = a.due_date ? new Date(a.due_date) : new Date('9999-12-31'); const dateB = b.due_date ? new Date(b.due_date) : new Date('9999-12-31'); return dateA - dateB; });

        debts.forEach(debt => {
            const card = document.createElement('div'); card.classList.add('debt-card'); card.setAttribute('data-id', debt.id); card.setAttribute('data-status', debt.status);
            const iconClass = getIconForDebt(debt.description, debt.creditor); const statusBadgeClass = getStatusBadgeClass(debt.status); const statusText = getStatusText(debt.status); const formattedInitial = formatCurrency(debt.initial_amount); const formattedBalance = formatCurrency(debt.current_balance); const formattedDueDate = formatDate(debt.due_date);
            card.innerHTML = `
                <div class="debt-icon-status"><div class="debt-icon-bg"><i class="${iconClass}"></i></div><span class="debt-status-badge ${statusBadgeClass}">${statusText}</span></div>
                <div class="debt-info">
                    <h3 class="debt-creditor">${debt.creditor}</h3><p class="debt-description">${debt.description || 'Sin descripción'}</p>
                    <div class="info-item"><span class="info-label">Importe Inicial</span><span class="info-value">${formattedInitial}</span></div>
                    <div class="info-item"><span class="info-label">Vencimiento</span><span class="info-value">${formattedDueDate}</span></div>
                    <div class="info-item"><span class="info-label">Saldo Pendiente</span><span class="info-value balance">${formattedBalance}</span></div>
                    <div class="info-item"><span class="info-label">Estado</span><span class="info-value status-text">${statusText}</span></div>
                </div>
                <div class="debt-actions">
                    ${debt.status !== 'pagada' ? `<button class="btn-icon btn-add-payment" aria-label="Añadir Pago" title="Añadir Pago" data-id="${debt.id}" data-creditor="${debt.creditor}" data-balance="${debt.current_balance}"><i class="fas fa-dollar-sign"></i></button>` : ''}
                    <button class="btn-icon btn-edit" aria-label="Editar" data-id="${debt.id}"><i class="fas fa-pencil-alt"></i></button>
                    <button class="btn-icon btn-delete" aria-label="Eliminar" data-id="${debt.id}"><i class="fas fa-trash-alt"></i></button>
                </div>`;
            debtList.appendChild(card);
        });
        displaySummary(debts);
    }

    async function loadInitialData(user) {
        if (!user) { if(loadingDebtsMessage) loadingDebtsMessage.textContent = "Inicia sesión."; if(noDebtsMessage) noDebtsMessage.style.display = 'block'; if(debtList) debtList.style.display = 'none'; if(summaryFooter) summaryFooter.style.display = 'none'; return; }
        currentUserId = user.id; console.log('Debts.js: Loading data for User ID:', currentUserId);
        if(loadingDebtsMessage) loadingDebtsMessage.style.display = 'block'; if(noDebtsMessage) noDebtsMessage.style.display = 'none'; if(debtList) debtList.innerHTML = ''; if(summaryFooter) summaryFooter.style.display = 'none'; if(userAvatarSmall) userAvatarSmall.src = defaultAvatarPath;

        try {
            const [profileRes, debtsRes, accountsRes, categoriesRes] = await Promise.all([
                supabase.from('profiles').select('avatar_url').eq('id', currentUserId).single(),
                supabase.from('debts').select('*').eq('user_id', currentUserId).order('status').order('due_date'),
                supabase.from('accounts').select('id, name').eq('user_id', currentUserId).order('name'),
                supabase.from('categories').select('id, name').eq('type', 'gasto').or(`user_id.eq.${currentUserId},is_default.eq.true`)
            ]);

            if (profileRes.error && profileRes.error.code !== 'PGRST116') console.warn('Debts.js: Error avatar:', profileRes.error.message);
            else if (profileRes.data?.avatar_url && userAvatarSmall) userAvatarSmall.src = profileRes.data.avatar_url;

            if (accountsRes.error) throw accountsRes.error;
            accountsData = accountsRes.data || [];

            if (categoriesRes.error) throw categoriesRes.error;
            const paymentCategory = (categoriesRes.data || []).find(cat => cat.name.toLowerCase() === PAYMENT_CATEGORY_NAME.toLowerCase());
            if (paymentCategory) paymentCategoryId = paymentCategory.id; else console.warn(`Categoría "${PAYMENT_CATEGORY_NAME}" no encontrada.`);

            if (debtsRes.error) throw debtsRes.error;
            debtsData = debtsRes.data || [];
            displayDebts(debtsData);

        } catch (error) { console.error('Error cargando datos (Debts v Pago):', error); if(loadingDebtsMessage) loadingDebtsMessage.textContent = `Error: ${error.message}`; if(noDebtsMessage) noDebtsMessage.style.display = 'block'; if(debtList) debtList.innerHTML = ''; displaySummary([]);
        } finally { if(loadingDebtsMessage && loadingDebtsMessage.textContent.startsWith('Cargando')) loadingDebtsMessage.style.display = 'none'; }
    }

     async function handlePaymentFormSubmit(event) {
         event.preventDefault();
         if (!supabase || !currentUserId || !addPaymentForm || !savePaymentButton || !paymentCategoryId) { modalPaymentError.textContent = !paymentCategoryId ? `Error: Categoría "${PAYMENT_CATEGORY_NAME}" no encontrada.` : 'Error inesperado.'; modalPaymentError.style.display = 'block'; console.error("Faltan datos o categoría de pago:", { paymentCategoryId }); return; }

         const debtId = paymentDebtIdInput.value; const paymentAmount = parseFloat(paymentAmountInput.value); const paymentDate = paymentDateInput.value; const accountId = paymentAccountInput.value; const paymentNotes = paymentNotesInput.value.trim() || null; const originalSaveText = savePaymentButton.textContent;

         if (!debtId || !accountId || !paymentDate || isNaN(paymentAmount) || paymentAmount <= 0) { modalPaymentError.textContent = 'Importe, Fecha y Cuenta son obligatorios.'; modalPaymentError.style.display = 'block'; return; }
         const debt = debtsData.find(d => d.id === debtId);
         if (!debt) { modalPaymentError.textContent = 'Error: Deuda no encontrada.'; modalPaymentError.style.display = 'block'; return; }
         if (paymentAmount > debt.current_balance) { if (!confirm(`Estás pagando ${formatCurrency(paymentAmount)}, más de lo pendiente (${formatCurrency(debt.current_balance)}).\n¿Continuar? (Saldo quedará en 0).`)) return; }

         modalPaymentError.style.display = 'none'; savePaymentButton.disabled = true; savePaymentButton.textContent = 'Registrando...';

         try {
             const transactionData = { user_id: currentUserId, account_id: accountId, category_id: paymentCategoryId, type: 'gasto', description: `Pago deuda ${debt.creditor}` + (debt.description ? ` (${debt.description})` : ''), amount: -Math.abs(paymentAmount), transaction_date: paymentDate, notes: paymentNotes, related_debt_id: debtId };
             console.log("Creando transacción:", transactionData);
             const { error: txError } = await supabase.from('transactions').insert([transactionData]);
             if (txError) throw new Error(`Error al registrar transacción: ${txError.message}`);
             console.log("Transacción creada.");

             const currentBalance = Number(debt.current_balance) || 0; const newBalance = Math.max(0, currentBalance - paymentAmount); const newStatus = newBalance <= 0 ? 'pagada' : debt.status;
             console.log(`Actualizando deuda ${debtId}: Nuevo Saldo=${newBalance}, Nuevo Estado=${newStatus}`);
             const { error: debtUpdateError } = await supabase.from('debts').update({ current_balance: newBalance, status: newStatus, updated_at: new Date() }).eq('id', debtId).eq('user_id', currentUserId);
             if (debtUpdateError) throw new Error(`Error al actualizar deuda: ${debtUpdateError.message}`);
             console.log("Deuda actualizada.");

             alert('Pago registrado y deuda actualizada.'); closePaymentModal(); loadInitialData({ id: currentUserId });

         } catch (error) { console.error('Error procesando pago de deuda:', error); modalPaymentError.textContent = `Error: ${error.message}`; modalPaymentError.style.display = 'block';
         } finally { savePaymentButton.disabled = false; savePaymentButton.textContent = originalSaveText; }
     }

     async function handleFormSubmit(event) {
        event.preventDefault();
        if (!supabase || !currentUserId || !debtForm || !saveDebtButton) return;

        const debtId = debtIdInput.value;
        const isEditing = !!debtId;
        const originalSaveText = saveDebtButton.textContent;

        // Recoger datos del formulario
        const formData = {
            user_id: currentUserId,
            creditor: debtCreditorInput.value.trim(),
            description: debtDescriptionInput.value.trim() || null,
            initial_amount: parseFloat(debtInitialAmountInput.value),
            current_balance: parseFloat(debtCurrentBalanceInput.value),
            interest_rate: parseFloat(debtInterestRateInput.value) || null,
            due_date: debtDueDateInput.value || null,
            status: debtStatusInput.value,
            notes: debtNotesInput.value.trim() || null,
            // updated_at se maneja automáticamente por Supabase o trigger
        };

        // Validaciones
        if (!formData.creditor || isNaN(formData.initial_amount) || formData.initial_amount <= 0 || isNaN(formData.current_balance) || formData.current_balance < 0) {
            modalDebtError.textContent = 'Acreedor, Importe Inicial (>0) y Saldo Pendiente (>=0) son obligatorios.';
            modalDebtError.style.display = 'block'; return;
        }
         if (formData.interest_rate !== null && formData.interest_rate < 0) {
             modalDebtError.textContent = 'La tasa de interés no puede ser negativa.';
             modalDebtError.style.display = 'block'; return;
         }
        modalDebtError.style.display = 'none';
        saveDebtButton.disabled = true;
        saveDebtButton.textContent = isEditing ? 'Guardando...' : 'Creando...';

        try {
            let error;
            if (isEditing) {
                // --- UPDATE ---
                const { error: updateError } = await supabase
                    .from('debts')
                    .update({
                        creditor: formData.creditor,
                        description: formData.description,
                        initial_amount: formData.initial_amount,
                        current_balance: formData.current_balance,
                        interest_rate: formData.interest_rate,
                        due_date: formData.due_date,
                        status: formData.status,
                        notes: formData.notes,
                        updated_at: new Date() // Actualizar timestamp
                     })
                    .eq('id', debtId)
                    .eq('user_id', currentUserId);
                error = updateError;
            } else {
                // --- INSERT ---
                const { error: insertError } = await supabase.from('debts').insert([formData]);
                error = insertError;
            }
            if (error) throw error;

            console.log(isEditing ? 'Deuda actualizada' : 'Deuda creada');
            closeModal();
            loadInitialData({ id: currentUserId }); // Recargar lista

        } catch (error) {
            console.error('Error guardando deuda:', error);
            modalDebtError.textContent = `Error: ${error.message}`;
            modalDebtError.style.display = 'block';
        } finally {
            saveDebtButton.disabled = false;
            saveDebtButton.textContent = originalSaveText;
        }
    }

    async function handleDeleteDebt(debtId) {
        if (!supabase || !currentUserId || !debtId) return;
        const debtToDelete = debtsData.find(d => d.id === debtId);
        if (!debtToDelete) return;

        if (!confirm(`¿Estás SEGURO de que quieres eliminar la deuda con "${debtToDelete.creditor}" por ${formatCurrency(debtToDelete.initial_amount)}?\n¡Esta acción no se puede deshacer!`)) {
            return;
        }

        console.log('Intentando eliminar deuda:', debtId);
        try {
            const { error } = await supabase
                .from('debts')
                .delete()
                .eq('id', debtId)
                .eq('user_id', currentUserId);

            if (error) throw error;

            console.log('Deuda eliminada con éxito');
            alert('Deuda eliminada.');
            loadInitialData({ id: currentUserId }); // Recargar lista

        } catch (error) {
            console.error('Error eliminando deuda:', error);
            alert(`Error al eliminar la deuda: ${error.message}`);
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

    document.addEventListener('authReady', (e) => { console.log('Debts.js: Received authReady event.'); loadInitialData(e.detail.user); });

    document.addEventListener('DOMContentLoaded', () => {
        console.log("Debts.js: DOM fully loaded.");
        if (addDebtBtn) addDebtBtn.addEventListener('click', () => openModal());
        if (addDebtFromEmptyBtn) addDebtFromEmptyBtn.addEventListener('click', () => openModal());
        if (backButton) backButton.addEventListener('click', () => { window.location.href = '/Dashboard.html'; });

        // Modal Deuda Listeners
        if (cancelDebtButton) cancelDebtButton.addEventListener('click', closeModal);
        if (debtModal) debtModal.addEventListener('click', (event) => { if (event.target === debtModal) closeModal(); });
        if (debtForm) debtForm.addEventListener('submit', handleFormSubmit);

        console.log("Initializing sidebar...");
         setActiveSidebarLink();             // <--- LLAMADA 1
         addSidebarNavigationListeners(); 

        // Modal Pago Listeners (NUEVO)
        if (cancelPaymentButton) cancelPaymentButton.addEventListener('click', closePaymentModal);
        if (addPaymentModal) addPaymentModal.addEventListener('click', (event) => { if (event.target === addPaymentModal) closePaymentModal(); });
        if (addPaymentForm) addPaymentForm.addEventListener('submit', handlePaymentFormSubmit);

        // Delegación para acciones en la lista (Editar, Eliminar, AÑADIR PAGO)
        if (debtList) {
            debtList.addEventListener('click', (event) => {
                 const paymentButton = event.target.closest('.btn-add-payment');
                 if(paymentButton) { const debtId = paymentButton.dataset.id; const creditor = paymentButton.dataset.creditor; const balance = parseFloat(paymentButton.dataset.balance); openPaymentModal(debtId, creditor, balance); return; }
                 const editButton = event.target.closest('.btn-edit');
                 if (editButton) { const debtId = editButton.closest('.debt-card')?.dataset.id; const debtToEdit = debtsData.find(d => d.id === debtId); if (debtToEdit) openModal(debtToEdit); else console.error('Deuda no encontrada para editar:', debtId); return; }
                 const deleteButton = event.target.closest('.btn-delete');
                 if (deleteButton) { const debtId = deleteButton.closest('.debt-card')?.dataset.id; handleDeleteDebt(debtId); return; }
            });
        }

        // Scroll to top
        if (scrollTopBtn) { window.addEventListener('scroll', () => { scrollTopBtn.classList.toggle('visible', window.scrollY > 300); }); scrollTopBtn.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); }); }

    }); // Fin DOMContentLoaded

} // Fin del check inicial de Supabase