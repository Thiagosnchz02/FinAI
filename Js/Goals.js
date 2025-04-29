// goals.js
// ASEGÚRATE que supabase-init.js y auth-listener.js se cargaron antes

console.log('DEBUG: goals.js - Cargado');

if (typeof supabase === 'undefined' || supabase === null) {
    console.error('Goals.js: ¡Error Crítico! Cliente Supabase no inicializado.');
} else {
    console.log('Goals.js: Cliente Supabase encontrado. Procediendo...');

    // --- Selección de Elementos DOM ---
    const backButton = document.getElementById('backButton');
    const userAvatarSmall = document.getElementById('userAvatarSmall');
    const addGoalBtn = document.getElementById('addGoalBtn');
    const goalList = document.getElementById('goalList');
    const loadingGoalsMessage = document.getElementById('loadingGoalsMessage');
    const noGoalsMessage = document.getElementById('noGoalsMessage');
    // Modal Principal (Añadir/Editar Meta)
    const goalModal = document.getElementById('goalModal');
    const goalForm = document.getElementById('goalForm');
    const modalTitleGoal = document.getElementById('modalTitleGoal');
    const goalIdInput = document.getElementById('goalId');
    const goalNameInput = document.getElementById('goalName');
    const goalTargetAmountInput = document.getElementById('goalTargetAmount');
    const goalCurrentAmountInput = document.getElementById('goalCurrentAmount');
    const goalTargetDateInput = document.getElementById('goalTargetDate');
    const goalIconInput = document.getElementById('goalIcon');
    const goalAccountInput = document.getElementById('goalAccount');
    const goalNotesInput = document.getElementById('goalNotes');
    const cancelGoalButton = document.getElementById('cancelGoalButton');
    const saveGoalButton = document.getElementById('saveGoalButton');
    const modalGoalError = document.getElementById('modalGoalError');
    // Modal Pequeño (Añadir Ahorro)
    const addSavingsModal = document.getElementById('addSavingsModal');
    const addSavingsForm = document.getElementById('addSavingsForm');
    const savingsGoalIdInput = document.getElementById('savingsGoalId');
    const savingsGoalName = document.getElementById('savingsGoalName');
    const savingsAmountInput = document.getElementById('savingsAmount');
    const cancelSavingsButton = document.getElementById('cancelSavingsButton');
    const saveSavingsButton = document.getElementById('saveSavingsButton');
    const modalSavingsError = document.getElementById('modalSavingsError');
    // Otros
    const scrollTopBtn = document.getElementById('scrollTopBtn');

    // --- Variables de Estado ---
    let currentUserId = null;
    let accounts = []; // Cache cuentas (para select opcional)
    let goals = []; // Cache metas

    // --- URL Avatar por Defecto ---
    const defaultAvatarPath = 'https://finai.es/images/avatar_predeterminado.png'; // ¡URL Correcta!

    // --- Funciones Auxiliares ---
    function formatCurrency(value, currency = 'EUR') {
        if (isNaN(value) || value === null) return '€0.00';
        try {
            return new Intl.NumberFormat('es-ES', { style: 'currency', currency: currency, minimumFractionDigits: 2 }).format(value);
        } catch (e) {
             console.error("Error formatting currency:", value, currency, e);
             return `${Number(value).toFixed(2)} ${currency}`;
        }
    }
    const iconMap = {
        'viaje': 'fas fa-plane-departure', 'japon': 'fas fa-torii-gate', // Ejemplo Viaje
        'casa': 'fas fa-home', 'piso': 'fas fa-building', 'entrada': 'fas fa-key', // Ejemplo Vivienda
        'coche': 'fas fa-car', 'moto': 'fas fa-motorcycle', // Ejemplo Vehículo
        'ordenador': 'fas fa-laptop', 'movil': 'fas fa-mobile-alt', 'tecnologia': 'fas fa-microchip', // Ejemplo Tech
        'hucha': 'fas fa-piggy-bank', 'ahorro': 'fas fa-piggy-bank', 'emergencia': 'fas fa-briefcase-medical', // Ejemplo Ahorro Genérico
        'estudios': 'fas fa-graduation-cap', 'master': 'fas fa-university', // Ejemplo Educación
        'default': 'fas fa-bullseye' // Icono por defecto
        // ... añade más mapeos según necesites ...
    }; // Incluir iconos para metas (maleta, casa, ordenador, hucha?)
    function getIconClass(iconKeyword) { return iconMap[iconKeyword?.toLowerCase()] || (iconKeyword?.startsWith('fa') ? iconKeyword : 'fas fa-bullseye'); } // Icono por defecto para metas
    function formatDate(dateString) {
        if (!dateString) return '';
        try { const date = new Date(dateString); if (isNaN(date.getTime())) return '';
            const offset = date.getTimezoneOffset(); const adjustedDate = new Date(date.getTime() + (offset*60*1000));
            const day = String(adjustedDate.getDate()).padStart(2, '0');
            const month = String(adjustedDate.getMonth() + 1).padStart(2, '0');
            const year = adjustedDate.getFullYear(); return `${day}/${month}/${year}`;
        } catch (e) { console.error("Error formateando fecha:", dateString, e); return ''; }
    }
    function populateSelect(selectElement, items, valueField = 'id', textField = 'name', defaultOptionText = 'Selecciona...', includeAllOption = false, allOptionText = 'Todos/as', firstOptionValue = '') {
        if (!selectElement) { console.error("populateSelect: Elemento select no encontrado"); return; }
        selectElement.innerHTML = '';
        let hasDefaultSelected = false;
        if (includeAllOption) { const allOpt = document.createElement('option'); allOpt.value = 'all'; allOpt.textContent = allOptionText; selectElement.appendChild(allOpt); }
        // Modificación: Si defaultOptionText es null, no añadir la opción por defecto
        if (defaultOptionText !== null) {
             const defaultOpt = document.createElement('option');
             defaultOpt.value = firstOptionValue;
             defaultOpt.textContent = defaultOptionText;
             defaultOpt.disabled = (firstOptionValue === '');
             defaultOpt.selected = (firstOptionValue === '');
             if(defaultOpt.selected) hasDefaultSelected = true;
             selectElement.appendChild(defaultOpt);
        }
        items.forEach(item => { const option = document.createElement('option'); option.value = item[valueField]; option.textContent = item[textField]; selectElement.appendChild(option); });
         if (!hasDefaultSelected && firstOptionValue === '' && selectElement.options.length > (includeAllOption ? 1 : 0)) {
              selectElement.value = '';
         }
    }

    // --- Funciones Modales ---
    function toggleGoalModal(show) {
        if (!goalModal) return;
        if (show) {
            goalModal.style.display = 'flex';
            setTimeout(() => goalModal.classList.add('active'), 10);
        } else {
            goalModal.classList.remove('active');
            setTimeout(() => {
                goalModal.style.display = 'none';
                if (goalForm) goalForm.reset();
                if (goalIdInput) goalIdInput.value = '';
                if (modalGoalError) {
                    modalGoalError.textContent = '';
                    modalGoalError.style.display = 'none';
                }
                // Habilitar campo de cantidad inicial por defecto al cerrar
                if (goalCurrentAmountInput) {
                     goalCurrentAmountInput.disabled = false;
                     if (goalCurrentAmountInput.parentElement) goalCurrentAmountInput.parentElement.style.display = 'block';
                 }
                 // Habilitar select de categoría
                 if (budgetCategoryInput) budgetCategoryInput.disabled = false;

            }, 300);
        }
    }
    function openGoalModal(goal = null) {
        if (!goalForm || !modalTitleGoal || !goalIdInput || !goalNameInput || !goalTargetAmountInput || !goalCurrentAmountInput || !goalTargetDateInput || !goalIconInput || !goalAccountInput || !goalNotesInput || !saveGoalButton) {
            console.error("Error: Elementos del modal de meta no encontrados."); return; }

        goalForm.reset();
        goalIdInput.value = '';
        modalGoalError.style.display = 'none';
        saveGoalButton.disabled = false;
        saveGoalButton.textContent = 'Guardar Meta';

        // Poblar desplegable de cuentas (si hay cuentas cargadas)
        populateSelect(goalAccountInput, accounts, 'id', 'name', '(Ninguna específica)', false, '');

        // Habilitar/Deshabilitar campo de importe inicial
        goalCurrentAmountInput.disabled = false;
        goalCurrentAmountInput.parentElement.style.display = 'block'; // Mostrar por defecto

        if (goal) { // Modo Edición
            modalTitleGoal.textContent = 'Editar Meta';
            goalIdInput.value = goal.id;
            goalNameInput.value = goal.name;
            goalTargetAmountInput.value = goal.target_amount;
            goalCurrentAmountInput.value = goal.current_amount; // Mostrar el actual
            goalCurrentAmountInput.disabled = true; // El actual NO se edita aquí
            goalCurrentAmountInput.parentElement.style.display = 'none'; // Ocultar al editar
            goalTargetDateInput.value = goal.target_date || '';
            goalIconInput.value = goal.icon || '';
            goalAccountInput.value = goal.related_account_id || '';
            goalNotesInput.value = goal.notes || '';
        } else { // Modo Añadir
            modalTitleGoal.textContent = 'Añadir Nueva Meta';
            goalCurrentAmountInput.disabled = false; // Permitir poner inicial
            goalCurrentAmountInput.parentElement.style.display = 'block';
            goalTargetDateInput.value = ''; // Limpiar fecha
        }
        toggleGoalModal(true);
    }
    function closeGoalModal() { toggleGoalModal(false); }

    function toggleAddSavingsModal(show) {
        if (!addSavingsModal) return;
        if (show) {
            addSavingsModal.style.display = 'flex';
            setTimeout(() => addSavingsModal.classList.add('active'), 10);
        } else {
            addSavingsModal.classList.remove('active');
            setTimeout(() => {
                addSavingsModal.style.display = 'none';
                if (addSavingsForm) addSavingsForm.reset();
                if (savingsGoalIdInput) savingsGoalIdInput.value = '';
                if (savingsGoalName) savingsGoalName.textContent = '';
                if (modalSavingsError) {
                    modalSavingsError.textContent = '';
                    modalSavingsError.style.display = 'none';
                }
            }, 300);
        }
   }
    function openAddSavingsModal(goalId, goalName) {
         if (!addSavingsForm || !savingsGoalIdInput || !savingsGoalName || !savingsAmountInput) { console.error("Elementos modal AÑADIR AHORRO no encontrados"); return; }
         addSavingsForm.reset();
         savingsGoalIdInput.value = goalId;
         savingsGoalName.textContent = goalName; // Mostrar nombre de la meta
         modalSavingsError.style.display = 'none';
         saveSavingsButton.disabled = false;
         saveSavingsButton.textContent = 'Añadir';
         toggleAddSavingsModal(true);
         setTimeout(() => savingsAmountInput.focus(), 350); // Enfocar input tras abrir
    }
    function closeAddSavingsModal() { toggleAddSavingsModal(false); }


    // --- Funciones Principales ---

    /** Muestra las tarjetas de metas */
    function displayGoals(goalsToDisplay) {
        if (!goalList || !noGoalsMessage || !loadingGoalsMessage) { console.error("Elementos UI para Metas no encontrados."); return; }
        goalList.innerHTML = '';

        if (!goalsToDisplay || goalsToDisplay.length === 0) {
            noGoalsMessage.style.display = 'block';
            loadingGoalsMessage.style.display = 'none';
            goalList.style.display = 'none';
            return;
        }

         noGoalsMessage.style.display = 'none';
         loadingGoalsMessage.style.display = 'none';
         goalList.style.display = 'grid';

         // Ordenar quizás por fecha objetivo o % completado?
         goalsToDisplay.sort((a, b) => (new Date(a.target_date || '9999-12-31')) - (new Date(b.target_date || '9999-12-31'))); // Ordenar por fecha objetivo

         goalsToDisplay.forEach(goal => {
             const card = document.createElement('div');
             card.classList.add('goal-card');
             card.setAttribute('data-id', goal.id);

             const targetAmount = Number(goal.target_amount) || 0;
             const currentAmount = Number(goal.current_amount) || 0;
             const remaining = targetAmount - currentAmount;
             const percentage = targetAmount > 0 ? Math.max(0, Math.min((currentAmount / targetAmount) * 100, 100)) : 0; // Entre 0 y 100
             const isComplete = currentAmount >= targetAmount;

             let progressBarColor = '#48bb78'; // Verde
             let progressBarClass = '';
             if (isComplete) progressBarColor = '#8a82d5'; // Morado completado
             else if (percentage >= 75) progressBarColor = '#ecc94b'; // Amarillo

             const remainingClass = isComplete ? 'complete' : (remaining >= 0 ? 'positive' : 'negative'); // Aunque no debería ser negativo
             const remainingText = isComplete ? '¡Conseguido!' : `Restante: ${formatCurrency(remaining)}`;

             const iconClass = getIconClass(goal.icon);
             const targetDateFormatted = formatDate(goal.target_date);

             card.innerHTML = `
                 <div class="card-header">
                    <span class="goal-icon"><i class="${iconClass}"></i></span>
                    <div class="header-text">
                        <h3 class="goal-name">${goal.name}</h3>
                        ${targetDateFormatted ? `<p class="goal-target-date">Hasta: ${targetDateFormatted}</p>` : ''}
                    </div>
                 </div>
                 <div class="card-body">
                    <div class="goal-amounts">
                        <span class="amount-pair">
                            <span class="label">Ahorrado:</span>
                            <span class="amount current">${formatCurrency(currentAmount)}</span>
                        </span>
                        <span class="amount-pair">
                            <span class="label">Objetivo:</span>
                            <span class="amount target">${formatCurrency(targetAmount)}</span>
                        </span>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar ${progressBarClass}" style="width: ${percentage}%; background-color: ${progressBarColor};"></div>
                        <span class="progress-percentage">${percentage.toFixed(1)}%</span>
                    </div>
                    <div class="amount-remaining ${remainingClass}">${remainingText}</div>
                </div>
                <div class="card-actions">
                    <button class="btn-icon btn-add-savings" aria-label="Añadir Ahorro" title="Añadir Ahorro" data-id="${goal.id}" data-name="${goal.name}"><i class="fas fa-plus-circle"></i></button>
                    <button class="btn-icon btn-edit" aria-label="Editar Meta" title="Editar Meta" data-id="${goal.id}"><i class="fas fa-pencil-alt"></i></button>
                    <button class="btn-icon btn-delete" aria-label="Eliminar Meta" title="Eliminar Meta" data-id="${goal.id}"><i class="fas fa-trash-alt"></i></button>
                </div>
             `;
             goalList.appendChild(card);
         });
    }

    /** Carga los datos iniciales (avatar, cuentas, metas) */
    async function loadInitialData(user) {
        if (!user) { console.log("Goals.js: No user session"); return; }
        currentUserId = user.id;

        if(userAvatarSmall) userAvatarSmall.src = defaultAvatarPath;
        if(loadingGoalsMessage) loadingGoalsMessage.style.display = 'block';
        console.log("Goals.js: Loading initial data for user:", currentUserId);

        try {
             // ¡NECESITA CORS!
             const [profileRes, accountsRes, goalsRes] = await Promise.all([
                 supabase.from('profiles').select('avatar_url').eq('id', currentUserId).single(),
                 supabase.from('accounts').select('id, name').eq('user_id', currentUserId).order('name'),
                 supabase.from('goals').select('*').eq('user_id', currentUserId).order('target_date')
             ]);

             // Avatar
             if (userAvatarSmall) userAvatarSmall.src = profileRes.data?.avatar_url || defaultAvatarPath;
             // Cuentas (para modal)
             if (accountsRes.error) throw accountsRes.error;
             accounts = accountsRes.data || [];
             // Metas
             if (goalsRes.error) throw goalsRes.error;
             goals = goalsRes.data || []; // Guardar caché local
             displayGoals(goals); // Mostrar metas

        } catch (error) {
             console.error("Error cargando datos iniciales (Goals):", error);
             if(loadingGoalsMessage) loadingGoalsMessage.textContent = `Error inicial: ${error.message}`;
             // No alertar, mostrar error en UI
        } finally {
            if(loadingGoalsMessage) loadingGoalsMessage.style.display = 'none';
             // Mensaje vacío gestionado en displayGoals
             if (goalList && !goalList.hasChildNodes()){
                 if(noGoalsMessage) noGoalsMessage.style.display = 'block';
             } else if (noGoalsMessage) {
                 noGoalsMessage.style.display = 'none';
             }
        }
    }

    /** Guarda/Edita una meta */
    async function handleGoalFormSubmit(event) {
        event.preventDefault();
        if (!supabase || !currentUserId || !goalForm || !saveGoalButton) return;

        const goalId = goalIdInput.value;
        const isEditing = !!goalId;
        const originalSaveText = saveGoalButton.textContent;

        const goalData = {
            user_id: currentUserId,
            name: goalNameInput.value.trim(),
            target_amount: parseFloat(goalTargetAmountInput.value),
            // current_amount solo se pone al crear
            current_amount: isEditing ? undefined : parseFloat(goalCurrentAmountInput.value) || 0,
            target_date: goalTargetDateInput.value || null,
            icon: goalIconInput.value.trim() || null,
            related_account_id: goalAccountInput.value || null,
            notes: goalNotesInput.value.trim() || null
        };

        // Validaciones
        if (!goalData.name || isNaN(goalData.target_amount) || goalData.target_amount <= 0) {
             modalGoalError.textContent = 'Nombre y Objetivo (mayor que 0) son obligatorios.'; modalGoalError.style.display = 'block'; return; }
        if (!isEditing && (isNaN(goalData.current_amount) || goalData.current_amount < 0)) {
             modalGoalError.textContent = 'El Ahorrado Inicial debe ser un número válido (0 o más).'; modalGoalError.style.display = 'block'; return; }
        modalGoalError.style.display = 'none';
        saveGoalButton.disabled = true; saveGoalButton.textContent = isEditing ? 'Guardando...' : 'Creando...';

        try {
            let error;
            if (isEditing) {
                // UPDATE (sin current_amount)
                 const updateData = { ...goalData };
                 delete updateData.current_amount; // No actualizamos current_amount aquí
                 delete updateData.user_id; // No necesario en update con RLS

                 const { error: updateError } = await supabase.from('goals').update(updateData)
                    .eq('id', goalId).eq('user_id', currentUserId);
                 error = updateError;
            } else {
                // INSERT
                const { error: insertError } = await supabase.from('goals').insert([goalData]);
                error = insertError;
            }
            if (error) throw error;

            console.log(isEditing ? 'Meta actualizada' : 'Meta creada');
            closeGoalModal(); loadInitialData({ id: currentUserId }); // Recargar

        } catch (error) {
            console.error('Error guardando meta:', error); modalGoalError.textContent = `Error: ${error.message}`; modalGoalError.style.display = 'block';
        } finally {
            saveGoalButton.disabled = false; saveGoalButton.textContent = originalSaveText;
        }
    }

    /** Añade un importe al ahorro actual de una meta */
    async function handleAddSavingsSubmit(event) {
         event.preventDefault();
         if (!supabase || !currentUserId || !addSavingsForm || !saveSavingsButton) return;

         const goalId = savingsGoalIdInput.value;
         const amountToAdd = parseFloat(savingsAmountInput.value);
         const originalSaveText = saveSavingsButton.textContent;

         if (isNaN(amountToAdd) || amountToAdd <= 0) {
             modalSavingsError.textContent = 'Introduce un importe positivo válido.'; modalSavingsError.style.display = 'block'; return; }
         if (!goalId) { modalSavingsError.textContent = 'Error: ID de meta no encontrado.'; modalSavingsError.style.display = 'block'; return; }
         modalSavingsError.style.display = 'none';
         saveSavingsButton.disabled = true; saveSavingsButton.textContent = 'Añadiendo...';

         try {
            // 1. Obtener el importe actual de la meta (mejor desde DB por si acaso)
            const { data: currentGoal, error: fetchError } = await supabase
                .from('goals').select('current_amount').eq('id', goalId).eq('user_id', currentUserId).single();

            if (fetchError) throw new Error(`No se pudo obtener la meta: ${fetchError.message}`);
            if (!currentGoal) throw new Error('Meta no encontrada.');

            const currentAmount = Number(currentGoal.current_amount) || 0;
            const newAmount = currentAmount + amountToAdd;

            // 2. Actualizar el importe en la base de datos
            // ¡NECESITA CORS!
            const { error: updateError } = await supabase.from('goals')
                .update({ current_amount: newAmount })
                .eq('id', goalId).eq('user_id', currentUserId);
            if (updateError) throw updateError;

            console.log(`Ahorro añadido a meta ${goalId}. Nuevo total: ${newAmount}`);
            closeAddSavingsModal();
            loadInitialData({ id: currentUserId }); // Recargar todo

        } catch (error) {
            console.error('Error añadiendo ahorro:', error); modalSavingsError.textContent = `Error: ${error.message}`; modalSavingsError.style.display = 'block';
        } finally {
             saveSavingsButton.disabled = false; saveSavingsButton.textContent = 'Añadir';
        }
    }


    /** Elimina una meta */
    async function handleDeleteGoal(goalId) {
         if (!supabase || !currentUserId || !goalId) return;
         const goalToDelete = goals.find(g => g.id === goalId);
         if (!goalToDelete) return;

         if (!confirm(`¿Estás SEGURO de que quieres eliminar la meta "${goalToDelete.name}"?\nSe perderá el progreso de ahorro registrado para ella.`)) return;

         console.log('Intentando eliminar meta:', goalId);
         try {
              // ¡NECESITA CORS!
              const { error } = await supabase.from('goals').delete().eq('id', goalId).eq('user_id', currentUserId);
              if (error) throw error;
              console.log('Meta eliminada'); alert('Meta eliminada.'); loadInitialData({ id: currentUserId }); // Recargar
         } catch (error) { console.error('Error eliminando meta:', error); alert(`Error: ${error.message}`); }
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
        console.log('Goals.js: Received authReady event.');
        loadInitialData(e.detail.user);
    });

    document.addEventListener('DOMContentLoaded', () => {
         console.log("Goals.js: DOM fully loaded.");

         if (addGoalBtn) addGoalBtn.addEventListener('click', () => openGoalModal());
         if (backButton) backButton.addEventListener('click', () => { window.location.href = '/Dashboard.html'; });

         // Modal Principal (Añadir/Editar Meta)
         if (cancelGoalButton) cancelGoalButton.addEventListener('click', closeGoalModal);
         if (goalModal) goalModal.addEventListener('click', (event) => { if (event.target === goalModal) closeGoalModal(); });
         if (goalForm) goalForm.addEventListener('submit', handleGoalFormSubmit);

         console.log("Initializing sidebar...");
         setActiveSidebarLink();             // <--- LLAMADA 1
         addSidebarNavigationListeners(); 

         // Modal Pequeño (Añadir Ahorro)
         if (cancelSavingsButton) cancelSavingsButton.addEventListener('click', closeAddSavingsModal);
         if (addSavingsModal) addSavingsModal.addEventListener('click', (event) => { if (event.target === addSavingsModal) closeAddSavingsModal(); });
         if (addSavingsForm) addSavingsForm.addEventListener('submit', handleAddSavingsSubmit);

         // Delegación para acciones en la lista (Add Savings, Edit, Delete)
         if (goalList) {
             goalList.addEventListener('click', (event) => {
                 const addSavingsButton = event.target.closest('.btn-add-savings');
                 if (addSavingsButton) {
                     const goalId = addSavingsButton.dataset.id;
                     const goalName = addSavingsButton.dataset.name; // Pasamos el nombre para mostrarlo
                     openAddSavingsModal(goalId, goalName); return;
                 }
                 const editButton = event.target.closest('.btn-edit');
                 if (editButton) {
                     const goalId = editButton.dataset.id;
                     const goalToEdit = goals.find(g => g.id === goalId);
                     if (goalToEdit) openGoalModal(goalToEdit);
                     else console.error('No se encontró la meta para editar:', goalId);
                     return;
                 }
                 const deleteButton = event.target.closest('.btn-delete');
                 if (deleteButton) {
                     const goalId = deleteButton.dataset.id;
                     handleDeleteGoal(goalId);
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