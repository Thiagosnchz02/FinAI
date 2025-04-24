// categories.js (COMPLETO Y ACTUALIZADO)
// ASEGÚRATE de que este script se carga DESPUÉS de:
// 1. Supabase CDN
// 2. supabase-init.js
// 3. auth-listener.js

console.log('DEBUG: categories.js - Cargado');

if (typeof supabase === 'undefined' || supabase === null) {
    console.error('Categories.js: ¡Error Crítico! Cliente Supabase no inicializado.');
    const loadingMessage = document.getElementById('loadingMessage');
    if(loadingMessage){
        loadingMessage.textContent = 'Error crítico: No se pudo inicializar la conexión.';
        loadingMessage.style.color = 'red';
        loadingMessage.style.display = 'block';
    }
} else {
    console.log('Categories.js: Cliente Supabase encontrado. Procediendo...');

    // --- Selección de Elementos DOM ---
    const categoryList = document.getElementById('categoryList');
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    const categoryModal = document.getElementById('categoryModal');
    const categoryForm = document.getElementById('categoryForm');
    const modalTitleCategory = document.getElementById('modalTitleCategory');
    const categoryIdInput = document.getElementById('categoryId');
    const isDefaultCategoryInput = document.getElementById('isDefaultCategory');
    const categoryNameInput = document.getElementById('categoryName');
    const categoryTypeRadioGasto = document.querySelector('input[name="categoryType"][value="gasto"]');
    const categoryTypeRadioIngreso = document.querySelector('input[name="categoryType"][value="ingreso"]');
    const categoryIconInput = document.getElementById('categoryIcon');
    const categoryColorInput = document.getElementById('categoryColor');
    const cancelCategoryButton = document.getElementById('cancelCategoryButton');
    const categoryIsVariableCheckbox = document.getElementById('categoryIsVariable');
    const saveCategoryButton = document.getElementById('saveCategoryButton');
    const modalCategoryError = document.getElementById('modalCategoryError');
    const noCustomCategoriesMessage = document.getElementById('noCustomCategoriesMessage');
    const loadingMessage = document.getElementById('loadingMessage');
    const scrollTopBtn = document.getElementById('scrollTopBtn');
    const backButton = document.getElementById('backButton');
    const userAvatarSmall = document.getElementById('userAvatarSmall');
    const addAccountFromEmptyBtn = document.getElementById('addAccountFromEmptyBtn'); // Botón del mensaje vacío de Cuentas (asegurar que el ID es único si lo reutilizas aquí) - ¡Revisar si este ID debe estar en esta página! Es de accounts.js

    // --- Variables de Estado ---
    let currentUserId = null;
    let allCategories = []; // Cache local

    // --- URL Avatar por Defecto ---
    // ¡Asegúrate que esta URL es correcta y accesible!
    const defaultAvatarPath = 'https://finai.es/images/avatar_predeterminado.png';

    // --- Funciones Auxiliares ---

    /** Formatea un número como moneda */
    function formatCurrency(value, currency = 'EUR') {
        if (isNaN(value) || value === null) return 'N/A';
        return new Intl.NumberFormat('es-ES', { style: 'currency', currency: currency, minimumFractionDigits: 2 }).format(value);
    }

    /** Mapeo simple de keywords a iconos FA (Ampliar según necesidad) */
    const iconMap = {
        'comida': 'fas fa-utensils', 'transporte': 'fas fa-car', 'coche': 'fas fa-car',
        'casa': 'fas fa-home', 'hogar': 'fas fa-home', 'alquiler': 'fas fa-file-contract',
        'hipoteca': 'fas fa-file-contract', 'compras': 'fas fa-shopping-bag', 'ropa': 'fas fa-tshirt',
        'ocio': 'fas fa-film', 'restaurante': 'fas fa-concierge-bell', 'salud': 'fas fa-heartbeat',
        'medico': 'fas fa-stethoscope', 'farmacia': 'fas fa-pills', 'regalos': 'fas fa-gift',
        'educacion': 'fas fa-graduation-cap', 'libros': 'fas fa-book', 'mascotas': 'fas fa-paw',
        'gimnasio': 'fas fa-dumbbell', 'deporte': 'fas fa-running', 'viajes': 'fas fa-plane-departure',
        'facturas': 'fas fa-file-invoice-dollar', 'telefono': 'fas fa-phone', 'internet': 'fas fa-wifi',
        'agua': 'fas fa-tint', 'luz': 'fas fa-lightbulb', 'gas': 'fas fa-burn', 'transaccion': 'fa-solid fa-money-bill-transfer',
        'nomina': 'fas fa-money-check-alt', 'salario': 'fas fa-money-check-alt', 'freelance': 'fas fa-briefcase',
        'inversion': 'fas fa-chart-line', 'otros': 'fas fa-question-circle', 'default': 'fas fa-tag'
    };
    function getIconClass(iconKeyword) {
        return iconMap[iconKeyword?.toLowerCase()] || (iconKeyword?.startsWith('fa') ? iconKeyword : 'fas fa-tag') ;
    }

     /** Determina si un color de fondo es oscuro para elegir texto blanco/negro */
     function isColorDark(bgColor) {
        if (!bgColor || typeof bgColor !== 'string' || bgColor.length < 4) return false;
        try {
            const color = bgColor.charAt(0) === '#' ? bgColor.substring(1) : bgColor;
            if (color.length !== 6 && color.length !== 3) return false;
            const r = parseInt(color.substring(0, color.length === 3 ? 1 : 2), 16) * (color.length === 3 ? 17 : 1);
            const g = parseInt(color.substring(color.length === 3 ? 1 : 2, color.length === 3 ? 2 : 4), 16) * (color.length === 3 ? 17 : 1);
            const b = parseInt(color.substring(color.length === 3 ? 2 : 4, color.length === 3 ? 3 : 6), 16) * (color.length === 3 ? 17 : 1);
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            return luminance < 0.5;
        } catch (e) {
            console.error("Error parsing color for contrast:", bgColor, e);
            return false;
        }
    }

    // --- Funciones Modales ---
    /** Muestra u oculta el modal con animación */
    function toggleCategoryModal(show) {
        if (!categoryModal) return;
        if (show) {
            categoryModal.style.display = 'flex';
            setTimeout(() => categoryModal.classList.add('active'), 10);
        } else {
            categoryModal.classList.remove('active');
            setTimeout(() => {
                categoryModal.style.display = 'none';
                if (categoryForm) categoryForm.reset(); // Limpiar al cerrar
                // Resetear valores específicos del formulario de categoría
                if (categoryIdInput) categoryIdInput.value = '';
                if (isDefaultCategoryInput) isDefaultCategoryInput.value = 'false';
                if (categoryColorInput) categoryColorInput.value = '#e0e0e0'; // Reset color picker
                if (categoryTypeRadioGasto) categoryTypeRadioGasto.checked = true; // Default a gasto
                if (modalCategoryError) {
                     modalCategoryError.textContent = '';
                     modalCategoryError.style.display = 'none';
                }
            }, 300); // Coincidir con duración de transición CSS
        }
    }

    /** Abre el modal para añadir o editar categoría */
    function openCategoryModal(category = null) {
        if (!categoryForm || !modalTitleCategory || !categoryNameInput || !categoryTypeRadioGasto || !categoryTypeRadioIngreso || !categoryIconInput || !categoryColorInput || !saveCategoryButton || !categoryIdInput || !isDefaultCategoryInput || !categoryIsVariableCheckbox) {
            console.error("Error: Elementos del modal de categoría no encontrados."); return; }
        categoryForm.reset();
        categoryIdInput.value = '';
        isDefaultCategoryInput.value = 'false';
        modalCategoryError.style.display = 'none';
        saveCategoryButton.disabled = false;
        saveCategoryButton.textContent = 'Guardar Categoría';
        saveCategoryButton.style.display = 'inline-flex'; // Asegurar que sea visible por defecto

        // Habilitar campos por defecto (para añadir)
        categoryNameInput.disabled = false;
        categoryTypeRadioGasto.disabled = false;
        categoryTypeRadioIngreso.disabled = false;
        categoryIconInput.disabled = false;
        categoryColorInput.disabled = false;
        categoryIsVariableCheckbox.disabled = false; // <-- Habilitar checkbox
        categoryIsVariableCheckbox.checked = false;

        if (category) { // Modo Edición/Vista
            categoryIdInput.value = category.id;
            categoryNameInput.value = category.name;
            categoryIconInput.value = category.icon || '';
            categoryColorInput.value = category.color || '#e0e0e0';
            if (category.type === 'ingreso') categoryTypeRadioIngreso.checked = true;
            else categoryTypeRadioGasto.checked = true;
            isDefaultCategoryInput.value = category.is_default ? 'true' : 'false';
            categoryIsVariableCheckbox.checked = category.is_variable || false;

            if (category.is_default) { // Si es default, modo solo vista
                 modalTitleCategory.textContent = 'Ver Categoría por Defecto';
                 categoryNameInput.disabled = true;
                 categoryTypeRadioGasto.disabled = true;
                 categoryTypeRadioIngreso.disabled = true;
                 categoryIconInput.disabled = true;
                 categoryColorInput.disabled = true;
                 saveCategoryButton.style.display = 'none';
                 categoryIsVariableCheckbox.disabled = true; // Ocultar botón guardar
            } else { // Si es personalizada, modo edición
                 modalTitleCategory.textContent = 'Editar Categoría';
                 saveCategoryButton.style.display = 'inline-flex'; // Mostrar botón guardar
                 categoryIsVariableCheckbox.disabled = false;
            }
        } else { // Modo Añadir
            modalTitleCategory.textContent = 'Añadir Nueva Categoría';
            categoryTypeRadioGasto.checked = true; // Gasto por defecto
            categoryColorInput.value = '#e0e0e0'; // Color gris por defecto
             isDefaultCategoryInput.value = 'false';
             categoryIsVariableCheckbox.checked = false; // Asegurar desmarcado
             categoryIsVariableCheckbox.disabled = false; // Asegurar habilitado
             saveCategoryButton.style.display = 'inline-flex';
        }
        toggleCategoryModal(true);
    }

    /** Cierra el modal de categoría */
    function closeCategoryModal() {
        toggleCategoryModal(false);
    }

     /** Muestra las píldoras de categoría en la lista */
     // En categories.js

/** Muestra las píldoras de categoría en la lista, separadas por encabezados */
function displayCategories(categories) {
    // Verificar si los elementos necesarios existen en el DOM
    if (!categoryList || !noCustomCategoriesMessage || !loadingMessage) {
        console.error("Error: Elementos UI (categoryList, noCustomMessage, loadingMessage) no encontrados.");
        return;
    }

    categoryList.innerHTML = ''; // Limpiar lista siempre primero

    // Comprobar si hay categorías para mostrar
    if (!categories || categories.length === 0) {
        loadingMessage.style.display = 'none'; // Ocultar "cargando"
        categoryList.style.display = 'none'; // Ocultar el contenedor flex/grid
        // Ajustar mensaje según si está logueado o no
        noCustomCategoriesMessage.textContent = currentUserId ? 'Puedes añadir tus propias categorías personalizadas.' : 'No hay categorías por defecto definidas.';
        noCustomCategoriesMessage.style.display = 'block';
        return;
    }

    // Si llegamos aquí, ocultar mensaje de carga y asegurar que la lista sea visible (flex)
    loadingMessage.style.display = 'none';
    categoryList.style.display = 'flex'; // Asegurar display flex/wrap

    // 1. Separar categorías en dos listas: default y custom
    const defaultCategories = categories.filter(cat => cat.is_default).sort((a,b) => a.name.localeCompare(b.name)); // Ordenar alfabéticamente
    const customCategories = categories.filter(cat => !cat.is_default).sort((a,b) => a.name.localeCompare(b.name)); // Ordenar alfabéticamente

    // 2. Función interna para renderizar una píldora de categoría (evita repetir código)
    const renderCategoryItem = (cat) => {
        const item = document.createElement('div');
        item.classList.add('category-item');
        item.setAttribute('data-id', cat.id);
        item.setAttribute('data-type', cat.type);
        item.setAttribute('data-default', cat.is_default); // Marcar si es default

        // Aplicar color de fondo y calcular color de texto para contraste
        const bgColor = cat.color || '#e0e0e0'; // Usar gris si no hay color
        item.style.backgroundColor = bgColor;
        item.style.color = isColorDark(bgColor) ? '#ffffff' : '#2d3748'; // Texto blanco o oscuro

        const iconClass = getIconClass(cat.icon); // Obtener clase Font Awesome
        const typeIndicator = cat.type === 'ingreso' ? '(Ingreso)' : '(Gasto)';

        // Construir el HTML interno de la píldora
        item.innerHTML = `
            <span class="category-icon"><i class="${iconClass}"></i></span>
            <span class="category-name">${cat.name}</span>
            <div class="category-actions">
                <span class="category-type-indicator">${typeIndicator}</span>
                ${!cat.is_default ? ` <button class="btn-icon btn-edit" aria-label="Editar" data-id="${cat.id}" style="color: inherit;"><i class="fas fa-pencil-alt"></i></button>
                    <button class="btn-icon btn-delete" aria-label="Eliminar" data-id="${cat.id}" style="color: inherit;"><i class="fas fa-trash-alt"></i></button>
                ` : ''}
            </div>
            ${cat.is_default ? '<span class="default-badge" title="Categoría por defecto">Default</span>' : ''} `;
        categoryList.appendChild(item); // Añadir la píldora a la lista
    };

    // 3. Renderizar Encabezado y Categorías por Defecto (si existen)
    if (defaultCategories.length > 0) {
        const headerDefault = document.createElement('h2');
        headerDefault.classList.add('category-section-header'); // Clase para el estilo CSS
        headerDefault.textContent = 'Categorías por Defecto';
        categoryList.appendChild(headerDefault); // Añadir encabezado
        defaultCategories.forEach(renderCategoryItem); // Añadir píldoras default
    }

    // 4. Renderizar Encabezado y Categorías Personalizadas (si existen)
    if (customCategories.length > 0) {
        const headerCustom = document.createElement('h2');
        headerCustom.classList.add('category-section-header'); // Clase para el estilo CSS
        headerCustom.textContent = 'Mis Categorías Personalizadas';
        categoryList.appendChild(headerCustom); // Añadir encabezado
        customCategories.forEach(renderCategoryItem); // Añadir píldoras custom
    }

    // 5. Mostrar mensaje "añade las tuyas" solo si estamos logueados y NO hay personalizadas
    noCustomCategoriesMessage.style.display = (customCategories.length === 0 && currentUserId) ? 'block' : 'none';
    if(customCategories.length === 0 && currentUserId) {
        noCustomCategoriesMessage.textContent = 'Puedes añadir tus propias categorías personalizadas.';
    }
}


    /** Carga las categorías (propias + default o solo default) Y el avatar del usuario */
    async function loadCategoriesAndUser(user) {
        if (!categoryList || !loadingMessage) { console.error("Categories.js: Elementos UI de lista o carga no encontrados."); return; }
        if (!supabase) { loadingMessage.textContent = 'Error: Supabase client no disponible.'; loadingMessage.style.color = 'red'; console.error("Error Fatal: Supabase no inicializado en loadCategoriesAndUser."); return; }

        currentUserId = user?.id || null;

        console.log('Categories.js: Cargando datos. User ID:', currentUserId);
        loadingMessage.style.display = 'block';
        loadingMessage.textContent = 'Cargando categorías...';
        loadingMessage.style.color = '#666';
        noCustomCategoriesMessage.style.display = 'none';
        categoryList.innerHTML = '';
        if(userAvatarSmall) {
            console.log("DEBUG: Estableciendo avatar default inicial.");
            userAvatarSmall.src = defaultAvatarPath;
        } else { console.warn("DEBUG: Elemento userAvatarSmall no encontrado."); }

        try {
            console.log("DEBUG: Entrando al bloque TRY en loadCategoriesAndUser.");
            let profileData = null;

            // --- Fetch Profile only if logged in ---
            if (currentUserId) {
                console.log("DEBUG: Hay User ID, intentando fetch de perfil...");
                const { data: pData, error: pError } = await supabase.from('profiles').select('avatar_url').eq('id', currentUserId).single();
                console.log("DEBUG: Fetch de perfil completado.");
                if (pError && pError.code !== 'PGRST116') { console.warn('DEBUG: Error cargando avatar:', pError.message); }
                profileData = pData;
                if (userAvatarSmall) {
                     userAvatarSmall.src = profileData?.avatar_url || defaultAvatarPath;
                     console.log("DEBUG: Avatar src actualizado (o mantenido default).");
                }
            } else {
                 console.log("DEBUG: No hay User ID, saltando fetch de perfil.");
                 if (userAvatarSmall) userAvatarSmall.src = defaultAvatarPath;
            }

            // --- Fetch Categories Logic ---
            console.log("DEBUG: Construyendo query de categorías...");
            let query = supabase.from('categories').select('*');
            if (currentUserId) {
                query = query.or(`user_id.eq.${currentUserId},is_default.eq.true`);
                console.log("DEBUG: Query para User + Defaults.");
            } else {
                query = query.eq('is_default', true);
                console.log("DEBUG: Query solo para Defaults.");
            }
            query = query.order('type').order('name');
            console.log("DEBUG: Query construida. Ejecutando AWAIT...");

            // LA LLAMADA A SUPABASE
            const { data: categories, error: categoriesError } = await query;
            console.log("DEBUG: AWAIT de query finalizado.");

            if (categoriesError) {
                console.error("DEBUG: Error devuelto por Supabase al hacer fetch de categorías:", categoriesError);
                if (categoriesError.message.includes('Failed to fetch') || categoriesError.message.toLowerCase().includes('cors')) {
                     throw new Error('Error CORS: No se pudo conectar a Supabase. Revisa la configuración CORS.');
                 } else { throw categoriesError; }
            }

            console.log("DEBUG: Fetch de categorías exitoso. Datos:", categories);
            allCategories = categories;
            displayCategories(allCategories);
            console.log("DEBUG: displayCategories llamado.");

        } catch (error) {
            console.error('ERROR GENERAL en loadCategoriesAndUser:', error);
            if(loadingMessage) {
               loadingMessage.textContent = `Error al cargar: ${error.message}`;
               loadingMessage.style.color = 'red';
               loadingMessage.style.display = 'block';
               console.log("DEBUG: Mensaje de error establecido en UI.");
            }
             if(categoryList) categoryList.innerHTML = '';
        } finally {
            console.log("DEBUG: Entrando al bloque FINALLY.");
            if(loadingMessage && loadingMessage.style.color !== 'red') {
                console.log("DEBUG: Ocultando mensaje 'Cargando...'.");
                loadingMessage.style.display = 'none';
            } else if (loadingMessage) {
                 console.log("DEBUG: No se oculta 'Cargando...' porque es un mensaje de error.");
            }
             // Manejo mensaje vacío (gestionado ahora en displayCategories)
             if (categoryList && !categoryList.hasChildNodes() && loadingMessage.style.color !== 'red') {
                 console.log("DEBUG: La lista está vacía y no hubo error.");
                 if(noCustomCategoriesMessage) {
                    noCustomCategoriesMessage.textContent = currentUserId ? 'Puedes añadir tus propias categorías personalizadas.' : 'No hay categorías por defecto definidas.';
                    noCustomCategoriesMessage.style.display = 'block';
                 }
             } else if (noCustomCategoriesMessage){
                 noCustomCategoriesMessage.style.display = 'none'; // Ocultar si hay categorías o error
             }
        }
    }

    /** Maneja el envío del formulario del modal (Añadir o Editar Categoría) */
    async function handleCategoryFormSubmit(event) {
        event.preventDefault();
        if (!supabase || !currentUserId || !categoryForm || !saveCategoryButton || !categoryIsVariableCheckbox) return; // No permitir si no está logueado

        const categoryId = categoryIdInput.value;
        const isEditing = !!categoryId;
        const isDefault = isDefaultCategoryInput.value === 'true';

        if (isDefault) { alert("Las categorías por defecto no se pueden modificar."); return; }

        const originalSaveText = saveCategoryButton.textContent;
        const is_variable_value = categoryIsVariableCheckbox.checked; // true si está marcado, false si no
        const categoryData = {
            user_id: currentUserId, // Asegurar que se asocia al usuario logueado
            name: categoryNameInput.value.trim(),
            type: document.querySelector('input[name="categoryType"]:checked').value,
            icon: categoryIconInput.value.trim() || null,
            color: categoryColorInput.value || '#e0e0e0',
            is_default: false,
            is_variable: is_variable_value
        };

        if (!categoryData.name) { modalCategoryError.textContent = 'El nombre es obligatorio.'; modalCategoryError.style.display = 'block'; return; }
        modalCategoryError.style.display = 'none';
        saveCategoryButton.disabled = true; saveCategoryButton.textContent = isEditing ? 'Guardando...' : 'Creando...';

        try {
            let error;
            if (isEditing) {
                 const { error: updateError } = await supabase.from('categories').update({ name: categoryData.name, type: categoryData.type, icon: categoryData.icon, color: categoryData.color, is_variable: categoryData.is_variable }).eq('id', categoryId).eq('user_id', currentUserId).eq('is_default', false); error = updateError;
            } else { const { error: insertError } = await supabase.from('categories').insert([categoryData]); error = insertError; }
            if (error) throw error;
            console.log(isEditing ? 'Categoría actualizada' : 'Categoría creada');
            closeCategoryModal(); loadCategoriesAndUser({ id: currentUserId }); // Recargar
        } catch (error) { console.error('Error guardando categoría:', error); modalCategoryError.textContent = `Error: ${error.message}`; modalCategoryError.style.display = 'block';
        } finally { saveCategoryButton.disabled = false; saveCategoryButton.textContent = originalSaveText; }
    }

     /** Maneja el clic en el botón de eliminar categoría */
     async function handleDeleteCategory(categoryId) {
         if (!supabase || !currentUserId) return; // Necesita estar logueado
         const categoryToDelete = allCategories.find(cat => cat.id === categoryId);
         if (!categoryToDelete || categoryToDelete.is_default) { alert('Las categorías por defecto no se pueden eliminar.'); return; }
         if (!confirm(`¿Estás SEGURO de que quieres eliminar la categoría "${categoryToDelete.name}"?\nLas transacciones y presupuestos asociados a ella perderán su categoría.`)) return;

         console.log('Intentando eliminar categoría:', categoryId);
         try {
              const { error } = await supabase.from('categories').delete().eq('id', categoryId).eq('user_id', currentUserId).eq('is_default', false);
              if (error) throw error;
              console.log('Categoría eliminada con éxito'); alert('Categoría eliminada.'); loadCategoriesAndUser({ id: currentUserId }); // Recargar
         } catch (error) { console.error('Error eliminando categoría:', error); alert(`Error al eliminar la categoría: ${error.message}`); }
     }

    // --- Asignación de Event Listeners ---

    // Escuchar el evento personalizado 'authReady'
    document.addEventListener('authReady', (e) => {
        console.log('Categories.js: Received authReady event.');
        const user = e.detail.user;
        loadCategoriesAndUser(user);
    });

    // Listeners que dependen de elementos del DOM
    document.addEventListener('DOMContentLoaded', () => {
        console.log("Categories.js: DOM fully loaded.");

        // Botón Añadir Categoría (en cabecera)
        if (addCategoryBtn) addCategoryBtn.addEventListener('click', () => openCategoryModal());

        // Botón Añadir Cuenta del Mensaje Vacío (OJO: ID debe ser único)
        // Si reutilizaste el ID 'addAccountFromEmptyBtn' de la pág de Cuentas, cámbialo en el HTML de categorías
        // a algo como 'addCategoryFromEmptyBtn' y selecciona ese nuevo ID aquí.
        // Por ahora, lo comento para evitar el error si no existe en categories.html:
        // const addCategoryFromEmptyBtn = document.getElementById('addCategoryFromEmptyBtn');
        // if (addCategoryFromEmptyBtn) addCategoryFromEmptyBtn.addEventListener('click', () => openCategoryModal());

        // Cerrar Modal
        if (cancelCategoryButton) cancelCategoryButton.addEventListener('click', closeCategoryModal);
        if (categoryModal) categoryModal.addEventListener('click', (event) => { if (event.target === categoryModal) closeCategoryModal(); });
        // Envío del formulario del Modal
        if (categoryForm) categoryForm.addEventListener('submit', handleCategoryFormSubmit);

        // Listeners para botones Editar/Eliminar (Delegación)
        if (categoryList) {
            categoryList.addEventListener('click', (event) => {
                 const editButton = event.target.closest('.btn-edit');
                 if (editButton) {
                     const categoryId = editButton.dataset.id;
                     const categoryToEdit = allCategories.find(cat => cat.id === categoryId);
                     if (categoryToEdit) openCategoryModal(categoryToEdit);
                     else console.error('No se encontró la categoría para editar con ID:', categoryId);
                     return;
                 }
                 const deleteButton = event.target.closest('.btn-delete');
                 if (deleteButton) {
                     const categoryId = deleteButton.dataset.id;
                     handleDeleteCategory(categoryId);
                     return;
                 }
            });
        }

         // Botón Volver (Cabecera)
         if (backButton) {
             backButton.addEventListener('click', () => {
                 console.log('DEBUG: Botón Volver presionado -> Dashboard');
                 window.location.href = '/Dashboard.html'; // Ruta correcta!
             });
         }

         // Botón Scroll to Top
         if (scrollTopBtn) {
             window.addEventListener('scroll', () => { scrollTopBtn.classList.toggle('visible', window.scrollY > 300); });
             scrollTopBtn.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); });
         }

    }); // Fin DOMContentLoaded

} // Fin del check inicial de Supabase