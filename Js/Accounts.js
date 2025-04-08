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

    // --- Variables de Estado ---
    let currentUserId = null;
    let accountsData = [];

    // --- URL Avatar por Defecto ---
    // ¡Usa la URL pública real de tu imagen en Hostinger!
    const defaultAvatarPath = 'https://finai.es/images/avatar-predeterminado.png';

    // --- Funciones ---

    /** Formatea un número como moneda */
    function formatCurrency(value, currency = 'EUR') {
        if (isNaN(value) || value === null) return 'N/A';
        return new Intl.NumberFormat('es-ES', { style: 'currency', currency: currency, minimumFractionDigits: 2 }).format(value);
    }

    /** Devuelve el icono Font Awesome según el tipo de cuenta */
    function getIconForAccountType(type) {
        switch (type) {
            case 'corriente': return 'fas fa-landmark';
            case 'ahorro': return 'fas fa-piggy-bank';
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
        if (!accountForm || !accountIdInput || !modalTitle || !accountNameInput || !accountTypeInput || !accountBalanceInput || !accountCurrencyInput || !saveButton) {
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
            accountBalanceInput.value = account.balance;
            accountBalanceInput.readOnly = true; // Saldo no editable aquí
            accountBalanceInput.style.backgroundColor = '#e9ecef';
            accountCurrencyInput.value = account.currency;
        } else {
            modalTitle.textContent = 'Añadir Nueva Cuenta';
            accountBalanceInput.readOnly = false; // Editable al añadir
            accountBalanceInput.style.backgroundColor = '#ffffff';
            accountCurrencyInput.value = 'EUR';
        }
        toggleModal(true);
    }

    /** Cierra el modal */
    function closeModal() {
        toggleModal(false);
    }

    /** Muestra las tarjetas de cuenta y calcula saldo total */
    function displayAccounts(accounts) {
        if (!accountList || !noAccountsMessage || !totalBalanceAmount) return; // Verificar elementos

        accountList.innerHTML = '';
        let totalBalance = 0;
        const excludedTypesForTotal = ['tarjeta_credito'];

        if (!accounts || accounts.length === 0) {
            noAccountsMessage.style.display = 'block';
            accountList.style.display = 'none';
            totalBalanceAmount.textContent = formatCurrency(0);
            return;
        }

        noAccountsMessage.style.display = 'none';
        accountList.style.display = 'grid';

        accounts.forEach(acc => {
            if (!excludedTypesForTotal.includes(acc.type)) {
                totalBalance += Number(acc.balance) || 0;
            }

            const card = document.createElement('div');
            card.classList.add('account-card');
            card.setAttribute('data-id', acc.id);
            card.setAttribute('data-type', acc.type);

            const iconClass = getIconForAccountType(acc.type);
            const formattedBalance = formatCurrency(acc.balance, acc.currency);
            let typeText = (acc.type || 'otro').replace('_', ' ');
            typeText = typeText.charAt(0).toUpperCase() + typeText.slice(1);
            if (typeText === 'Tarjeta credito') typeText = 'Tarjeta de Crédito';

            card.innerHTML = `
                <div class="card-header">
                    <span class="account-icon"><i class="${iconClass}"></i></span>
                    <h3 class="account-name">${acc.name || 'Sin Nombre'}</h3>
                </div>
                <div class="card-body">
                    <p class="account-balance">${formattedBalance}</p>
                    <p class="account-type">Tipo: ${typeText}</p>
                </div>
                <div class="card-actions">
                    <button class="btn-icon btn-edit" aria-label="Editar" data-id="${acc.id}"><i class="fas fa-pencil-alt"></i></button>
                    <button class="btn-icon btn-delete" aria-label="Eliminar" data-id="${acc.id}"><i class="fas fa-trash-alt"></i></button>
                </div>
            `;
            accountList.appendChild(card);
        });

        totalBalanceAmount.textContent = formatCurrency(totalBalance);
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
            // Obtener perfil y cuentas en paralelo
            const [profileResponse, accountsResponse] = await Promise.all([
                supabase.from('profiles').select('avatar_url').eq('id', currentUserId).single(),
                supabase.from('accounts').select('*').eq('user_id', currentUserId).order('name', { ascending: true })
            ]);

            // Procesar perfil (avatar)
            const profileData = profileResponse.data;
            const profileError = profileResponse.error;
            if (userAvatarSmall) {
                 if (profileError && profileError.code !== 'PGRST116') {
                      console.warn('Accounts.js: Error cargando avatar:', profileError.message); // Usar warn en lugar de error
                      userAvatarSmall.src = defaultAvatarPath;
                 } else if (profileData && profileData.avatar_url) {
                      userAvatarSmall.src = profileData.avatar_url;
                 } else {
                      userAvatarSmall.src = defaultAvatarPath;
                 }
            }

            // Procesar cuentas
            const accounts = accountsResponse.data;
            const accountsError = accountsResponse.error;
            if (accountsError) throw accountsError; // Lanza error de cuentas

            accountsData = accounts;
            displayAccounts(accountsData);

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
         if (!supabase || !currentUserId || !accountForm || !saveButton) return;

         const accountId = accountIdInput.value;
         const isEditing = !!accountId;
         const originalSaveText = saveButton.textContent;

         // Extraer datos del formulario
         const formData = {
             user_id: currentUserId,
             name: accountNameInput.value.trim(),
             type: accountTypeInput.value,
             // Solo coger balance si NO estamos editando
             balance: isEditing ? undefined : parseFloat(accountBalanceInput.value),
             currency: (accountCurrencyInput.value.trim().toUpperCase() || 'EUR'),
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
                  // Excluimos user_id (controlado por RLS/FK) y balance (no editable aquí)
                  const { error: updateError } = await supabase
                      .from('accounts')
                      .update({ name: formData.name, type: formData.type, currency: formData.currency, updated_at: formData.updated_at })
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

         // Botón Volver (Cabecera)
         if (backButton) {
             backButton.addEventListener('click', () => {
                 console.log('DEBUG: Botón Volver presionado -> Dashboard');
                 window.location.href = '/dashboard_gemini_pixar.html'; // Ruta correcta
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