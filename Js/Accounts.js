// accounts.js
// ASEGÚRATE de que este script se carga DESPUÉS de:
// 1. Supabase CDN
// 2. supabase-init.js
// 3. auth-listener.js (¡Importante para el evento 'authReady'!)

console.log('DEBUG: accounts.js - Cargado');

// Verificar si Supabase está disponible (inicializado en supabase-init.js)
if (typeof supabase === 'undefined' || supabase === null) {
    console.error('Accounts.js: ¡Error Crítico! Cliente Supabase no inicializado.');
    // Mostrar error en la UI si es posible
    const accountList = document.getElementById('accountList');
    if(accountList) {
        accountList.innerHTML = '<p style="text-align: center; color: red;">Error crítico: No se pudo inicializar la conexión.</p>';
    }
    // Detener la ejecución del resto del script
    // Lanzar un error o simplemente no continuar podría ser una opción
    // throw new Error("Supabase client not available");
} else {
    console.log('Accounts.js: Cliente Supabase encontrado. Procediendo...');

    // --- Selección de Elementos DOM ---
    const accountList = document.getElementById('accountList');
    const addAccountBtn = document.getElementById('addAccountBtn');
    const accountModal = document.getElementById('accountModal');
    const accountForm = document.getElementById('accountForm');
    const modalTitle = document.getElementById('modalTitle');
    const accountIdInput = document.getElementById('accountId');
    const accountNameInput = document.getElementById('accountName');
    const accountTypeInput = document.getElementById('accountType');
    const accountBalanceInput = document.getElementById('accountBalance');
    const accountCurrencyInput = document.getElementById('accountCurrency');
    const cancelButton = document.getElementById('cancelButton');
    const saveButton = document.getElementById('saveButton');
    const modalError = document.getElementById('modalError');
    const noAccountsMessage = document.getElementById('noAccountsMessage');
    const addAccountFromEmptyBtn = document.getElementById('addAccountFromEmptyBtn');
    const scrollTopBtn = document.getElementById('scrollTopBtn');
    const backButton = document.getElementById('backButton');
    const userAvatarSmall = document.getElementById('userAvatarSmall');
    const totalBalanceAmount = document.getElementById('totalBalanceAmount');
    const accountBankInput = document.getElementById('accountBank');

    // --- Variables de Estado ---
    let currentUserId = null;
    let accountsData = [];

    // --- URL Avatar por Defecto ---
    // ¡Usa la URL pública real de tu imagen en Hostinger!
    const defaultAvatarPath = 'https://finai.es/images/avatar_predeterminado.png';

    // --- Funciones ---

    /** Formatea un número como moneda */
    function formatCurrency(value, currency = 'EUR') {
        if (isNaN(value) || value === null) return 'N/A';
        return new Intl.NumberFormat('es-ES', { style: 'currency', currency: currency, minimumFractionDigits: 2 }).format(value);
    }

    /** Devuelve el icono Font Awesome según el tipo de cuenta */
    function getIconForAccountType(type) {
        switch (type) {
            case 'Nomina': return 'fas fa-wallet';
            case 'corriente': return 'fas fa-landmark';
            case 'viajes': return 'fa-solid fa-plane';
            case 'ahorro': return 'fas fa-piggy-bank';
            case 'ahorro_colchon': return 'fas fa-piggy-bank';
            case 'tarjeta_credito': return 'fas fa-credit-card';
            case 'efectivo': return 'fas fa-wallet';
            case 'inversion': return 'fas fa-chart-line';
            case 'otro': return 'fas fa-question-circle';
            default: return 'fas fa-university';
        }
    }

    /** Muestra u oculta el modal con animación */
    function toggleModal(show) {
        if (!accountModal) return; // Verificar si el modal existe
        if (show) {
            accountModal.style.display = 'flex';
            setTimeout(() => accountModal.classList.add('active'), 10);
        } else {
            accountModal.classList.remove('active');
            setTimeout(() => {
                accountModal.style.display = 'none';
                if (accountForm) accountForm.reset(); // Limpiar al cerrar
                if (accountIdInput) accountIdInput.value = '';
                if (modalError) {
                     modalError.textContent = '';
                     modalError.style.display = 'none';
                }
            }, 300);
        }
    }

    /** Abre el modal para añadir o editar una cuenta */
    function openModal(account = null) {
        if (!accountForm || !accountIdInput || !modalTitle || !accountNameInput || !accountTypeInput || !accountBalanceInput || !accountCurrencyInput || !accountBankInput || !saveButton) {
            console.error("Error: Elementos del modal no encontrados.");
            return;
        }
        accountForm.reset();
        accountIdInput.value = '';
        modalError.style.display = 'none';
        saveButton.disabled = false;
        saveButton.textContent = 'Guardar Cuenta';
        accountBalanceInput.readOnly = false;
        accountBalanceInput.style.backgroundColor = '#ffffff';

        if (account) {
            modalTitle.textContent = 'Editar Cuenta';
            accountIdInput.value = account.id;
            accountNameInput.value = account.name;
            accountTypeInput.value = account.type;
            accountBalanceInput.value = '0.00';
            accountBalanceInput.readOnly = true; // Saldo no editable aquí
            accountBalanceInput.style.backgroundColor = '#e9ecef';
            accountCurrencyInput.value = account.currency;
            if (accountBankInput) accountBankInput.value = account.bank_name || '';
        } else {
            modalTitle.textContent = 'Añadir Nueva Cuenta';
            accountBalanceInput.readOnly = false; // Editable al añadir
            accountBalanceInput.style.backgroundColor = '#ffffff';
            accountCurrencyInput.value = 'EUR';
            if (accountBankInput) accountBankInput.value = '';
        }
        toggleModal(true);
    }

    /** Cierra el modal */
    function closeModal() {
        toggleModal(false);
    }

    /** Muestra las tarjetas de cuenta y calcula saldo total */
    async function displayAccounts(accounts) {
        if (!accountList || !noAccountsMessage || !totalBalanceAmount) {
             console.error("displayAccounts: Elementos UI no encontrados.");
             return; // Salir si faltan elementos clave
        }
    
        accountList.innerHTML = ''; // Limpiar antes de empezar
        let calculatedTotalBalance = 0;
        const excludedTypesForTotal = ['tarjeta_credito'];
    
        if (!accounts || accounts.length === 0) {
            noAccountsMessage.style.display = 'block';
            accountList.style.display = 'none';
            totalBalanceAmount.textContent = formatCurrency(0);
            return;
        }
    
        noAccountsMessage.style.display = 'none';
        accountList.style.display = 'grid';
    
        // Usamos for...of para poder usar await dentro del bucle
        for (const acc of accounts) {
            let currentAccountBalance = 0; // Saldo calculado para esta cuenta
            let balanceText = 'Calculando...'; // Texto mientras se calcula
    
            try {
                // --- CORRECCIÓN AQUÍ: Pedir todos los importes, NO la suma ---
                const { data: transactions, error: balanceError } = await supabase
                    .from('transactions')
                    .select('amount') // <-- Pedimos solo la columna amount
                    .eq('user_id', currentUserId)
                    .eq('account_id', acc.id); // Filtrar por el ID de esta cuenta
    
                if (balanceError) {
                    console.error(`Error obteniendo transacciones para cuenta ${acc.id}:`, balanceError);
                    balanceText = 'Error';
                    // No sumar al total si falla el cálculo de esta cuenta
                } else {
                    // --- CORRECCIÓN AQUÍ: Sumar los importes en JavaScript ---
                    // 'transactions' será un array de objetos [{amount: N}, {amount: M}, ...] o null/[]
                    currentAccountBalance = (transactions || []).reduce((sum, tx) => {
                        return sum + (Number(tx.amount) || 0); // Sumar (los gastos ya son negativos)
                    }, 0); // Empezar suma en 0
    
                    balanceText = formatCurrency(currentAccountBalance, acc.currency || 'EUR'); // Usar moneda de la cuenta o EUR por defecto
    
                    // Añadir al saldo total SI no es un tipo excluido
                    if (!excludedTypesForTotal.includes(acc.type)) {
                        calculatedTotalBalance += currentAccountBalance;
                    }
                }
    
            } catch (error) {
                console.error(`Excepción calculando saldo para cuenta ${acc.id}:`, error);
                balanceText = 'Error';
            }
    
            // Crear la tarjeta de la cuenta (igual que antes)
            const card = document.createElement('div');
            card.classList.add('account-card');
            card.setAttribute('data-id', acc.id);
            card.setAttribute('data-type', acc.type);
    
            const iconClass = getIconForAccountType(acc.type);
            let typeText = (acc.type || 'otro').replace('_', ' ');
            typeText = typeText.charAt(0).toUpperCase() + typeText.slice(1);
            if (typeText === 'Tarjeta credito') typeText = 'Tarjeta de Crédito';
    
            // Usar el balanceText (que contiene el saldo calculado o 'Error')
            card.innerHTML = `
                <div class="card-header">
                    <span class="account-icon"><i class="${iconClass}"></i></span>
                    <h3 class="account-name">${acc.name + ' | ' + acc.bank_name || 'Sin Nombre'}</h3>
                </div>
                <div class="card-body">
                    <p class="account-balance">${balanceText}</p> <p class="account-type">Tipo: ${typeText}</p>
                </div>
                <div class="card-actions">
                    <button class="btn-icon btn-edit" aria-label="Editar" data-id="${acc.id}"><i class="fas fa-pencil-alt"></i></button>
                    <button class="btn-icon btn-delete" aria-label="Eliminar" data-id="${acc.id}"><i class="fas fa-trash-alt"></i></button>
                </div>
            `;
            accountList.appendChild(card);
        } // Fin del bucle for...of
    
        // Actualizar el saldo total general DESPUÉS de calcular todos los saldos individuales
        totalBalanceAmount.textContent = formatCurrency(calculatedTotalBalance);
        console.log("Saldo total calculado:", calculatedTotalBalance);
    }

    /** Carga las cuentas y también el avatar del usuario para la cabecera */
    async function loadAccountsAndUser(user) { // Recibe el user del evento authReady
         if (!accountList || !totalBalanceAmount) {
             console.error("Elementos de la lista de cuentas o saldo total no encontrados.");
             return;
         }
        // Mostrar estado de carga inicial
        accountList.innerHTML = '<p style="text-align: center; color: #666;">Cargando datos...</p>';
        totalBalanceAmount.textContent = 'Calculando...';
        if(userAvatarSmall) userAvatarSmall.src = defaultAvatarPath; // Default mientras carga

        if (!supabase) {
             accountList.innerHTML = '<p style="text-align: center; color: red;">Error: Supabase no disponible.</p>';
             totalBalanceAmount.textContent = 'Error';
             return;
         }
        if (!user) {
             console.error("Accounts.js: No user session found after authReady.");
             accountList.innerHTML = '<p style="text-align: center; color: red;">Error: Sesión no encontrada.</p>';
             totalBalanceAmount.textContent = 'Error';
             // auth-listener.js debería haber redirigido a login si es necesario
             return;
         }
        currentUserId = user.id; // Establecer el ID del usuario actual

        console.log('Accounts.js: Cargando datos para User ID:', currentUserId);

        try {
            const [profileResponse, accountsResponse] = await Promise.all([
                 supabase.from('profiles').select('avatar_url').eq('id', currentUserId).single(),
                 // La consulta de cuentas sigue igual, trae todos los datos de la cuenta
                 supabase.from('accounts').select('*').eq('user_id', currentUserId).order('name', { ascending: true })
            ]);
    
            // ... (código existente para procesar perfil/avatar) ...
    
            // Procesar cuentas
            const accounts = accountsResponse.data;
            const accountsError = accountsResponse.error;
            if (accountsError) throw accountsError;
    
            accountsData = accounts; // Guardar datos base de cuentas (nombre, tipo, etc.)
    
            // --- LLAMADA ASÍNCRONA A displayAccounts ---
            await displayAccounts(accountsData); // <-- AÑADIR await AQUÍ
    
        } catch (error) {
            console.error('Error cargando datos (profile/accounts):', error);
            accountList.innerHTML = `<p style="text-align: center; color: red;">Error al cargar: ${error.message}</p>`;
            totalBalanceAmount.textContent = 'Error';
            // No mostrar alert aquí para no bloquear la UI
        }
    }

     /** Maneja el envío del formulario del modal (Añadir o Editar) */
     async function handleFormSubmit(event) {
         event.preventDefault();
         if (!supabase || !currentUserId || !accountForm || !saveButton || !accountBankInput) return;

         const accountId = accountIdInput.value;
         const isEditing = !!accountId;
         const originalSaveText = saveButton.textContent;
         const bank_name_value = accountBankInput.value.trim() || null;

         // Extraer datos del formulario
         const formData = {
             user_id: currentUserId,
             name: accountNameInput.value.trim(),
             type: accountTypeInput.value,
             // Solo coger balance si NO estamos editando
             balance: isEditing ? undefined : parseFloat(accountBalanceInput.value),
             currency: (accountCurrencyInput.value.trim().toUpperCase() || 'EUR'),
             bank_name: bank_name_value,
             updated_at: new Date() // Solo relevante para update, pero lo incluimos
         };

         // Validaciones
         if (!formData.name || !formData.type || !formData.currency || formData.currency.length !== 3) {
             modalError.textContent = 'Nombre, Tipo y Moneda (3 letras, ej: EUR) son obligatorios.';
             modalError.style.display = 'block'; return;
         }
         if (!isEditing && (isNaN(formData.balance) || formData.balance === undefined || formData.balance === null)) {
            // Considerar 0 como válido para saldo inicial
             modalError.textContent = 'El saldo inicial debe ser un número válido (puede ser 0).';
             modalError.style.display = 'block'; return;
         }
         modalError.style.display = 'none';
         saveButton.disabled = true;
         saveButton.textContent = isEditing ? 'Guardando...' : 'Creando...';

         try {
             let error;
             if (isEditing) {
                  // --- UPDATE ---
                  const updateData = {
                    name: formData.name,
                    type: formData.type,
                    currency: formData.currency,
                    bank_name: formData.bank_name, // <-- Añadido aquí
                    updated_at: formData.updated_at
                  };
                  // Excluimos user_id (controlado por RLS/FK) y balance (no editable aquí)
                  const { error: updateError } = await supabase
                      .from('accounts')
                      .update(updateData)
                      .eq('id', accountId)
                      .eq('user_id', currentUserId);
                  error = updateError;
             } else {
                 // --- INSERT ---
                 // Quitamos updated_at para insert, la BD puede tener default now() o no ser necesaria
                 delete formData.updated_at;
                 const { error: insertError } = await supabase.from('accounts').insert([formData]);
                 error = insertError;
             }
             if (error) throw error; // Lanza al catch

             console.log(isEditing ? 'Cuenta actualizada' : 'Cuenta creada');
             closeModal();
             loadAccountsAndUser({ id: currentUserId }); // Recargar lista y datos (pasamos user mock)

         } catch (error) {
              console.error('Error guardando cuenta:', error);
              modalError.textContent = `Error: ${error.message}`;
              modalError.style.display = 'block';
         } finally {
             saveButton.disabled = false;
             saveButton.textContent = originalSaveText; // Restaurar texto original
         }
     }

     /** Maneja el clic en el botón de eliminar cuenta */
     async function handleDeleteAccount(accountId) {
         if (!supabase || !currentUserId) return;
         if (!confirm(`¿Estás SEGURO de que quieres eliminar esta cuenta?\n¡Esta acción no se puede deshacer! \n(Nota: No podrás eliminarla si tiene transacciones asociadas).`)) return;

         console.log('Intentando eliminar cuenta:', accountId);
         try {
              const { error } = await supabase
                 .from('accounts')
                 .delete()
                 .eq('id', accountId)
                 .eq('user_id', currentUserId);

             if (error) {
                 if (error.code === '23503') { // Violación de FK (transacciones existen)
                     alert('Error: No se puede eliminar la cuenta porque tiene transacciones asociadas. Borra o reasigna primero las transacciones.');
                 } else { throw error; }
             } else {
                 console.log('Cuenta eliminada con éxito');
                 alert('Cuenta eliminada.');
                 loadAccountsAndUser({ id: currentUserId }); // Recargar lista y datos
             }
         } catch (error) {
             console.error('Error eliminando cuenta:', error);
             alert(`Error al eliminar la cuenta: ${error.message}`);
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

    // Escuchar el evento personalizado 'authReady' disparado por auth-listener.js
    document.addEventListener('authReady', (e) => {
        console.log('Accounts.js: Received authReady event.');
        const user = e.detail.user; // Obtener el usuario del evento
        if(user) {
            loadAccountsAndUser(user); // Llamar a la función de carga con el usuario
        } else {
            console.log("Accounts.js: No user session found on authReady.");
             // Opcional: Mostrar mensaje de "Necesitas iniciar sesión" o dejar que auth-listener redirija
             accountList.innerHTML = '<p style="text-align: center; color: #666;">Por favor, inicia sesión para ver tus cuentas.</p>';
             totalBalanceAmount.textContent = 'N/A';
        }
    });

    // Resto de listeners que dependen de elementos que existen al cargar el DOM
    document.addEventListener('DOMContentLoaded', () => {
        console.log("Accounts.js: DOM fully loaded.");
        // Botón Añadir Cuenta (en cabecera)
        if (addAccountBtn) {
             addAccountBtn.addEventListener('click', () => openModal());
        }
        // Botón Añadir Cuenta (en mensaje vacío)
        if (addAccountFromEmptyBtn) {
            addAccountFromEmptyBtn.addEventListener('click', () => openModal());
        }
        // Cerrar Modal
        if (cancelButton) cancelButton.addEventListener('click', closeModal);
        if (accountModal) accountModal.addEventListener('click', (event) => { if (event.target === accountModal) closeModal(); });
        // Envío del formulario del Modal
        if (accountForm) accountForm.addEventListener('submit', handleFormSubmit);

        // Listeners para botones Editar/Eliminar (Usando delegación)
        if (accountList) {
            accountList.addEventListener('click', (event) => {
                 const editButton = event.target.closest('.btn-edit');
                 if (editButton) {
                     const accountId = editButton.dataset.id;
                     const accountToEdit = accountsData.find(acc => acc.id === accountId);
                     if (accountToEdit) openModal(accountToEdit);
                     else console.error('No se encontró la cuenta para editar con ID:', accountId);
                     return;
                 }
                 const deleteButton = event.target.closest('.btn-delete');
                 if (deleteButton) {
                     const accountId = deleteButton.dataset.id;
                     handleDeleteAccount(accountId);
                     return;
                 }
            });
        }

        console.log("Initializing sidebar...");
         setActiveSidebarLink();             // <--- LLAMADA 1
         addSidebarNavigationListeners();

         // Botón Volver (Cabecera)
         if (backButton) {
             backButton.addEventListener('click', () => {
                 console.log('DEBUG: Botón Volver presionado -> Dashboard');
                 window.location.href = '/Dashboard.html'; // Ruta correcta
             });
         }

         // Botón Scroll to Top
         if (scrollTopBtn) {
             window.addEventListener('scroll', () => {
                scrollTopBtn.classList.toggle('visible', window.scrollY > 300);
             });
             scrollTopBtn.addEventListener('click', () => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
             });
         }

    }); // Fin DOMContentLoaded

} // Fin del check inicial de Supabase