// Loans.js
// ASEGÚRATE que supabase-init.js y auth-listener.js se cargaron antes

console.log('DEBUG: Loans.js - Cargado');

if (typeof supabase === 'undefined' || supabase === null) {
    console.error('Loans.js: ¡Error Crítico! Cliente Supabase no inicializado.');
    const loanList = document.getElementById('loanList');
    if(loanList) loanList.innerHTML = '<p style="text-align: center; color: red;">Error crítico.</p>';
} else {
    console.log('Loans.js: Cliente Supabase encontrado. Procediendo...');

    // --- Selección de Elementos DOM ---
    const backButton = document.getElementById('backButton');
    const userAvatarSmall = document.getElementById('userAvatarSmall');
    const addLoanBtn = document.getElementById('addLoanBtn');
    const loanList = document.getElementById('loanList');
    const loadingLoansMessage = document.getElementById('loadingLoansMessage');
    const noLoansMessage = document.getElementById('noLoansMessage');
    const addLoanFromEmptyBtn = document.getElementById('addLoanFromEmptyBtn');
    // Summary Footer Elements
    const summaryFooter = document.getElementById('summary-footer');
    const totalOwedToUserEl = document.getElementById('totalOwedToUser');
    const totalLoanedActiveEl = document.getElementById('totalLoanedActive');
    const nextDueDateLoanEl = document.getElementById('nextDueDateLoan');
    // Modal Préstamo (Añadir/Editar)
    const loanModal = document.getElementById('loanModal');
    const loanForm = document.getElementById('loanForm');
    const modalTitleLoan = document.getElementById('modalTitleLoan');
    const loanIdInput = document.getElementById('loanId');
    const loanDebtorInput = document.getElementById('loanDebtor');
    const loanDescriptionInput = document.getElementById('loanDescription');
    const loanInitialAmountInput = document.getElementById('loanInitialAmount');
    const loanCurrentBalanceInput = document.getElementById('loanCurrentBalance');
    const loanInterestRateInput = document.getElementById('loanInterestRate');
    const loanDueDateInput = document.getElementById('loanDueDate');
    const loanStatusInput = document.getElementById('loanStatus');
    const loanReminderEnabledInput = document.getElementById('loanReminderEnabled');
    const loanNotesInput = document.getElementById('loanNotes');
    const cancelLoanButton = document.getElementById('cancelLoanButton');
    const saveLoanButton = document.getElementById('saveLoanButton');
    const modalLoanError = document.getElementById('modalLoanError');
    // Modal Registrar Cobro
    const addCollectionModal = document.getElementById('addCollectionModal');
    const addCollectionForm = document.getElementById('addCollectionForm');
    const modalTitleCollection = document.getElementById('modalTitleCollection');
    const collectionLoanIdInput = document.getElementById('collectionLoanId');
    const collectionLoanDebtorEl = document.getElementById('collectionLoanDebtor');
    const collectionCurrentBalanceEl = document.getElementById('collectionCurrentBalance');
    const collectionAmountInput = document.getElementById('collectionAmount');
    const collectionDateInput = document.getElementById('collectionDate');
    const collectionAccountInput = document.getElementById('collectionAccount');
    const collectionNotesInput = document.getElementById('collectionNotes');
    const cancelCollectionButton = document.getElementById('cancelCollectionButton');
    const saveCollectionButton = document.getElementById('saveCollectionButton');
    const modalCollectionError = document.getElementById('modalCollectionError');
    // Otros
    const scrollTopBtn = document.getElementById('scrollTopBtn');

    // --- Variables de Estado ---
    let currentUserId = null;
    let loansData = []; // Cache local de préstamos
    let accountsData = []; // Cache local de cuentas (para modal de cobro)
    let collectionCategoryId = null; // ID de la categoría "Devolución Préstamos"

    // --- Constantes ---
    const defaultAvatarPath = 'https://finai.es/images/avatar_predeterminado.png';
    const COLLECTION_CATEGORY_NAME = 'Devolución Préstamos'; // Nombre exacto de la categoría INGRESO para registrar cobros

    // --- Funciones Auxiliares ---
    function formatCurrency(value, currency = 'EUR') {
        if (isNaN(value) || value === null) return 'N/A'; // O '€0.00' si prefieres
        try {
             return new Intl.NumberFormat('es-ES', { style: 'currency', currency: currency, minimumFractionDigits: 2 }).format(value);
        } catch(e) {
            console.error("Error formatting currency:", value, currency, e);
            return `${Number(value).toFixed(2)} ${currency}`; // Fallback
        }
    }
    function formatDate(dateString) {
        if (!dateString) return '--/--/----';
        try {
            const date = new Date(dateString);
            // Compensar la zona horaria para mostrar la fecha local correcta
            const offset = date.getTimezoneOffset();
            const adjustedDate = new Date(date.getTime() + (offset * 60 * 1000));
            if (isNaN(adjustedDate.getTime())) return '--/--/----'; // Fecha inválida
            const day = String(adjustedDate.getDate()).padStart(2, '0');
            const month = String(adjustedDate.getMonth() + 1).padStart(2, '0'); // Meses son 0-indexados
            const year = adjustedDate.getFullYear();
            return `${day}/${month}/${year}`;
        } catch (e) {
            console.error("Error formateando fecha:", dateString, e);
            return '--/--/----';
        }
    }

    /** Devuelve un icono FA para préstamo */
    function getIconForLoan(description = '') {
        // Podrías personalizarlo basado en descripción o deudor si quieres
        return 'fas fa-hand-holding-usd'; // Icono genérico de recibir dinero
    }

     /** Devuelve clase CSS para badge de estado Préstamo */
     function getStatusBadgeClassLoan(status) {
        switch (status) {
            case 'cobrado': return 'status-collected'; // Verde
            case 'pendiente': return 'status-pending-loan'; // Naranja
            case 'parcial': return 'status-partial-loan'; // Azul
            default: return 'status-pending-loan';
        }
    }
     /** Devuelve texto legible para estado Préstamo */
     function getStatusTextLoan(status) {
        switch (status) {
            case 'cobrado': return 'Cobrado';
            case 'pendiente': return 'Pendiente';
            case 'parcial': return 'Parcialmente Cobrado';
            default: return 'Pendiente';
        }
    }
    function populateSelect(selectElement, items, valueField = 'id', textField = 'name', defaultOptionText = 'Selecciona...', includeAllOption = false, allOptionText = 'Todos/as', firstOptionValue = '') {
        if (!selectElement) { console.error("populateSelect: Elemento select no encontrado"); return; }
        selectElement.innerHTML = ''; // Limpiar siempre
        let hasDefaultSelected = false;
    
        // Añadir opción "Todos/as" si se requiere
        if (includeAllOption) {
            const allOpt = document.createElement('option');
            allOpt.value = 'all';
            allOpt.textContent = allOptionText;
            selectElement.appendChild(allOpt);
        }
    
        // Añadir opción por defecto si se proporciona texto para ella
        if (defaultOptionText) {
            const defaultOpt = document.createElement('option');
            defaultOpt.value = firstOptionValue; // Usar el valor proporcionado o ''
            defaultOpt.textContent = defaultOptionText;
            defaultOpt.disabled = (firstOptionValue === ''); // Deshabilitar si el valor es vacío
            defaultOpt.selected = (firstOptionValue === ''); // Seleccionar si el valor es vacío
            if(defaultOpt.selected) hasDefaultSelected = true;
            selectElement.appendChild(defaultOpt);
        }
    
        // Añadir los items proporcionados
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item[valueField];
            option.textContent = item[textField];
            selectElement.appendChild(option);
        });
    
         // Asegurarse de que la opción por defecto (vacía) esté seleccionada si no se seleccionó otra
         if (!hasDefaultSelected && firstOptionValue === '' && selectElement.options.length > (includeAllOption ? 1 : 0)) {
              selectElement.value = '';
         }
    }

    // --- Funciones Modales (Préstamo) ---
    function toggleLoanModal(show) {
        if (!loanModal) return;
        if (show) { loanModal.style.display = 'flex'; setTimeout(() => loanModal.classList.add('active'), 10); }
        else { loanModal.classList.remove('active'); setTimeout(() => { loanModal.style.display = 'none'; if (loanForm) loanForm.reset(); if (loanIdInput) loanIdInput.value = ''; if (modalLoanError) { modalLoanError.textContent = ''; modalLoanError.style.display = 'none'; } if(loanCurrentBalanceInput) loanCurrentBalanceInput.readOnly = false; if(loanReminderEnabledInput) loanReminderEnabledInput.checked=false; }, 300); }
    }
    function openLoanModal(loan = null) {
        if (!loanForm || !loanIdInput || !modalTitleLoan || !loanDebtorInput || /* ... otros inputs ... */ !loanReminderEnabledInput || !saveLoanButton) { console.error("Error: Elementos del modal de préstamo no encontrados."); return; }
        loanForm.reset(); loanIdInput.value = ''; modalLoanError.style.display = 'none'; saveLoanButton.disabled = false; saveLoanButton.textContent = 'Guardar Préstamo'; loanCurrentBalanceInput.readOnly = false; loanReminderEnabledInput.checked=false;

        if (loan) { // Modo Edición
            modalTitleLoan.textContent = 'Editar Préstamo';
            loanIdInput.value = loan.id;
            loanDebtorInput.value = loan.debtor;
            loanDescriptionInput.value = loan.description || '';
            loanInitialAmountInput.value = loan.initial_amount;
            loanCurrentBalanceInput.value = loan.current_balance;
            loanInterestRateInput.value = loan.interest_rate || '';
            loanDueDateInput.value = loan.due_date || '';
            loanStatusInput.value = loan.status || 'pendiente';
            loanReminderEnabledInput.checked = loan.reminder_enabled || false;
            loanNotesInput.value = loan.notes || '';
        } else { // Modo Añadir
            modalTitleLoan.textContent = 'Añadir Nuevo Préstamo';
            loanStatusInput.value = 'pendiente';
        }
        toggleLoanModal(true);
    }
    function closeLoanModal() { toggleLoanModal(false); }

    // --- Funciones Modales (Registrar Cobro) ---
    function toggleCollectionModal(show) {
        if (!addCollectionModal) return;
        if (show) { addCollectionModal.style.display = 'flex'; setTimeout(() => addCollectionModal.classList.add('active'), 10); }
        else { addCollectionModal.classList.remove('active'); setTimeout(() => { addCollectionModal.style.display = 'none'; if (addCollectionForm) addCollectionForm.reset(); if (collectionLoanIdInput) collectionLoanIdInput.value = ''; if (modalCollectionError) { modalCollectionError.textContent = ''; modalCollectionError.style.display = 'none'; } }, 300); }
    }
    function openCollectionModal(loanId, debtorName, currentBalance) {
        if (!addCollectionForm || !collectionLoanIdInput || !collectionLoanDebtorEl || !collectionAmountInput || !collectionDateInput || !collectionAccountInput || !collectionCurrentBalanceEl) { console.error("Error: Elementos del modal de cobro no encontrados."); return; }
        addCollectionForm.reset(); collectionLoanIdInput.value = loanId; collectionLoanDebtorEl.textContent = debtorName; collectionCurrentBalanceEl.textContent = formatCurrency(currentBalance);
        populateSelect(collectionAccountInput, accountsData, 'id', 'name', 'Selecciona cuenta destino...');
        collectionDateInput.valueAsDate = new Date();
        modalCollectionError.style.display = 'none'; saveCollectionButton.disabled = false; saveCollectionButton.textContent = 'Registrar Cobro';
        toggleCollectionModal(true);
        setTimeout(() => collectionAmountInput.focus(), 350);
    }
    function closeCollectionModal() { toggleCollectionModal(false); }

    // --- Funciones Principales ---

    /** Calcula y muestra los totales del footer para Préstamos */
    function displaySummaryLoans(loans) {
        if (!summaryFooter || !totalOwedToUserEl || !totalLoanedActiveEl || !nextDueDateLoanEl) return;
        let totalOwed = 0; let totalLoaned = 0; let nextDue = null;
        const today = new Date(); today.setHours(0, 0, 0, 0);

        loans.forEach(loan => {
            if (loan.status !== 'cobrado') {
                totalOwed += Number(loan.current_balance) || 0;
                totalLoaned += Number(loan.initial_amount) || 0;
                if (loan.due_date) { try { const dueDate = new Date(loan.due_date); const offset = dueDate.getTimezoneOffset(); const adjustedDueDate = new Date(dueDate.getTime() + (offset * 60 * 1000)); adjustedDueDate.setHours(0,0,0,0); if (adjustedDueDate >= today) { if (nextDue === null || adjustedDueDate < nextDue) nextDue = adjustedDueDate; } } catch (e) {} }
            }
        });
        totalOwedToUserEl.textContent = formatCurrency(totalOwed);
        totalLoanedActiveEl.textContent = formatCurrency(totalLoaned);
        nextDueDateLoanEl.textContent = nextDue ? formatDate(nextDue.toISOString().split('T')[0]) : '--/--/----';
        summaryFooter.style.display = loans.length > 0 ? 'grid' : 'none';
    }

    /** Muestra las tarjetas de préstamo */
    function displayLoans(loans) {
        if (!loanList || !noLoansMessage || !loadingLoansMessage) return;
        loanList.innerHTML = '';

        if (!loans || loans.length === 0) { noLoansMessage.style.display = 'block'; loadingLoansMessage.style.display = 'none'; loanList.style.display = 'none'; displaySummaryLoans([]); return; }
        noLoansMessage.style.display = 'none'; loadingLoansMessage.style.display = 'none'; loanList.style.display = 'flex';

        loans.sort((a, b) => { const statusOrder = { 'pendiente': 1, 'parcial': 2, 'cobrado': 3 }; if (statusOrder[a.status] !== statusOrder[b.status]) return statusOrder[a.status] - statusOrder[b.status]; const dateA = a.due_date ? new Date(a.due_date) : new Date('9999-12-31'); const dateB = b.due_date ? new Date(b.due_date) : new Date('9999-12-31'); return dateA - dateB; });

        loans.forEach(loan => {
            const card = document.createElement('div'); card.classList.add('loan-card'); card.setAttribute('data-id', loan.id); card.setAttribute('data-status', loan.status);
            const iconClass = getIconForLoan(loan.description); const statusBadgeClass = getStatusBadgeClassLoan(loan.status); const statusText = getStatusTextLoan(loan.status); const formattedBalance = formatCurrency(loan.current_balance); const formattedDueDate = formatDate(loan.due_date);
            card.innerHTML = `
                <div class="loan-icon-status"><div class="loan-icon-bg"><i class="${iconClass}"></i></div><span class="loan-status-badge ${statusBadgeClass}">${statusText}</span></div>
                <div class="loan-info">
                    <span class="loan-debtor">${loan.debtor}</span>
                    <span class="loan-amount">${formattedBalance}</span>
                    <span class="loan-description">${loan.description || ''}</span>
                    <span class="loan-status-text">${statusText}</span>
                    <span class="loan-date">${formattedDueDate}</span>
                </div>
                <div class="loan-actions">
                    ${loan.status !== 'cobrado' ? `<button class="btn-icon btn-add-collection" aria-label="Registrar Cobro" title="Registrar Cobro" data-id="${loan.id}" data-debtor="${loan.debtor}" data-balance="${loan.current_balance}"><i class="fas fa-hand-holding-usd"></i></button>` : ''}
                    <button class="btn-icon btn-edit-loan" aria-label="Editar" title="Editar Préstamo" data-id="${loan.id}"><i class="fas fa-pencil-alt"></i></button>
                    <button class="btn-icon btn-delete-loan" aria-label="Eliminar" title="Eliminar Préstamo" data-id="${loan.id}"><i class="fas fa-trash-alt"></i></button>
                </div>`;
            loanList.appendChild(card);
        });
        displaySummaryLoans(loans);
    }

    /** Carga los datos iniciales (avatar, préstamos, cuentas, categorías INGRESO) */
    async function loadInitialData(user) {
        if (!user) { /* ... (manejo usuario no logueado) ... */ return; }
        currentUserId = user.id; console.log('Loans.js: Loading data for User ID:', currentUserId);
        if(loadingLoansMessage) loadingLoansMessage.style.display = 'block'; if(noLoansMessage) noLoansMessage.style.display = 'none'; if(loanList) loanList.innerHTML = ''; if(summaryFooter) summaryFooter.style.display = 'none'; if(userAvatarSmall) userAvatarSmall.src = defaultAvatarPath;

        try {
            const [profileRes, loansRes, accountsRes, categoriesRes] = await Promise.all([
                supabase.from('profiles').select('avatar_url').eq('id', currentUserId).single(),
                supabase.from('loans').select('*').eq('user_id', currentUserId).order('status').order('due_date'),
                supabase.from('accounts').select('id, name').eq('user_id', currentUserId).order('name'),
                supabase.from('categories').select('id, name').eq('type', 'ingreso').or(`user_id.eq.${currentUserId},is_default.eq.true`) // Categorías de INGRESO
            ]);

            if (profileRes.error && profileRes.error.code !== 'PGRST116') console.warn('Loans.js: Error avatar:', profileRes.error.message); else if (profileRes.data?.avatar_url && userAvatarSmall) userAvatarSmall.src = profileRes.data.avatar_url;
            if (accountsRes.error) throw accountsRes.error; accountsData = accountsRes.data || [];

            if (categoriesRes.error) throw categoriesRes.error;
            const collectionCategory = (categoriesRes.data || []).find(cat => cat.name.toLowerCase() === COLLECTION_CATEGORY_NAME.toLowerCase());
            if (collectionCategory) collectionCategoryId = collectionCategory.id; else console.warn(`Categoría de INGRESO "${COLLECTION_CATEGORY_NAME}" no encontrada.`);

            if (loansRes.error) throw loansRes.error; loansData = loansRes.data || []; displayLoans(loansData);

        } catch (error) { console.error('Error cargando datos (Loans):', error); if(loadingLoansMessage) loadingLoansMessage.textContent = `Error: ${error.message}`; if(noLoansMessage) noLoansMessage.style.display = 'block'; if(loanList) loanList.innerHTML = ''; displaySummaryLoans([]);
        } finally { if(loadingLoansMessage && loadingLoansMessage.textContent.startsWith('Cargando')) loadingLoansMessage.style.display = 'none'; }
    }

    /** Maneja el envío del formulario de REGISTRAR COBRO */
     async function handleCollectionFormSubmit(event) {
        event.preventDefault();
        if (!supabase || !currentUserId || !addCollectionForm || !saveCollectionButton || !collectionCategoryId) { modalCollectionError.textContent = !collectionCategoryId ? `Error: Categoría "${COLLECTION_CATEGORY_NAME}" no encontrada.` : 'Error inesperado.'; modalCollectionError.style.display = 'block'; console.error("Faltan datos o categoría de cobro:", { collectionCategoryId }); return; }

        const loanId = collectionLoanIdInput.value; const collectionAmount = parseFloat(collectionAmountInput.value); const collectionDate = collectionDateInput.value; const accountId = collectionAccountInput.value; // Cuenta DESTINO del cobro
        const collectionNotes = collectionNotesInput.value.trim() || null; const originalSaveText = saveCollectionButton.textContent;

        if (!loanId || !accountId || !collectionDate || isNaN(collectionAmount) || collectionAmount <= 0) { modalCollectionError.textContent = 'Importe, Fecha y Cuenta Destino son obligatorios.'; modalCollectionError.style.display = 'block'; return; }
        const loan = loansData.find(l => l.id === loanId);
        if (!loan) { modalCollectionError.textContent = 'Error: Préstamo no encontrado.'; modalCollectionError.style.display = 'block'; return; }
        if (collectionAmount > loan.current_balance) { if (!confirm(`Estás registrando un cobro de ${formatCurrency(collectionAmount)}, más de lo pendiente (${formatCurrency(loan.current_balance)}).\n¿Continuar? (Saldo quedará en 0).`)) return; }

        modalCollectionError.style.display = 'none'; saveCollectionButton.disabled = true; saveCollectionButton.textContent = 'Registrando...';

        try {
            // 1. Crear la transacción de INGRESO
            const transactionData = { user_id: currentUserId, account_id: accountId, category_id: collectionCategoryId, type: 'ingreso', description: `Cobro préstamo ${loan.debtor}` + (loan.description ? ` (${loan.description})` : ''), amount: Math.abs(collectionAmount), /* Ingreso siempre positivo */ transaction_date: collectionDate, notes: collectionNotes };
            console.log("Creando transacción de ingreso:", transactionData);
            const { error: txError } = await supabase.from('transactions').insert([transactionData]);
            if (txError) throw new Error(`Error al registrar transacción: ${txError.message}`);
            console.log("Transacción creada.");

            // 2. Actualizar el préstamo
            const currentBalance = Number(loan.current_balance) || 0; const newBalance = Math.max(0, currentBalance - collectionAmount); const newStatus = newBalance <= 0 ? 'cobrado' : loan.status;
            console.log(`Actualizando préstamo ${loanId}: Nuevo Saldo=${newBalance}, Nuevo Estado=${newStatus}`);
            const { error: loanUpdateError } = await supabase.from('loans').update({ current_balance: newBalance, status: newStatus, updated_at: new Date() }).eq('id', loanId).eq('user_id', currentUserId);
            if (loanUpdateError) throw new Error(`Error al actualizar préstamo: ${loanUpdateError.message}`);
            console.log("Préstamo actualizado.");

            alert('Cobro registrado y préstamo actualizado.'); closeCollectionModal(); loadInitialData({ id: currentUserId });

        } catch (error) { console.error('Error procesando cobro de préstamo:', error); modalCollectionError.textContent = `Error: ${error.message}`; modalCollectionError.style.display = 'block';
        } finally { saveCollectionButton.disabled = false; saveCollectionButton.textContent = originalSaveText; }
     }

    /** Maneja el envío del formulario de AÑADIR/EDITAR PRÉSTAMO */
    async function handleLoanFormSubmit(event) {
         event.preventDefault();
         if (!supabase || !currentUserId || !loanForm || !saveLoanButton) return;
         const loanId = loanIdInput.value; const isEditing = !!loanId; const originalSaveText = saveLoanButton.textContent;

         const formData = { user_id: currentUserId, debtor: loanDebtorInput.value.trim(), description: loanDescriptionInput.value.trim() || null, initial_amount: parseFloat(loanInitialAmountInput.value), current_balance: parseFloat(loanCurrentBalanceInput.value), interest_rate: parseFloat(loanInterestRateInput.value) || null, due_date: loanDueDateInput.value || null, status: loanStatusInput.value, reminder_enabled: loanReminderEnabledInput.checked, notes: loanNotesInput.value.trim() || null };

         if (!formData.debtor || isNaN(formData.initial_amount) || formData.initial_amount <= 0 || isNaN(formData.current_balance) || formData.current_balance < 0) { modalLoanError.textContent = 'Deudor, Importe Inicial (>0) y Saldo Pendiente (>=0) son obligatorios.'; modalLoanError.style.display = 'block'; return; }
         if (formData.interest_rate !== null && formData.interest_rate < 0) { modalLoanError.textContent = 'La tasa de interés no puede ser negativa.'; modalLoanError.style.display = 'block'; return; }
         if (!isEditing && formData.current_balance > formData.initial_amount) { modalLoanError.textContent = 'El saldo pendiente no puede ser mayor que el importe inicial al crear.'; modalLoanError.style.display = 'block'; return; }


         modalLoanError.style.display = 'none'; saveLoanButton.disabled = true; saveLoanButton.textContent = isEditing ? 'Guardando...' : 'Creando...';

         try {
             let error;
             if (isEditing) {
                 const { error: updateError } = await supabase.from('loans').update({ debtor: formData.debtor, description: formData.description, initial_amount: formData.initial_amount, current_balance: formData.current_balance, interest_rate: formData.interest_rate, due_date: formData.due_date, status: formData.status, reminder_enabled: formData.reminder_enabled, notes: formData.notes, updated_at: new Date() }).eq('id', loanId).eq('user_id', currentUserId); error = updateError;
             } else { const { error: insertError } = await supabase.from('loans').insert([formData]); error = insertError; }
             if (error) throw error;
             console.log(isEditing ? 'Préstamo actualizado' : 'Préstamo creado'); closeLoanModal(); loadInitialData({ id: currentUserId });
         } catch (error) { console.error('Error guardando préstamo:', error); modalLoanError.textContent = `Error: ${error.message}`; modalLoanError.style.display = 'block';
         } finally { saveLoanButton.disabled = false; saveLoanButton.textContent = originalSaveText; }
     }

    /** Maneja el clic en el botón de eliminar préstamo */
    async function handleDeleteLoan(loanId) {
        if (!supabase || !currentUserId || !loanId) return; const loanToDelete = loansData.find(l => l.id === loanId); if (!loanToDelete) return;
        if (!confirm(`¿Estás SEGURO de que quieres eliminar el préstamo a "${loanToDelete.debtor}" por ${formatCurrency(loanToDelete.initial_amount)}?`)) return;
        console.log('Intentando eliminar préstamo:', loanId);
        try { const { error } = await supabase.from('loans').delete().eq('id', loanId).eq('user_id', currentUserId); if (error) throw error; console.log('Préstamo eliminado'); alert('Préstamo eliminado.'); loadInitialData({ id: currentUserId });
        } catch (error) { console.error('Error eliminando préstamo:', error); alert(`Error: ${error.message}`); }
     }

    // --- Asignación de Event Listeners ---
    document.addEventListener('authReady', (e) => { console.log('Loans.js: Received authReady event.'); loadInitialData(e.detail.user); });
    document.addEventListener('DOMContentLoaded', () => {
        console.log("Loans.js: DOM fully loaded.");
        if (addLoanBtn) addLoanBtn.addEventListener('click', () => openLoanModal());
        if (addLoanFromEmptyBtn) addLoanFromEmptyBtn.addEventListener('click', () => openLoanModal());
        if (backButton) backButton.addEventListener('click', () => { window.location.href = '/Dashboard.html'; });

        // Modal Préstamo Listeners
        if (cancelLoanButton) cancelLoanButton.addEventListener('click', closeLoanModal);
        if (loanModal) loanModal.addEventListener('click', (event) => { if (event.target === loanModal) closeLoanModal(); });
        if (loanForm) loanForm.addEventListener('submit', handleLoanFormSubmit);

        // Modal Cobro Listeners
        if (cancelCollectionButton) cancelCollectionButton.addEventListener('click', closeCollectionModal);
        if (addCollectionModal) addCollectionModal.addEventListener('click', (event) => { if (event.target === addCollectionModal) closeCollectionModal(); });
        if (addCollectionForm) addCollectionForm.addEventListener('submit', handleCollectionFormSubmit);

        // Delegación para acciones en la lista (Cobro, Editar, Eliminar)
        if (loanList) {
            loanList.addEventListener('click', (event) => {
                 const collectionButton = event.target.closest('.btn-add-collection');
                 if(collectionButton) { const loanId = collectionButton.dataset.id; const debtor = collectionButton.dataset.debtor; const balance = parseFloat(collectionButton.dataset.balance); openCollectionModal(loanId, debtor, balance); return; }
                 const editButton = event.target.closest('.btn-edit-loan');
                 if (editButton) { const loanId = editButton.closest('.loan-card')?.dataset.id; const loanToEdit = loansData.find(l => l.id === loanId); if (loanToEdit) openLoanModal(loanToEdit); else console.error('Préstamo no encontrado para editar:', loanId); return; }
                 const deleteButton = event.target.closest('.btn-delete-loan');
                 if (deleteButton) { const loanId = deleteButton.closest('.loan-card')?.dataset.id; handleDeleteLoan(loanId); return; }
            });
        }

        // Scroll to top
        if (scrollTopBtn) { window.addEventListener('scroll', () => { scrollTopBtn.classList.toggle('visible', window.scrollY > 300); }); scrollTopBtn.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); }); }

    }); // Fin DOMContentLoaded
} // Fin del check inicial de Supabase