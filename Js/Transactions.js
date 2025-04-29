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
    const typeToggleTransfer = document.querySelector('#transactionModal input[name="transactionType"][value="transferencia"]');
    const accountSourceGroup = document.getElementById('accountSourceGroup'); // Opcional
    const transactionAccountLabel = document.getElementById('transactionAccountLabel'); // Opcional
    const accountDestinationGroup = document.getElementById('accountDestinationGroup');
    const transactionAccountDestinationInput = document.getElementById('transactionAccountDestination');
    const categoryGroup = document.getElementById('categoryGroup');
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
    // REEMPLAZA tu función openTransactionModal con esta
    function openTransactionModal(defaultType = 'gasto', transaction = null) { // Acepta transaction para edición (aunque no se usa en quick add)
        console.log('--- DEBUG: openTransactionModal Iniciada ---');
        console.log('DEBUG: Accounts:', accounts);
        console.log('DEBUG: Categories:', categories);
        console.log('DEBUG: Cuenta Select Origen:', transactionAccountInput);
        console.log('DEBUG: Cuenta Select Destino:', transactionAccountDestinationInput); // Nuevo
        console.log('DEBUG: Categoria Select:', transactionCategoryInput);


        if (!transactionForm || !modalTitleTransaction || !transactionIdInput || !typeToggleExpense || !typeToggleIncome || !typeToggleTransfer || !transactionAmountInput || !transactionDateInput || !transactionDescriptionInput || !transactionAccountInput || !transactionAccountDestinationInput || !transactionCategoryInput || !transactionNotesInput || !saveTransactionButton || !categoryGroup || !accountDestinationGroup || !transactionAccountLabel) {
            console.error("Error: Elementos clave del modal de transacción no encontrados."); return;
        }

        transactionForm.reset();
        transactionIdInput.value = '';
        modalTransactionError.style.display = 'none';
        saveTransactionButton.disabled = false;
        saveTransactionButton.textContent = 'Guardar'; // Texto genérico inicial

        // Poblar AMBOS desplegables de cuenta
        console.log('DEBUG: Poblando cuenta origen/principal...');
        populateSelect(transactionAccountInput, accounts, 'id', 'name', 'Selecciona origen...');
        console.log('DEBUG: Poblando cuenta destino...');
        populateSelect(transactionAccountDestinationInput, accounts, 'id', 'name', 'Selecciona destino...');

        if (transaction) { // Modo Edición (Simplificado - NO maneja edición de transferencias aún)
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

            // Preseleccionar tipo (Gasto o Ingreso desde Quick Actions)
            if (defaultType === 'ingreso') {
                typeToggleIncome.checked = true;
            } else {
                typeToggleExpense.checked = true; // Gasto por defecto si no es ingreso
            }
            // Actualizar UI según el tipo inicial
            updateModalUI(document.querySelector('input[name="transactionType"]:checked').value);
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
        setTimeout(() => transactionDescriptionInput.focus(), 350);
    }

    /** Cierra el modal de transacción */
    function closeTransactionModal() {
        toggleTransactionModal(false);
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
            fetchTransactions()
            //loadRecentActivity(); // Actualizar widget de actividad
            //loadSummaryData(); // Actualizar widget principal (Gasto Variable Restante)
            // Podrías querer recargar también el saldo total de la página de Cuentas si estuvieras allí
            // if (typeof loadAccountsAndUser === 'function') loadAccountsAndUser(currentUser);
    
    
        } catch (error) {
            console.error(`Error guardando ${type}:`, error);
            modalTransactionError.textContent = `Error: ${error.message}`;
            modalTransactionError.style.display = 'block';
        } finally {
            saveTransactionButton.disabled = false;
            saveTransactionButton.textContent = isEditing ? 'Guardar Cambios' : 'Guardar';
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

         
         // Listener para cambio de Tipo (Ingreso/Gasto/Transferencia) en Modal
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

         console.log("Initializing sidebar...");
         setActiveSidebarLink();             // <--- LLAMADA 1
         addSidebarNavigationListeners(); 

         // Scroll to top
         if (scrollTopBtn) {
             window.addEventListener('scroll', () => { scrollTopBtn.classList.toggle('visible', window.scrollY > 300); });
             scrollTopBtn.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); });
         }

    }); // Fin DOMContentLoaded

} // Fin del check inicial de Supabase