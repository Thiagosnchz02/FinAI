// Investments.js
// ASEGÚRATE que supabase-init.js y auth-listener.js se cargaron antes

console.log('DEBUG: Investments.js - Cargado');

if (typeof supabase === 'undefined' || supabase === null) {
    console.error('Investments.js: ¡Error Crítico! Cliente Supabase no inicializado.');
    // Manejar error en UI
} else {
    console.log('Investments.js: Cliente Supabase encontrado.');

    // --- Selección de Elementos DOM ---
    const backButton = document.getElementById('backButton');
    const userAvatarSmall = document.getElementById('userAvatarSmall');
    const addInvestmentBtn = document.getElementById('addInvestmentBtn');
    const investmentListContainer = document.getElementById('investmentListContainer');
    const loadingInvestmentsMessage = document.getElementById('loadingInvestmentsMessage');
    const noInvestmentsMessage = document.getElementById('noInvestmentsMessage');
    const addInvestmentFromEmptyBtn = document.getElementById('addInvestmentFromEmptyBtn');
    // Summary Footer
    const investmentSummaryFooter = document.getElementById('investmentSummaryFooter');
    const totalCurrentValueEl = document.getElementById('totalCurrentValue');
    const totalProfitLossEl = document.getElementById('totalProfitLoss');
    // Modal
    const investmentModal = document.getElementById('investmentModal');
    const investmentForm = document.getElementById('investmentForm');
    const modalTitleInvestment = document.getElementById('modalTitleInvestment');
    const investmentIdInput = document.getElementById('investmentId');
    const investmentTypeInput = document.getElementById('investmentType');
    const investmentNameInput = document.getElementById('investmentName');
    const investmentSymbolInput = document.getElementById('investmentSymbol');
    const investmentQuantityInput = document.getElementById('investmentQuantity');
    const investmentPurchasePriceInput = document.getElementById('investmentPurchasePrice');
    const investmentPurchaseDateInput = document.getElementById('investmentPurchaseDate');
    const investmentCurrentValueInput = document.getElementById('investmentCurrentValue');
    const investmentBrokerInput = document.getElementById('investmentBroker');
    const investmentNotesInput = document.getElementById('investmentNotes');
    const cancelInvestmentButton = document.getElementById('cancelInvestmentButton');
    const saveInvestmentButton = document.getElementById('saveInvestmentButton');
    const modalInvestmentError = document.getElementById('modalInvestmentError');
    // Otros
    const scrollTopBtn = document.getElementById('scrollTopBtn');

    // --- Variables de Estado ---
    let currentUserId = null;
    let currentUser = null;
    let investmentsData = []; // Cache local
    let isLoading = false;

    // --- Constantes ---
    const defaultAvatarPath = 'https://finai.es/images/avatar_predeterminado.png';

    // --- Funciones Auxiliares ---
    function formatCurrency(value, currency = 'EUR') {
         if (isNaN(value) || value === null) return '€0.00';
         try { return new Intl.NumberFormat('es-ES', { style: 'currency', currency: currency, minimumFractionDigits: 2 }).format(value); }
         catch (e) { return `${Number(value).toFixed(2)} ${currency}`; }
     }
    function formatDate(dateString, options = { day: 'numeric', month: 'short', year: 'numeric' }) { // Formato corto para tarjetas
         if (!dateString) return '';
         try {
             const date = new Date(dateString);
             const offset = date.getTimezoneOffset();
             const adjustedDate = new Date(date.getTime() + (offset * 60 * 1000));
             if (isNaN(adjustedDate.getTime())) return '';
             // Intl.DateTimeFormat es más flexible para formatos localizados
             return new Intl.DateTimeFormat('es-ES', options).format(adjustedDate);
         } catch (e) { console.error("Error formateando fecha:", dateString, e); return ''; }
     }
    function getIconForInvestmentType(type) {
         switch (type) {
             case 'acciones': return 'fas fa-chart-line';
             case 'fondo': return 'fas fa-seedling';
             case 'crypto': return 'fab fa-bitcoin'; // Asegúrate de tener Font Awesome Brands
             case 'inmueble': return 'fas fa-home';
             case 'otro': return 'fas fa-question-circle';
             default: return 'fas fa-dollar-sign';
         }
     }

    // --- Funciones Principales ---
    function setLoadingState(loading) {
         isLoading = loading;
         // Deshabilitar botones mientras carga
         if(addInvestmentBtn) addInvestmentBtn.disabled = loading;
         if(addInvestmentFromEmptyBtn) addInvestmentFromEmptyBtn.disabled = loading;
         // Opcional: atenuar lista
         if(investmentListContainer) investmentListContainer.style.opacity = loading ? 0.5 : 1;
         console.log(`Loading state: ${loading}`);
     }

    /** Muestra las tarjetas de inversión y calcula resumen */
    function displayInvestments(investments) {
        if (!investmentListContainer || !noInvestmentsMessage || !loadingInvestmentsMessage || !investmentSummaryFooter || !totalCurrentValueEl || !totalProfitLossEl) return;

        investmentListContainer.innerHTML = ''; // Limpiar antes
        let totalCurrentValue = 0;
        let totalPurchaseValue = 0;

        if (!investments || investments.length === 0) {
            noInvestmentsMessage.style.display = 'block';
            loadingInvestmentsMessage.style.display = 'none';
            investmentSummaryFooter.style.display = 'none'; // Ocultar footer si no hay nada
            return;
        }

        noInvestmentsMessage.style.display = 'none';
        loadingInvestmentsMessage.style.display = 'none';
        investmentSummaryFooter.style.display = 'grid'; // Mostrar footer

        investments.sort((a, b) => (a.name || '').localeCompare(b.name || '')); // Ordenar por nombre

        investments.forEach(inv => {
            const card = document.createElement('div');
            card.classList.add('investment-card');
            card.setAttribute('data-id', inv.id);
            card.setAttribute('data-type', inv.type);

            const iconClass = getIconForInvestmentType(inv.type);
            const quantity = Number(inv.quantity) || 0; // Usar 0 si es null/NaN
            const purchasePrice = Number(inv.purchase_price) || 0;
            const currentValue = Number(inv.current_value) || 0;

            // Calcular valores derivados
            const purchaseTotalValue = quantity * purchasePrice;
            const profitLoss = currentValue - purchaseTotalValue;
            const profitLossClass = profitLoss > 0 ? 'profit' : (profitLoss < 0 ? 'loss' : 'neutral');
            const profitLossSign = profitLoss > 0 ? '+' : ''; // Añadir + si es positivo

            // Actualizar totales globales
            totalCurrentValue += currentValue;
            totalPurchaseValue += purchaseTotalValue;

            card.innerHTML = `
                <div class="investment-card-header">
                    <div class="investment-icon-container"><i class="${iconClass}"></i></div>
                    <div class="investment-header-info">
                        <h3 class="investment-name">${inv.name}</h3>
                        ${inv.symbol ? `<span class="investment-symbol">${inv.symbol}</span>` : ''}
                        <span class="investment-type-badge">${inv.type}</span>
                    </div>
                </div>
                <div class="investment-card-body">
                    <div class="info-item"> <span class="info-label">Cantidad</span> <span class="info-value">${quantity.toLocaleString('es-ES')}</span> </div>
                    <div class="info-item"> <span class="info-label">P. Compra Unit.</span> <span class="info-value">${formatCurrency(purchasePrice)}</span> </div>
                    <div class="info-item"> <span class="info-label">Valor Compra</span> <span class="info-value">${formatCurrency(purchaseTotalValue)}</span> </div>
                    <div class="info-item"> <span class="info-label">Valor Actual</span> <span class="info-value important">${formatCurrency(currentValue)}</span> </div>
                    <div class="info-item"> <span class="info-label">Gan./Pérd.</span> <span class="info-value ${profitLossClass}">${profitLossSign}${formatCurrency(profitLoss)}</span> </div>
                    <div class="info-item"> <span class="info-label">Fecha Compra</span> <span class="info-value">${formatDate(inv.purchase_date)}</span> </div>
                </div>
                <div class="investment-card-footer">
                    <span class="investment-broker">${inv.broker || ''}</span>
                    <div class="investment-actions">
                        <button class="btn-icon btn-edit" title="Editar" data-id="${inv.id}"><i class="fas fa-pencil-alt"></i></button>
                        <button class="btn-icon btn-delete" title="Eliminar" data-id="${inv.id}"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
            `;
            investmentListContainer.appendChild(card);
        });

        // Mostrar resumen total
        const totalProfitLoss = totalCurrentValue - totalPurchaseValue;
        totalCurrentValueEl.textContent = formatCurrency(totalCurrentValue);
        totalProfitLossEl.textContent = (totalProfitLoss >= 0 ? '+' : '') + formatCurrency(totalProfitLoss);
        totalProfitLossEl.className = totalProfitLoss >= 0 ? 'positive' : 'negative';

    }

    /** Carga inicial: avatar + inversiones */
    async function loadInitialData(user) {
        if (!user) { console.log("Investments.js: No user session"); return; }
        currentUserId = user.id;
        if(loadingInvestmentsMessage) loadingInvestmentsMessage.style.display = 'block';
        if(noInvestmentsMessage) noInvestmentsMessage.style.display = 'none';
        if(investmentListContainer) investmentListContainer.innerHTML = '';
        if(investmentSummaryFooter) investmentSummaryFooter.style.display = 'none';
        if(userAvatarSmall) userAvatarSmall.src = defaultAvatarPath;
        console.log("Investments.js: Loading data for user:", currentUserId);
        setLoadingState(true);

        try {
            const [profileRes, investmentsRes] = await Promise.all([
                supabase.from('profiles').select('avatar_url').eq('id', currentUserId).single(),
                supabase.from('investments').select('*').eq('user_id', currentUserId).order('name')
            ]);

            // Avatar
            if (userAvatarSmall) userAvatarSmall.src = profileRes.data?.avatar_url || defaultAvatarPath;

            // Inversiones
            if (investmentsRes.error) throw investmentsRes.error;
            investmentsData = investmentsRes.data || [];
            displayInvestments(investmentsData);

        } catch (error) {
             console.error("Error cargando datos iniciales (Investments):", error);
             if(loadingInvestmentsMessage) loadingInvestmentsMessage.textContent = `Error: ${error.message}`;
             if(noInvestmentsMessage) noInvestmentsMessage.style.display = 'block';
        } finally {
             if(loadingInvestmentsMessage && loadingInvestmentsMessage.textContent.startsWith('Cargando')) loadingInvestmentsMessage.style.display = 'none';
              setLoadingState(false);
        }
    }

    // --- Funciones Modales y CRUD (Esqueleto) ---
    function toggleInvestmentModal(show) {
        if (!investmentModal) { console.error("Modal #investmentModal no encontrado"); return;}
        if (show) {
            investmentModal.style.display = 'flex';
            setTimeout(() => investmentModal.classList.add('active'), 10);
        } else {
            investmentModal.classList.remove('active');
            setTimeout(() => {
                investmentModal.style.display = 'none';
                if (investmentForm) investmentForm.reset();
                if (investmentIdInput) investmentIdInput.value = '';
                if (modalInvestmentError) {
                     modalInvestmentError.textContent = '';
                     modalInvestmentError.style.display = 'none';
                }
                // Resetear campos específicos si es necesario, ej: select de tipo
                if (investmentTypeInput) investmentTypeInput.value = '';
            }, 300); // Duración de la transición CSS
        }
    }
    function openInvestmentModal(investment = null) {
        // Verificar que todos los inputs necesarios existen
        if (!investmentForm || !modalTitleInvestment || !investmentIdInput || !investmentTypeInput || !investmentNameInput || !investmentSymbolInput || !investmentQuantityInput || !investmentPurchasePriceInput || !investmentPurchaseDateInput || !investmentCurrentValueInput || !investmentBrokerInput || !investmentNotesInput || !saveInvestmentButton) {
            console.error("Error: Elementos del modal de inversión no encontrados.");
            alert("Error al abrir el formulario de inversión.");
            return;
        }

        investmentForm.reset(); // Limpiar formulario
        investmentIdInput.value = '';
        modalInvestmentError.style.display = 'none';
        saveInvestmentButton.disabled = false;
        saveInvestmentButton.textContent = 'Guardar Inversión';

        if (investment) { // Modo Edición
            modalTitleInvestment.textContent = 'Editar Inversión';
            investmentIdInput.value = investment.id;
            investmentTypeInput.value = investment.type;
            investmentNameInput.value = investment.name;
            investmentSymbolInput.value = investment.symbol || '';
            investmentQuantityInput.value = investment.quantity ?? ''; // Usar ?? para manejar null/undefined -> ''
            investmentPurchasePriceInput.value = investment.purchase_price ?? '';
            investmentPurchaseDateInput.value = investment.purchase_date || ''; // Formato YYYY-MM-DD
            investmentCurrentValueInput.value = investment.current_value ?? ''; // ¡Importante! El valor actual total
            investmentBrokerInput.value = investment.broker || '';
            investmentNotesInput.value = investment.notes || '';
        } else { // Modo Añadir
            modalTitleInvestment.textContent = 'Añadir Nueva Inversión';
            // Poner valores por defecto si se desea, ej:
            // investmentTypeInput.value = 'acciones';
        }
        toggleInvestmentModal(true); // Mostrar el modal
        setTimeout(() => investmentNameInput.focus(), 350); // Enfocar primer campo útil
    }
    function closeInvestmentModal() {
    toggleInvestmentModal(false);
    }
    async function handleInvestmentFormSubmit(event) {
        event.preventDefault();
        if (isLoading || !currentUserId || !supabase) return;

        const investmentId = investmentIdInput.value;
        const isEditing = !!investmentId;
        const originalButtonText = saveInvestmentButton.textContent;

        // Recoger datos del formulario
        const formData = {
            // user_id se añade automáticamente por RLS en insert, o se usa en eq() para update
            type: investmentTypeInput.value,
            name: investmentNameInput.value.trim(),
            symbol: investmentSymbolInput.value.trim() || null, // null si está vacío
            // Convertir a número o null. Usar null si está vacío o no es número válido.
            quantity: investmentQuantityInput.value ? parseFloat(investmentQuantityInput.value) : null,
            purchase_price: investmentPurchasePriceInput.value ? parseFloat(investmentPurchasePriceInput.value) : null,
            purchase_date: investmentPurchaseDateInput.value || null, // null si está vacío
            current_value: investmentCurrentValueInput.value ? parseFloat(investmentCurrentValueInput.value) : null, // Puede ser 0, así que no usar || 0
            broker: investmentBrokerInput.value.trim() || null,
            notes: investmentNotesInput.value.trim() || null
        };

        // Validaciones
        if (!formData.type || !formData.name) {
            modalInvestmentError.textContent = 'Tipo y Nombre del Activo son obligatorios.'; modalInvestmentError.style.display = 'block'; return;
        }
        // Validar que los campos numéricos sean números válidos si se introdujeron
        if (formData.quantity !== null && isNaN(formData.quantity)) { modalInvestmentError.textContent = 'La cantidad debe ser un número.'; modalInvestmentError.style.display = 'block'; return; }
        if (formData.purchase_price !== null && isNaN(formData.purchase_price)) { modalInvestmentError.textContent = 'El precio de compra debe ser un número.'; modalInvestmentError.style.display = 'block'; return; }
        if (formData.current_value === null || isNaN(formData.current_value)) { // Permitimos 0, pero no vacío/NaN
             modalInvestmentError.textContent = 'El Valor Actual Total es obligatorio y debe ser un número.'; modalInvestmentError.style.display = 'block'; return;
        }
        // Añadir validaciones de >= 0 si es necesario en los campos numéricos
        if ((formData.quantity !== null && formData.quantity < 0) || (formData.purchase_price !== null && formData.purchase_price < 0) || (formData.current_value !== null && formData.current_value < 0)) {
             modalInvestmentError.textContent = 'Cantidad, Precio Compra y Valor Actual no pueden ser negativos.'; modalInvestmentError.style.display = 'block'; return;
        }


        modalInvestmentError.style.display = 'none';
        setLoadingState(true);
        saveInvestmentButton.disabled = true;
        saveInvestmentButton.textContent = isEditing ? 'Guardando...' : 'Creando...';

        try {
            let result;
            if (isEditing) {
                // UPDATE: Añadir timestamp y quitar user_id
                const updateData = { ...formData, updated_at: new Date() };
                 // No incluimos user_id en el update, se usa en el .eq()
                result = await supabase.from('investments')
                    .update(updateData)
                    .eq('id', investmentId)
                    .eq('user_id', currentUserId); // Importante para RLS/seguridad

            } else {
                // INSERT: Añadir user_id
                const insertData = { ...formData, user_id: currentUserId };
                result = await supabase.from('investments').insert([insertData]);
            }

            const { error } = result;
            if (error) throw error;

            console.log(isEditing ? 'Inversión actualizada' : 'Inversión creada');
            closeInvestmentModal();
            loadInitialData(currentUser); // Recargar la lista

        } catch (error) {
             console.error('Error guardando inversión:', error);
             modalInvestmentError.textContent = `Error: ${error.message}`;
             modalInvestmentError.style.display = 'block';
        } finally {
             setLoadingState(false);
             saveInvestmentButton.disabled = false;
             saveInvestmentButton.textContent = originalButtonText;
        }
    }
    async function handleDeleteInvestment(investmentId) {
        if (isLoading || !currentUserId || !supabase || !investmentId) return;

        const investmentToDelete = investmentsData.find(inv => inv.id === investmentId);
        if (!investmentToDelete) return; // No debería pasar si se llama desde el botón correcto

        if (!confirm(`¿Estás seguro de que quieres eliminar la inversión "${investmentToDelete.name}"?`)) {
            return;
        }

        console.log("Eliminando inversión:", investmentId);
        setLoadingState(true);

        try {
            const { error } = await supabase
                .from('investments')
                .delete()
                .eq('id', investmentId)
                .eq('user_id', currentUserId); // Seguridad

            if (error) throw error;

            console.log("Inversión eliminada.");
            alert("Inversión eliminada correctamente.");
            loadInitialData(currentUser); // Recargar la lista

        } catch (error) {
            console.error("Error eliminando inversión:", error);
            alert(`Error al eliminar: ${error.message}`);
        } finally {
            setLoadingState(false);
        }
    }

    // --- Asignación de Event Listeners ---
    document.addEventListener('authReady', (e) => {
        console.log('Investments.js: Received authReady event.');
        currentUser = e.detail.user;
        currentUserId = currentUser?.id;
        if (currentUserId) { loadInitialData(currentUser); }
        else { console.warn("Investments.js: No user session."); /* Manejar UI no logueado */ }
    });

    document.addEventListener('DOMContentLoaded', () => {
         console.log("Investments.js: DOM fully loaded.");
         if (backButton) backButton.addEventListener('click', () => { if (!isLoading) window.location.href = '/Dashboard.html'; });
         if (addInvestmentBtn) addInvestmentBtn.addEventListener('click', () => openInvestmentModal());
         if (addInvestmentFromEmptyBtn) addInvestmentFromEmptyBtn.addEventListener('click', () => openInvestmentModal());

         // Modal Listeners (Implementación Pendiente)
         if (cancelInvestmentButton) cancelInvestmentButton.addEventListener('click', closeInvestmentModal);
         if (investmentModal) investmentModal.addEventListener('click', (event) => { if (event.target === investmentModal) closeInvestmentModal(); });
         if (investmentForm) investmentForm.addEventListener('submit', handleInvestmentFormSubmit);

         // Delegación Lista (Implementación Pendiente)
         if (investmentListContainer) {
             investmentListContainer.addEventListener('click', (event) => {
                 const editBtn = event.target.closest('.btn-edit');
                 if (editBtn) {
                    const id = editBtn.dataset.id;
                    const investment = investmentsData.find(inv => inv.id === id);
                    if(investment) openInvestmentModal(investment);
                    return;
                 }
                 const deleteBtn = event.target.closest('.btn-delete');
                 if (deleteBtn) {
                    const id = deleteBtn.dataset.id;
                    handleDeleteInvestment(id);
                    return;
                 }
             });
         }

         // Scroll top
         if (scrollTopBtn) { window.addEventListener('scroll', () => { scrollTopBtn.classList.toggle('visible', window.scrollY > 300); }); scrollTopBtn.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); }); }

    }); // Fin DOMContentLoaded

} // Fin check Supabase