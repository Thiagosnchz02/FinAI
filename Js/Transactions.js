// transactions.js
// ASEGÚRATE que supabase-init.js y auth-listener.js se cargaron antes

console.log('DEBUG: transactions.js - Cargado');

if (typeof supabase === 'undefined' || supabase === null) {
    console.error('Transactions.js: ¡Error Crítico! Cliente Supabase no inicializado.');
    // Podríamos intentar mostrar un error en el cuerpo de la tabla o en un div general
    const tableLoadingMessage = document.getElementById('tableLoadingMessage');
    if (tableLoadingMessage) tableLoadingMessage.textContent = 'Error crítico: Fallo de inicialización.';

} else {
    console.log('Transactions.js: Cliente Supabase encontrado. Procediendo...');

    // --- Selección de Elementos DOM ---
    const backButton = document.getElementById('backButton');
    const userAvatarSmall = document.getElementById('userAvatarSmall');
    const addTransactionBtn = document.getElementById('addTransactionBtn');
    // Filtros
    const filterYear = document.getElementById('filterYear');
    const filterDateRange = document.getElementById('filterDateRange');
    const filterType = document.getElementById('filterType');
    const filterAccount = document.getElementById('filterAccount');
    const filterCategory = document.getElementById('filterCategory');
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    // Tabla
    const transactionsTableBody = document.getElementById('transactionsTableBody');
    const tableLoadingMessage = document.getElementById('tableLoadingMessage');
    const noTransactionsMessage = document.getElementById('noTransactionsMessage');
    // Modal
    const transactionModal = document.getElementById('transactionModal');
    const transactionForm = document.getElementById('transactionForm');
    const modalTitleTransaction = document.getElementById('modalTitleTransaction');
    const transactionIdInput = document.getElementById('transactionId');
    const typeToggleExpense = document.querySelector('input[name="transactionType"][value="gasto"]');
    const typeToggleIncome = document.querySelector('input[name="transactionType"][value="ingreso"]');
    // Inputs del Modal
    const transactionAmountInput = document.getElementById('transactionAmount');
    const transactionDateInput = document.getElementById('transactionDate');
    const transactionDescriptionInput = document.getElementById('transactionDescription');
    const transactionAccountInput = document.getElementById('transactionAccount');
    const transactionCategoryInput = document.getElementById('transactionCategory');
    const transactionNotesInput = document.getElementById('transactionNotes');
    const cancelTransactionButton = document.getElementById('cancelTransactionButton');
    const saveTransactionButton = document.getElementById('saveTransactionButton');
    const modalTransactionError = document.getElementById('modalTransactionError');
    // Otros
    const scrollTopBtn = document.getElementById('scrollTopBtn');

    // --- Variables de Estado ---
    let currentUserId = null;
    let accounts = []; // Cache local de cuentas del usuario
    let categories = []; // Cache local de categorías (default + usuario)
    let transactions = []; // Cache local de transacciones mostradas
    let currentFilters = { // Filtros aplicados actualmente
        year: 'all', dateRange: 'all', type: 'all', accountId: 'all', categoryId: 'all'
    };
     let currentSort = { // Ordenación actual
         column: 'transaction_date', ascending: false // Más reciente primero
     };

    // --- URL Avatar por Defecto ---
    const defaultAvatarPath = 'https://finai.es/images/avatar_predeterminado.png'; // URL Correcta!

    // --- Funciones Auxiliares ---
    function formatCurrency(value, currency = 'EUR') {
        if (isNaN(value) || value === null) return 'N/A';
        return new Intl.NumberFormat('es-ES', { style: 'currency', currency: currency, minimumFractionDigits: 2 }).format(value);
    }
    const iconMap = { /* ... (el mismo mapeo de categories.js o mover a común) ... */ };
    function getIconClass(iconKeyword) { return iconMap[iconKeyword?.toLowerCase()] || (iconKeyword?.startsWith('fa') ? iconKeyword : 'fas fa-tag') ; }
    function formatDate(dateString) {
        if (!dateString) return '';
        try { const date = new Date(dateString); if (isNaN(date.getTime())) return '';
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear(); return `${day}/${month}/${year}`;
        } catch (e) { console.error("Error formateando fecha:", dateString, e); return ''; }
    }

    /** Llena un <select> con opciones */
    function populateSelect(selectElement, items, valueField = 'id', textField = 'name', defaultOptionText = 'Selecciona...', includeAllOption = false, allOptionText = 'Todos/as') {
        if (!selectElement) return; selectElement.innerHTML = '';
        if (includeAllOption) { const allOpt = document.createElement('option'); allOpt.value = 'all'; allOpt.textContent = allOptionText; selectElement.appendChild(allOpt); }
        if (defaultOptionText) { const defaultOpt = document.createElement('option'); defaultOpt.value = ''; defaultOpt.textContent = defaultOptionText; defaultOpt.disabled = true; if (!includeAllOption) defaultOpt.selected = true; selectElement.appendChild(defaultOpt); }
        items.forEach(item => { const option = document.createElement('option'); option.value = item[valueField]; option.textContent = item[textField]; selectElement.appendChild(option); });
    }

    /** Llena el select de categorías del modal filtrando por tipo Ingreso/Gasto */
    function populateCategoryFilter(transactionType = 'gasto') {
         if (!transactionCategoryInput || !categories) return;
         const filteredForType = categories.filter(cat => cat.type === transactionType);
         populateSelect(transactionCategoryInput, filteredForType, 'id', 'name', '(Sin categoría)', false); // No añadir "Todos" ni "Selecciona"
         const emptyOpt = document.createElement('option'); // Añadir explícitamente "(Sin categoría)"
         emptyOpt.value = ""; emptyOpt.textContent = "(Sin categoría)";
         transactionCategoryInput.prepend(emptyOpt); // Poner al principio
         transactionCategoryInput.value = ""; // Seleccionar por defecto
    }

    // --- Funciones Modales ---
    /** Muestra u oculta el modal con animación */
    function toggleTransactionModal(show) {
        if (!transactionModal) return;
        if (show) {
            transactionModal.style.display = 'flex';
            setTimeout(() => transactionModal.classList.add('active'), 10);
        } else {
            transactionModal.classList.remove('active');
            setTimeout(() => {
                transactionModal.style.display = 'none';
                if (transactionForm) transactionForm.reset();
                if (transactionIdInput) transactionIdInput.value = '';
                if (modalTransactionError) {
                     modalTransactionError.textContent = '';
                     modalTransactionError.style.display = 'none';
                }
                // Resetear toggle a Gasto
                if(typeToggleExpense) typeToggleExpense.checked = true;
                document.querySelectorAll('.type-toggle label').forEach(label => label.classList.remove('active'));
                if(typeToggleExpense) typeToggleExpense.parentElement.classList.add('active');

            }, 300);
        }
    }

    /** Abre el modal para añadir o editar una transacción */
    function openTransactionModal(transaction = null) {
        // Verificar que todos los elementos del modal existen
        if (!transactionForm || !modalTitleTransaction || !transactionIdInput || !typeToggleExpense || !typeToggleIncome || !transactionAmountInput || !transactionDateInput || !transactionDescriptionInput || !transactionAccountInput || !transactionCategoryInput || !transactionNotesInput || !saveTransactionButton) {
            console.error("Error: Elementos del modal de transacción no encontrados."); return; }

        transactionForm.reset();
        transactionIdInput.value = '';
        modalTransactionError.style.display = 'none';
        saveTransactionButton.disabled = false;
        saveTransactionButton.textContent = 'Guardar Transacción';

        if (transaction) { // Modo Edición
            modalTitleTransaction.textContent = 'Editar Transacción';
            transactionIdInput.value = transaction.id;
            transactionAmountInput.value = Math.abs(transaction.amount); // Mostrar siempre positivo en el input
            transactionDateInput.value = transaction.transaction_date ? transaction.transaction_date.split('T')[0] : ''; // Formato YYYY-MM-DD
            transactionDescriptionInput.value = transaction.description || '';
            transactionAccountInput.value = transaction.account_id || '';
            transactionNotesInput.value = transaction.notes || '';

            // Seleccionar tipo correcto y poblar categorías
            if (transaction.type === 'ingreso') {
                typeToggleIncome.checked = true;
                typeToggleIncome.parentElement.classList.add('active');
                typeToggleExpense.parentElement.classList.remove('active');
                populateCategoryFilter('ingreso');
            } else { // Gasto o Transferencia por defecto
                typeToggleExpense.checked = true;
                typeToggleExpense.parentElement.classList.add('active');
                typeToggleIncome.parentElement.classList.remove('active');
                populateCategoryFilter('gasto');
            }
             // Seleccionar categoría guardada
             transactionCategoryInput.value = transaction.category_id || '';

        } else { // Modo Añadir
            modalTitleTransaction.textContent = 'Añadir Transacción';
            typeToggleExpense.checked = true; // Gasto por defecto
            typeToggleExpense.parentElement.classList.add('active');
            typeToggleIncome.parentElement.classList.remove('active');
            transactionDateInput.valueAsDate = new Date(); // Fecha de hoy por defecto
            populateCategoryFilter('gasto'); // Poblar con categorías de gasto
        }
        toggleTransactionModal(true);
    }

    /** Cierra el modal de transacción */
    function closeTransactionModal() {
        toggleTransactionModal(false);
    }

    // --- Funciones Principales ---

     /** Muestra las filas de transacciones en la tabla */
     function displayTransactions(transactionsToDisplay) {
         if (!transactionsTableBody || !noTransactionsMessage || !tableLoadingMessage) return;
         transactionsTableBody.innerHTML = ''; // Limpiar tabla

         if (!transactionsToDisplay || transactionsToDisplay.length === 0) {
             noTransactionsMessage.style.display = 'block';
             tableLoadingMessage.parentElement.style.display = 'none';
             return;
         }

         noTransactionsMessage.style.display = 'none';
         tableLoadingMessage.parentElement.style.display = 'none';

         transactionsToDisplay.forEach(tx => {
             const row = document.createElement('tr');
             row.setAttribute('data-id', tx.id);

             const amountClass = tx.type === 'ingreso' ? 'income' : (tx.type === 'gasto' ? 'expense' : 'transfer');
             // Usar valor absoluto y añadir signo manualmente para claridad
             const displayAmount = Math.abs(tx.amount);
             const amountSign = tx.type === 'ingreso' ? '+' : '-';
             const formattedAmount = formatCurrency(displayAmount, tx.accounts?.currency || 'EUR'); // Usar moneda de la cuenta si está disponible

             const accountName = tx.accounts?.name || 'N/A';
             const categoryName = tx.categories?.name || '(Sin Categoría)';
             const categoryIcon = getIconClass(tx.categories?.icon);

             row.innerHTML = `
                 <td><span class="trans-date">${formatDate(tx.transaction_date)}</span></td>
                 <td><span class="trans-desc">${tx.description || '-'}</span></td>
                 <td><span class="trans-cat"><i class="${categoryIcon}"></i> ${categoryName}</span></td>
                 <td><span class="trans-acc">${accountName}</span></td>
                 <td class="amount-col"><span class="trans-amount ${amountClass}">${amountSign}${formattedAmount}</span></td>
                 <td>
                     <button class="btn-icon btn-edit" aria-label="Editar" data-id="${tx.id}"><i class="fas fa-pencil-alt"></i></button>
                     <button class="btn-icon btn-delete" aria-label="Eliminar" data-id="${tx.id}"><i class="fas fa-trash-alt"></i></button>
                 </td>
             `;
             transactionsTableBody.appendChild(row);
         });
     }

    /** Obtiene las transacciones de Supabase aplicando filtros y orden */
    async function fetchTransactions() {
        if (!supabase || !currentUserId) {
            console.error("Supabase o User ID no disponibles para fetchTransactions");
            if(tableLoadingMessage) tableLoadingMessage.textContent = 'Error: No hay sesión activa.';
            return;
        }
        if(tableLoadingMessage) {
            tableLoadingMessage.textContent = 'Cargando transacciones...';
            tableLoadingMessage.parentElement.style.display = 'table-footer-group';
        }
        noTransactionsMessage.style.display = 'none'; // Ocultar mensaje de no hay mientras carga


        try {
            let query = supabase
                .from('transactions')
                .select(`
                    id,
                    user_id,
                    account_id,
                    category_id,
                    type,
                    description,
                    amount,
                    transaction_date,
                    notes,
                    created_at,
                    accounts ( name, currency ),
                    categories ( name, icon )
                `) // JOIN explícito
                .eq('user_id', currentUserId);

            // Aplicar Filtros
            if (currentFilters.type !== 'all') query = query.eq('type', currentFilters.type);
            if (currentFilters.accountId !== 'all') query = query.eq('account_id', currentFilters.accountId);
            if (currentFilters.categoryId !== 'all') {
                 if (currentFilters.categoryId === 'none') query = query.is('category_id', null);
                 else query = query.eq('category_id', currentFilters.categoryId);
            }
            // TODO: Implementar filtros de fecha basados en currentFilters.dateRange / year

            // Aplicar Ordenación
            query = query.order(currentSort.column, { ascending: currentSort.ascending });

            query = query.limit(100); // Límite temporal

            console.log("Ejecutando query de transacciones...");
            const { data, error } = await query;

            if (error) throw error;

            console.log("Transacciones recibidas:", data);
            transactions = data; // Guardar localmente
            displayTransactions(transactions);

        } catch (error) {
            console.error("Error fetching transactions:", error);
             if(tableLoadingMessage) tableLoadingMessage.textContent = `Error al cargar: ${error.message}`;
            noTransactionsMessage.textContent = `Error al cargar transacciones: ${error.message}`;
            noTransactionsMessage.style.display = 'block';
            if (error.message.includes('CORS')) {
                alert('Error de CORS al cargar transacciones. Revisa la configuración en Supabase.');
            }
        }
    }

    /** Carga los datos iniciales (avatar, cuentas, categorías) */
    async function loadInitialData(user) {
         if (!user) {
             console.log("Transactions.js: No user session, skipping initial data load.");
             if(tableLoadingMessage) tableLoadingMessage.textContent = 'Inicia sesión para ver transacciones.';
             return;
         }
         currentUserId = user.id;
         console.log("Transactions.js: Loading initial data for user:", currentUserId);

         if(userAvatarSmall) userAvatarSmall.src = defaultAvatarPath;

          try {
              const [profileRes, accountsRes, categoriesRes] = await Promise.all([
                  supabase.from('profiles').select('avatar_url').eq('id', currentUserId).single(),
                  supabase.from('accounts').select('id, name').eq('user_id', currentUserId).order('name'),
                  supabase.from('categories').select('id, name, type').or(`user_id.eq.${currentUserId},is_default.eq.true`).order('name')
              ]);

              // Avatar
              if (userAvatarSmall) userAvatarSmall.src = profileRes.data?.avatar_url || defaultAvatarPath;

              // Cuentas
              if (accountsRes.error) throw accountsRes.error;
              accounts = accountsRes.data || [];
              populateSelect(filterAccount, accounts, 'id', 'name', 'Todas Cuentas', true, 'Todas Cuentas'); // Rellenar filtro
              populateSelect(transactionAccountInput, accounts, 'id', 'name', 'Selecciona cuenta...'); // Rellenar modal

              // Categorías
              if (categoriesRes.error) throw categoriesRes.error;
              categories = categoriesRes.data || [];
              populateSelect(filterCategory, categories, 'id', 'name', 'Todas Categorías', true, 'Todas Categorías');
               const noCatOpt = document.createElement('option');
               noCatOpt.value = "none"; noCatOpt.textContent = "(Sin Categoría)";
               if (filterCategory) filterCategory.appendChild(noCatOpt);
              // Rellenar modal inicialmente con 'gasto'
              populateCategoryFilter('gasto');

              // Cargar las transacciones iniciales
              await fetchTransactions();

          } catch (error) {
              console.error("Error cargando datos iniciales:", error);
              if(tableLoadingMessage) tableLoadingMessage.textContent = `Error inicial: ${error.message}`;
              if (error.message.includes('CORS')) {
                  alert('Error de CORS al cargar datos iniciales. Revisa la configuración en Supabase.');
              }
          }
    }

     /** Maneja el envío del formulario del modal (Añadir/Editar Transacción) */
     async function handleTransactionFormSubmit(event) {
         event.preventDefault();
         if (!supabase || !currentUserId || !transactionForm || !saveTransactionButton) return;

         const transactionId = transactionIdInput.value;
         const isEditing = !!transactionId;
         const originalSaveText = saveTransactionButton.textContent;

         // Obtener datos del formulario
         const type = document.querySelector('input[name="transactionType"]:checked').value;
         const amount = parseFloat(transactionAmountInput.value);
         // Asegurar que el monto sea negativo para gastos, positivo para ingresos
         const signedAmount = type === 'gasto' ? -Math.abs(amount) : Math.abs(amount);
         const transaction_date = transactionDateInput.value; // Formato YYYY-MM-DD
         const description = transactionDescriptionInput.value.trim();
         const account_id = transactionAccountInput.value || null;
         const category_id = transactionCategoryInput.value || null; // Guardar null si es "Sin categoría"
         const notes = transactionNotesInput.value.trim() || null;

         // Validaciones
         if (isNaN(signedAmount)) { modalTransactionError.textContent = 'El importe debe ser un número válido.'; modalTransactionError.style.display = 'block'; return; }
         if (!transaction_date) { modalTransactionError.textContent = 'La fecha es obligatoria.'; modalTransactionError.style.display = 'block'; return; }
         if (!description) { modalTransactionError.textContent = 'La descripción es obligatoria.'; modalTransactionError.style.display = 'block'; return; }
         if (!account_id) { modalTransactionError.textContent = 'Debes seleccionar una cuenta.'; modalTransactionError.style.display = 'block'; return; }
         modalTransactionError.style.display = 'none';
         saveTransactionButton.disabled = true;
         saveTransactionButton.textContent = isEditing ? 'Guardando...' : 'Creando...';

         try {
             const transactionData = {
                 // user_id se infiere por RLS en update/insert
                 account_id: account_id,
                 category_id: category_id,
                 type: type,
                 description: description,
                 amount: signedAmount,
                 transaction_date: transaction_date,
                 notes: notes
             };

             let error;
             if (isEditing) {
                 // UPDATE
                 const { error: updateError } = await supabase
                     .from('transactions')
                     .update(transactionData)
                     .eq('id', transactionId)
                     .eq('user_id', currentUserId); // Asegurar RLS
                 error = updateError;
             } else {
                 // INSERT
                 transactionData.user_id = currentUserId; // Añadir user_id explícitamente
                 const { error: insertError } = await supabase.from('transactions').insert([transactionData]);
                 error = insertError;
             }
             if (error) throw error;

             console.log(isEditing ? 'Transacción actualizada' : 'Transacción creada');
             closeTransactionModal();
             fetchTransactions(); // Recargar lista

         } catch (error) {
              console.error('Error guardando transacción:', error);
              modalTransactionError.textContent = `Error: ${error.message}`;
              modalTransactionError.style.display = 'block';
         } finally {
             saveTransactionButton.disabled = false;
             saveTransactionButton.textContent = originalSaveText;
         }
     }

     /** Maneja el clic en el botón de eliminar transacción */
     async function handleDeleteTransaction(transactionId) {
         if (!supabase || !currentUserId) return;
         const transactionToDelete = transactions.find(tx => tx.id === transactionId); // Para mostrar nombre
         if (!transactionToDelete) return;

         if (!confirm(`¿Estás SEGURO de que quieres eliminar la transacción "${transactionToDelete.description || 'Sin descripción'}" del ${formatDate(transactionToDelete.transaction_date)}?\n¡Esta acción no se puede deshacer!`)) {
             return;
         }

         console.log('Intentando eliminar transacción:', transactionId);
         try {
              const { error } = await supabase
                 .from('transactions')
                 .delete()
                 .eq('id', transactionId)
                 .eq('user_id', currentUserId); // Asegurar RLS

             if (error) throw error;

             console.log('Transacción eliminada con éxito');
             alert('Transacción eliminada.');
             fetchTransactions(); // Recargar lista

         } catch (error) {
             console.error('Error eliminando transacción:', error);
             alert(`Error al eliminar la transacción: ${error.message}`);
         }
     }

     /** Actualiza filtros y recarga transacciones */
     function applyFilters() {
         console.log("Aplicando filtros...");
         if (filterYear) currentFilters.year = filterYear.value;
         if (filterDateRange) currentFilters.dateRange = filterDateRange.value;
         if (filterType) currentFilters.type = filterType.value;
         if (filterAccount) currentFilters.accountId = filterAccount.value;
         if (filterCategory) currentFilters.categoryId = filterCategory.value;
         fetchTransactions(); // Llama a fetch con los nuevos filtros
     }

    // --- Asignación de Event Listeners ---

    document.addEventListener('authReady', (e) => {
        console.log('Transactions.js: Received authReady event.');
        loadInitialData(e.detail.user);
    });

    document.addEventListener('DOMContentLoaded', () => {
         console.log("Transactions.js: DOM fully loaded.");

         if (addTransactionBtn) addTransactionBtn.addEventListener('click', () => openTransactionModal());
         if (backButton) backButton.addEventListener('click', () => { window.location.href = '/Dashboard.html'; });
         if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', applyFilters);
         // Podrías añadir listeners 'change' a los selects para auto-filtrar si quieres

         // Modal Listeners
         if (cancelTransactionButton) cancelTransactionButton.addEventListener('click', closeTransactionModal);
         if (transactionModal) transactionModal.addEventListener('click', (event) => { if (event.target === transactionModal) closeTransactionModal(); });
         if (transactionForm) transactionForm.addEventListener('submit', handleTransactionFormSubmit);

         // Listener para cambio de Tipo (Ingreso/Gasto) en Modal
         if (typeToggleExpense && typeToggleIncome && transactionCategoryInput) {
             const typeRadios = [typeToggleExpense, typeToggleIncome];
             typeRadios.forEach(radio => {
                 radio.addEventListener('change', () => {
                    // Actualizar estilo visual
                    document.querySelectorAll('.type-toggle label').forEach(label => label.classList.remove('active'));
                    radio.parentElement.classList.add('active');
                    // Repoblar categorías
                    populateCategoryFilter(radio.value);
                 });
             });
         }

         // Delegación para Editar/Eliminar en Tabla
         if (transactionsTableBody) {
             transactionsTableBody.addEventListener('click', (event) => {
                 const editButton = event.target.closest('.btn-edit');
                 if (editButton) {
                     const transactionId = editButton.dataset.id;
                     const transactionToEdit = transactions.find(tx => tx.id === transactionId);
                     if (transactionToEdit) openTransactionModal(transactionToEdit);
                     else console.error('No se encontró la transacción para editar con ID:', transactionId);
                     return;
                 }
                 const deleteButton = event.target.closest('.btn-delete');
                 if (deleteButton) {
                     const transactionId = deleteButton.dataset.id;
                     handleDeleteTransaction(transactionId);
                     return;
                 }
             });
         }

         // Scroll to top
         if (scrollTopBtn) {
             window.addEventListener('scroll', () => { scrollTopBtn.classList.toggle('visible', window.scrollY > 300); });
             scrollTopBtn.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); });
         }

    }); // Fin DOMContentLoaded

} // Fin del check inicial de Supabase