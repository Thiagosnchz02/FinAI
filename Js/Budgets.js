// budgets.js
// ASEGÚRATE que supabase-init.js y auth-listener.js se cargaron antes

console.log('DEBUG: budgets.js - Cargado');

if (typeof supabase === 'undefined' || supabase === null) {
    console.error('Budgets.js: ¡Error Crítico! Cliente Supabase no inicializado.');
} else {
    console.log('Budgets.js: Cliente Supabase encontrado. Procediendo...');

    // --- Selección de Elementos DOM ---
    const backButton = document.getElementById('backButton');
    const userAvatarSmall = document.getElementById('userAvatarSmall');
    const addBudgetBtn = document.getElementById('addBudgetBtn');
    const monthYearPicker = document.getElementById('monthYearPicker');
    const totalBudgetedEl = document.getElementById('totalBudgeted');
    const totalSpentEl = document.getElementById('totalSpent');
    const totalRemainingEl = document.getElementById('totalRemaining');
    const budgetList = document.getElementById('budgetList');
    const loadingBudgetsMessage = document.getElementById('loadingBudgetsMessage');
    const noBudgetsMessage = document.getElementById('noBudgetsMessage');
    // Modal elements
    const budgetModal = document.getElementById('budgetModal');
    const budgetForm = document.getElementById('budgetForm');
    const modalTitleBudget = document.getElementById('modalTitleBudget');
    const budgetIdInput = document.getElementById('budgetId');
    const budgetPeriodInput = document.getElementById('budgetPeriod'); // Guardará YYYY-MM
    const budgetCategoryInput = document.getElementById('budgetCategory');
    const budgetAmountInput = document.getElementById('budgetAmount');
    const cancelBudgetButton = document.getElementById('cancelBudgetButton');
    const saveBudgetButton = document.getElementById('saveBudgetButton');
    const modalBudgetError = document.getElementById('modalBudgetError');
    // Otros
    const scrollTopBtn = document.getElementById('scrollTopBtn');

    // --- Variables de Estado ---
    let currentUserId = null;
    let categories = []; // Cache de categorías de GASTO
    let currentBudgets = []; // Presupuestos del periodo actual
    let currentSpending = {}; // Objeto para guardar gasto por category_id { category_id: total_gastado }
    let selectedPeriod = ''; // Formato YYYY-MM

    // --- URL Avatar por Defecto ---
    const defaultAvatarPath = 'https://finai.es/images/avatar_predeterminado.png';

    // --- Funciones Auxiliares ---
    function formatCurrency(value, currency = 'EUR') {
        if (isNaN(value) || value === null) return '€0.00'; // Devuelve 0 si no es válido
        try {
            return new Intl.NumberFormat('es-ES', { style: 'currency', currency: currency, minimumFractionDigits: 2 }).format(value);
        } catch (e) {
             console.error("Error formatting currency:", value, currency, e);
             // Fallback a formato simple si falla (ej: moneda no válida)
             return `${Number(value).toFixed(2)} ${currency}`;
        }
    }
    
    const iconMap = { /* ... (puedes copiar el mismo mapeo de categories.js) ... */ };
    function getIconClass(iconKeyword) { return iconMap[iconKeyword?.toLowerCase()] || (iconKeyword?.startsWith('fa') ? iconKeyword : 'fas fa-tag') ; }

    function getIconClass(iconKeyword) { /* ... (igual que antes) ... */ }
    function populateSelect(selectElement, items, valueField = 'id', textField = 'name', defaultOptionText = 'Selecciona...', includeAllOption = false, allOptionText = 'Todos/as', firstOptionValue = '') {
        if (!selectElement) { console.error("populateSelect: Elemento select no encontrado"); return; }
        selectElement.innerHTML = ''; // Limpiar siempre
        let hasDefaultSelected = false;
        if (includeAllOption) { const allOpt = document.createElement('option'); allOpt.value = 'all'; allOpt.textContent = allOptionText; selectElement.appendChild(allOpt); }
        if (defaultOptionText) { const defaultOpt = document.createElement('option'); defaultOpt.value = firstOptionValue; defaultOpt.textContent = defaultOptionText; defaultOpt.disabled = (firstOptionValue === ''); defaultOpt.selected = (firstOptionValue === ''); if(defaultOpt.selected) hasDefaultSelected = true; selectElement.appendChild(defaultOpt); }
        items.forEach(item => { const option = document.createElement('option'); option.value = item[valueField]; option.textContent = item[textField]; selectElement.appendChild(option); });
         // Si ninguna opción por defecto fue seleccionada y hay una opción vacía, seleccionarla
         if (!hasDefaultSelected && firstOptionValue === '' && selectElement.options.length > (includeAllOption ? 1 : 0)) {
              selectElement.value = '';
         }
    }
    // --- Funciones Modales ---
    function toggleBudgetModal(show) {
        if (!budgetModal) return;
        if (show) {
            budgetModal.style.display = 'flex';
            setTimeout(() => budgetModal.classList.add('active'), 10);
        } else {
            budgetModal.classList.remove('active');
            setTimeout(() => {
                budgetModal.style.display = 'none';
                if (budgetForm) budgetForm.reset();
                if (budgetIdInput) budgetIdInput.value = '';
                if (budgetPeriodInput) budgetPeriodInput.value = '';
                if (modalBudgetError) {
                     modalBudgetError.textContent = '';
                     modalBudgetError.style.display = 'none';
                }
                if (budgetCategoryInput) budgetCategoryInput.disabled = false; // Habilitar por defecto
            }, 300);
        }
    }
    function openBudgetModal(budget = null) {
        console.log('--- Intentando abrir modal presupuesto ---'); // <--- AÑADE ESTO
        console.log('Array global categories en este punto:', categories);
        if (!budgetForm || !modalTitleBudget || !budgetIdInput || !budgetCategoryInput || !budgetAmountInput || !saveBudgetButton || !budgetPeriodInput) {
             console.error("Error: Elementos del modal de presupuesto no encontrados."); return; }

        budgetForm.reset();
        budgetIdInput.value = '';
        budgetPeriodInput.value = selectedPeriod; // Guardar periodo actual
        modalBudgetError.style.display = 'none';
        saveBudgetButton.disabled = false;
        saveBudgetButton.textContent = 'Guardar Presupuesto';
        budgetCategoryInput.disabled = false; // Habilitado por defecto

        // Poblar categorías de GASTO que AÚN NO tengan presupuesto este mes
        const budgetedCategoryIds = currentBudgets.map(b => b.category_id);
        console.log('Filtrando categorías desde:', categories);
        console.log('IDs ya presupuestados:', budgetedCategoryIds);
        console.log('Inspeccionando contenido del array categories:');
        categories.forEach((cat, index) => {
            // Mostramos los campos clave para cada categoría
            console.log(`  Cat[${index}]: id=${cat.id}, name=${cat.name}, type=${cat.type}`); // <-- ESTE LOG ES IMPORTANTE
        });
        const availableCategories = categories.filter(cat =>
             cat.type === 'gasto' && (budget ? cat.id === budget.category_id : !budgetedCategoryIds.includes(cat.id)) // Mostrar solo la actual si editamos, o las no presupuestadas si añadimos
        );
        console.log('Categorías disponibles para el select:', availableCategories); // <--- AÑADE ESTO (¿Está vacío?)

        console.log('Elemento select destino:', budgetCategoryInput);
        populateSelect(budgetCategoryInput, availableCategories, 'id', 'name', 'Selecciona categoría...');

        if (budget) { // Modo Edición
            modalTitleBudget.textContent = 'Editar Presupuesto';
            budgetIdInput.value = budget.id;
            budgetCategoryInput.value = budget.category_id;
            budgetAmountInput.value = budget.amount;
            budgetCategoryInput.disabled = true; // No permitir cambiar categoría al editar (más simple)
        } else { // Modo Añadir
            modalTitleBudget.textContent = `Añadir Presupuesto (${selectedPeriod})`; // Mostrar periodo
            budgetCategoryInput.disabled = false;
        }
        toggleBudgetModal(true);
    }
    function closeBudgetModal() { toggleBudgetModal(false); }

    // --- Funciones Principales ---

    /** Calcula el gasto total por categoría para el periodo dado */
    async function calculateSpendingForPeriod(startDate, endDate) {
        if (!supabase || !currentUserId) return {};
        console.log(`Calculando gastos entre ${startDate} y ${endDate}`);
        try {
            // ¡NECESITA CORS!
            const { data, error } = await supabase
                .from('transactions')
                .select('amount, category_id')
                .eq('user_id', currentUserId)
                .eq('type', 'gasto')
                .not('category_id', 'is', null)
                .gte('transaction_date', startDate)
                .lte('transaction_date', endDate);

            if (error) throw error;

            const spendingMap = {};
            if (data) {
                data.forEach(tx => {
                    const categoryId = tx.category_id;
                    const amount = Math.abs(tx.amount); // Siempre positivo para sumar gasto
                    spendingMap[categoryId] = (spendingMap[categoryId] || 0) + amount;
                });
            }
            console.log("Gasto calculado por categoría:", spendingMap);
            return spendingMap;

        } catch (error) {
            console.error("Error calculando gastos:", error);
            throw error; // Relanzar para que loadBudgetsAndSpending lo capture
        }
    }

    /** Muestra las tarjetas de presupuesto */
    function displayBudgets(budgets) {
        if (!budgetList || !noBudgetsMessage || !loadingBudgetsMessage || !totalBudgetedEl || !totalSpentEl || !totalRemainingEl) return;

        budgetList.innerHTML = '';
        let totalBudgeted = 0;
        let totalSpentSum = 0;

        if (!budgets || budgets.length === 0) {
            noBudgetsMessage.style.display = 'block';
            loadingBudgetsMessage.style.display = 'none';
            budgetList.style.display = 'none'; // Ocultar grid
            totalBudgetedEl.textContent = formatCurrency(0);
            totalSpentEl.textContent = formatCurrency(0);
            totalRemainingEl.textContent = formatCurrency(0);
            totalRemainingEl.className = ''; // Resetear clase de color
            return;
        }

        noBudgetsMessage.style.display = 'none';
        loadingBudgetsMessage.style.display = 'none';
        budgetList.style.display = 'grid';

        budgets.forEach(b => {
            const category = categories.find(c => c.id === b.category_id);
            const spent = currentSpending[b.category_id] || 0; // Gasto de este mes para esta categoría
            const remaining = b.amount - spent;
            const percentage = b.amount > 0 ? Math.min((spent / b.amount) * 100, 100) : 0; // Evitar división por cero y capar a 100%

            totalBudgeted += Number(b.amount) || 0;
            totalSpentSum += spent;

            const card = document.createElement('div');
            card.classList.add('budget-card');
            card.setAttribute('data-id', b.id);
            card.setAttribute('data-category-id', b.category_id);

            const iconClass = getIconClass(category?.icon);
            const categoryName = category?.name || 'Categoría Desconocida';
            const remainingClass = remaining >= 0 ? 'positive' : 'negative';
            let progressBarColor = '#48bb78'; // Verde
            if (percentage >= 95) progressBarColor = '#f56565'; // Rojo
            else if (percentage >= 75) progressBarColor = '#ecc94b'; // Amarillo

            card.innerHTML = `
                <div class="card-header">
                    <span class="category-icon"><i class="${iconClass}"></i></span>
                    <h3 class="category-name">${categoryName}</h3>
                </div>
                <div class="card-body">
                    <div class="budget-amounts">
                        <div>Presupuestado: <span class="amount budgeted">${formatCurrency(b.amount)}</span></div>
                        <div>Gastado: <span class="amount spent">${formatCurrency(spent)}</span></div>
                        <div>Restante: <span class="amount remaining ${remainingClass}">${formatCurrency(remaining)}</span></div>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: ${percentage}%; background-color: ${progressBarColor};"></div>
                    </div>
                </div>
                <div class="card-actions">
                    <button class="btn-icon btn-edit" aria-label="Editar" data-id="${b.id}"><i class="fas fa-pencil-alt"></i></button>
                    <button class="btn-icon btn-delete" aria-label="Eliminar" data-id="${b.id}"><i class="fas fa-trash-alt"></i></button>
                </div>
            `;
            budgetList.appendChild(card);
        });

        // Actualizar Resumen Total
        const totalRemaining = totalBudgeted - totalSpentSum;
        totalBudgetedEl.textContent = formatCurrency(totalBudgeted);
        totalSpentEl.textContent = formatCurrency(totalSpentSum);
        totalRemainingEl.textContent = formatCurrency(totalRemaining);
        totalRemainingEl.className = totalRemaining >= 0 ? 'positive' : 'negative';
    }


    /** Carga los presupuestos y gastos para el periodo seleccionado */
    async function loadBudgetsAndSpending(period) { // period es YYYY-MM
        if (!supabase || !currentUserId || !period) {
             console.error("Faltan datos para cargar presupuestos:", { supabase, currentUserId, period });
             if (loadingBudgetsMessage) loadingBudgetsMessage.textContent = 'Error: Periodo inválido.';
             return;
         }
         console.log(`Cargando presupuestos y gastos para el periodo: ${period}`);
         if(loadingBudgetsMessage) loadingBudgetsMessage.style.display = 'block';
         if(noBudgetsMessage) noBudgetsMessage.style.display = 'none';
         if(budgetList) budgetList.innerHTML = ''; // Limpiar mientras carga
         if(totalBudgetedEl) totalBudgetedEl.textContent = '...';
         if(totalSpentEl) totalSpentEl.textContent = '...';
         if(totalRemainingEl) totalRemainingEl.textContent = '...';

         try {
             // Calcular fechas de inicio y fin del mes/periodo
             const year = parseInt(period.split('-')[0]);
             const month = parseInt(period.split('-')[1]) - 1; // Mes es 0-indexado
             const startDate = new Date(year, month, 1).toISOString().split('T')[0];
             const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]; // Día 0 del mes siguiente = último día del mes actual

             // Obtener presupuestos Y gastos en paralelo
             const [budgetsRes, spendingRes] = await Promise.all([
                 supabase.from('budgets')
                     .select('*')
                     .eq('user_id', currentUserId)
                     // Filtrar por periodo - asumiendo periodo mensual por ahora
                     // Una forma es guardar YYYY-MM en una columna 'period_month'
                     // O filtrar por start_date y end_date si los guardas
                     // Asumamos que guardamos start_date como el primer día del mes
                     .eq('start_date', startDate),
                 calculateSpendingForPeriod(startDate, endDate) // Calcula gastos para este periodo
             ]);

             if (budgetsRes.error) throw budgetsRes.error;
             // El error de calculateSpending ya se maneja dentro o se relanza

             currentBudgets = budgetsRes.data || [];
             currentSpending = spendingRes; // Guardar gastos calculados

             displayBudgets(currentBudgets); // Mostrar los presupuestos con sus gastos

         } catch (error) {
              console.error("Error cargando presupuestos/gastos:", error);
              if (loadingBudgetsMessage) { // Usar la variable correcta
                loadingBudgetsMessage.textContent = `Error al cargar: ${error.message}`;
                loadingBudgetsMessage.style.color = 'red'; // Marcar como error visualmente
                loadingBudgetsMessage.style.display = 'block'; // Asegurar que sea visible
           }
              if(noBudgetsMessage) noBudgetsMessage.style.display = 'block';
              if(budgetList) budgetList.innerHTML = '';
              if (error.message.includes('CORS')) {
                  alert('Error de CORS. Revisa la configuración en Supabase.');
              }
         }
         finally {
            if(loadingBudgetsMessage && loadingBudgetsMessage.style.color !== 'red') {
                 loadingBudgetsMessage.style.display = 'none';
            } else if (loadingBudgetsMessage) {
                // Dejar visible el mensaje de error
            }
            // Mensaje vacío gestionado en displayBudgets
            if (budgetList && !budgetList.hasChildNodes() && loadingBudgetsMessage.style.color !== 'red'){
                 if(noBudgetsMessage) noBudgetsMessage.style.display = 'block';
            } else if (noBudgetsMessage) {
                noBudgetsMessage.style.display = 'none';
            }
        }
    }

    /** Carga los datos iniciales (avatar, categorías de gasto, cuentas) */
    async function loadInitialData(user) {
        if (!user) { console.log("Budgets.js: No user session"); return; }
        currentUserId = user.id;

        if(userAvatarSmall) userAvatarSmall.src = defaultAvatarPath;
        if(loadingBudgetsMessage) loadingBudgetsMessage.style.display = 'block'; // Mostrar cargando inicial

        try {
             const [profileRes, accountsRes, categoriesRes] = await Promise.all([
                 supabase.from('profiles').select('avatar_url').eq('id', currentUserId).single(),
                 supabase.from('accounts').select('id, name').eq('user_id', currentUserId).order('name'),
                 supabase.from('categories').select('id, name, type, icon').or(`user_id.eq.${currentUserId},is_default.eq.true`)
                 //.eq('type', 'gasto')
                 .order('name') // SOLO GASTO
             ]);

             // Avatar
             if (userAvatarSmall) userAvatarSmall.src = profileRes.data?.avatar_url || defaultAvatarPath;
             // Cuentas (para futuro, no se usan en el modal de presupuesto ahora)
             if (accountsRes.error) throw accountsRes.error;
             accounts = accountsRes.data || [];
             // Categorías (para modal)
             console.log('Resultado Query Categorías:', { data: categoriesRes.data, error: categoriesRes.error });
             if (categoriesRes.error) {
                console.error("Error específico cargando categorías:", categoriesRes.error); // <--- AÑADE ESTO
                categories = [];
             } else {
                categories = categoriesRes.data || [];
                console.log("Array global 'categories' rellenado:", categories); // <--- AÑADE ESTO (Ver si tiene datos)
             }
             // Rellenar select del modal (se hará en openBudgetModal)

             // Establecer periodo actual y cargar datos iniciales
             const now = new Date();
             const currentYear = now.getFullYear();
             const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
             selectedPeriod = `${currentYear}-${currentMonth}`;
             if (monthYearPicker) monthYearPicker.value = selectedPeriod; // Poner valor en el selector
             await loadBudgetsAndSpending(selectedPeriod); // Cargar datos del mes actual

        } catch (error) {
             console.error("Error cargando datos iniciales (Budgets):", error);
             if (loadingBudgetsMessage) { // Usar la variable correcta
                loadingBudgetsMessage.textContent = `Error inicial: ${error.message}`;
                loadingBudgetsMessage.style.color = 'red'; // Marcar como error visualmente
                loadingBudgetsMessage.style.display = 'block'; // Asegurar que sea visible
           }
             if (error.message.includes('CORS')) {
                 alert('Error de CORS. Revisa la configuración en Supabase.');
             }
        }
    }


     /** Guarda/Edita un presupuesto */
     async function handleBudgetFormSubmit(event) {
         event.preventDefault();
         if (!supabase || !currentUserId || !budgetForm || !saveBudgetButton || !budgetPeriodInput.value) return;

         const budgetId = budgetIdInput.value;
         const isEditing = !!budgetId;
         const originalSaveText = saveBudgetButton.textContent;

         // Calcular start_date y end_date del periodo YYYY-MM
         const year = parseInt(selectedPeriod.split('-')[0]);
         const month = parseInt(selectedPeriod.split('-')[1]) - 1;
         const startDate = new Date(year, month, 1).toISOString().split('T')[0];
         const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

         const budgetData = {
             user_id: currentUserId,
             category_id: budgetCategoryInput.value,
             amount: parseFloat(budgetAmountInput.value),
             period: 'mensual', // Asumimos mensual por ahora
             start_date: startDate,
             end_date: endDate,
             // updated_at: new Date() // La tabla no tiene este campo
         };

         // Validaciones
         if (!budgetData.category_id) { modalBudgetError.textContent = 'Debes seleccionar una categoría.'; modalBudgetError.style.display = 'block'; return; }
         if (isNaN(budgetData.amount) || budgetData.amount <= 0) { modalBudgetError.textContent = 'El importe presupuestado debe ser mayor que cero.'; modalBudgetError.style.display = 'block'; return; }
         modalBudgetError.style.display = 'none';
         saveBudgetButton.disabled = true; saveBudgetButton.textContent = isEditing ? 'Guardando...' : 'Creando...';

         try {
             let error;
             if (isEditing) {
                 // UPDATE (solo importe)
                 const { error: updateError } = await supabase.from('budgets')
                     .update({ amount: budgetData.amount })
                     .eq('id', budgetId).eq('user_id', currentUserId);
                 error = updateError;
             } else {
                 // INSERT
                 // Verificar si ya existe presupuesto para esta categoría/periodo
                 const { data: existing, error: checkError } = await supabase.from('budgets')
                     .select('id').eq('user_id', currentUserId).eq('category_id', budgetData.category_id).eq('start_date', startDate).maybeSingle();
                 if (checkError) throw checkError;
                 if (existing) throw new Error(`Ya existe un presupuesto para esta categoría en ${selectedPeriod}. Edítalo o bórralo primero.`);

                 const { error: insertError } = await supabase.from('budgets').insert([budgetData]);
                 error = insertError;
             }
             if (error) throw error;

             console.log(isEditing ? 'Presupuesto actualizado' : 'Presupuesto creado');
             closeBudgetModal();
             loadBudgetsAndSpending(selectedPeriod); // Recargar datos del periodo actual

         } catch (error) {
              console.error('Error guardando presupuesto:', error);
              modalBudgetError.textContent = `Error: ${error.message}`;
              modalBudgetError.style.display = 'block';
         } finally {
             saveBudgetButton.disabled = false; saveBudgetButton.textContent = originalSaveText;
         }
     }

     /** Elimina un presupuesto */
     async function handleDeleteBudget(budgetId) {
         if (!supabase || !currentUserId || !budgetId) return;
         const budgetToDelete = currentBudgets.find(b => b.id === budgetId);
         if (!budgetToDelete) return;
         const category = categories.find(c => c.id === budgetToDelete.category_id);

         if (!confirm(`¿Estás SEGURO de que quieres eliminar el presupuesto para "${category?.name || 'esta categoría'}" en ${selectedPeriod}?`)) return;

         console.log('Intentando eliminar presupuesto:', budgetId);
         try {
              const { error } = await supabase.from('budgets').delete().eq('id', budgetId).eq('user_id', currentUserId);
              if (error) throw error;
              console.log('Presupuesto eliminado'); alert('Presupuesto eliminado.');
              loadBudgetsAndSpending(selectedPeriod); // Recargar
         } catch (error) { console.error('Error eliminando presupuesto:', error); alert(`Error: ${error.message}`); }
     }

    // --- Asignación de Event Listeners ---

    document.addEventListener('authReady', (e) => {
        console.log('Budgets.js: Received authReady event.');
        loadInitialData(e.detail.user);
    });

    document.addEventListener('DOMContentLoaded', () => {
         console.log("Budgets.js: DOM fully loaded.");

         // Botones cabecera
         if (addBudgetBtn) addBudgetBtn.addEventListener('click', () => openBudgetModal());
         if (backButton) backButton.addEventListener('click', () => { window.location.href = '/Dashboard.html'; });

         // Selector de periodo
         if (monthYearPicker) {
             // Poner fecha actual por defecto
             const now = new Date();
             const currentYear = now.getFullYear();
             const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
             monthYearPicker.value = `${currentYear}-${currentMonth}`;
             selectedPeriod = monthYearPicker.value; // Actualizar estado

             // Listener para cambios
             monthYearPicker.addEventListener('change', (event) => {
                 selectedPeriod = event.target.value;
                 if (selectedPeriod) {
                      loadBudgetsAndSpending(selectedPeriod); // Recargar datos para nuevo periodo
                 }
             });
         }

         // Modal
         if (cancelBudgetButton) cancelBudgetButton.addEventListener('click', closeBudgetModal);
         if (budgetModal) budgetModal.addEventListener('click', (event) => { if (event.target === budgetModal) closeBudgetModal(); });
         if (budgetForm) budgetForm.addEventListener('submit', handleBudgetFormSubmit);

         // Delegación para Editar/Eliminar en la lista
         if (budgetList) {
             budgetList.addEventListener('click', (event) => {
                 const editButton = event.target.closest('.btn-edit');
                 if (editButton) {
                     const budgetId = editButton.closest('.budget-card')?.dataset.id;
                     const budgetToEdit = currentBudgets.find(b => b.id === budgetId);
                     if (budgetToEdit) openBudgetModal(budgetToEdit);
                     else console.error('No se encontró el presupuesto para editar con ID:', budgetId);
                     return;
                 }
                 const deleteButton = event.target.closest('.btn-delete');
                 if (deleteButton) {
                     const budgetId = deleteButton.closest('.budget-card')?.dataset.id;
                     handleDeleteBudget(budgetId);
                     return;
                 }
             });
         }

         // Scroll top
         if (scrollTopBtn) {
             window.addEventListener('scroll', () => { scrollTopBtn.classList.toggle('visible', window.scrollY > 300); });
             scrollTopBtn.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); });
         }

    }); // Fin DOMContentLoaded

} // Fin check Supabase