// profile.js
// ASEGÚRATE de que este script se carga DESPUÉS de:
// 1. La librería Supabase (CDN)
// 2. Tu script supabase-init.js
// 3. Tu script auth-listener.js

console.log('DEBUG: profile.js - Cargado');

// Verificar si Supabase está disponible (inicializado en supabase-init.js)
if (typeof supabase === 'undefined' || supabase === null) {
    console.error('Profile.js: ¡Error Crítico! El cliente Supabase (variable global "supabase") no está definido o no se inicializó correctamente. Asegúrate de que supabase-init.js se cargue antes y sin errores.');
    alert('Error crítico al cargar el perfil. Falta la conexión con Supabase.');
    // Podríamos redirigir a login si esto ocurre
    // window.location.href = '/Login.html';
} else {
    console.log('Profile.js: Cliente Supabase encontrado. Procediendo...');

    // --- Selección de Elementos del DOM ---
    const profileForm = document.getElementById('profileForm');
    const profileNameInput = document.getElementById('profileName');
    const profileEmailInput = document.getElementById('profileEmail');
    const profilePhoneInput = document.getElementById('profilePhone'); // El input que transformará intl-tel-input
    const profileAvatar = document.getElementById('profileAvatar');
    const avatarUploadInput = document.getElementById('avatarUpload');
    const changeAvatarButton = document.getElementById('changeAvatarButton');
    const editSaveButton = document.getElementById('editSaveButton');
    const backButton = document.getElementById('backButton');
    const settingsButton = document.getElementById('settingsButton');
    const changePasswordButton = document.getElementById('changePasswordButton');

    // --- Variables de Estado ---
    let isEditMode = false;
    let currentUserId = null;
    let originalProfileData = {}; // Guarda los datos originales para comparar
    let iti = null; // Instancia de intl-tel-input

    // --- Funciones ---

    /**
     * Inicializa la librería intl-tel-input en el campo de teléfono.
     */
    function initializeIntlTelInput() {
        if (profilePhoneInput) {
            try {
                iti = window.intlTelInput(profilePhoneInput, {
                    utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/19.5.6/js/utils.js", // Necesario!
                    initialCountry: "es", // O "auto" para geolocalización
                    separateDialCode: true,
                    preferredCountries: ['es', 'pt', 'fr', 'gb', 'us', 'mx', 'ar', 'co', 'cl'],
                    autoPlaceholder: "polite",
                    // nationalMode: false, // Importante mantenerlo en false (o no ponerlo) para que getNumber E.164 funcione bien
                });
                console.log("Profile.js: intl-tel-input inicializado.");
                // Establecer como readonly inicialmente
                profilePhoneInput.readOnly = true;
            } catch(error) {
                 console.error("Profile.js: Falló la inicialización de intl-tel-input:", error);
                 alert("Error al cargar el selector de país para el teléfono.");
                 // Podrías querer deshabilitar el campo de teléfono si la librería falla
            }
        } else {
            console.error("Profile.js: Input de teléfono 'profilePhone' no encontrado.");
        }
    }

    /**
     * Carga los datos del usuario autenticado y su perfil desde Supabase.
     */
    async function loadUserProfile() {
        // Asegurarse de que Supabase esté listo antes de intentar usarlo
        if (!supabase) {
            console.error('Profile.js: Supabase no disponible en loadUserProfile.');
            return;
        }
        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();

            if (userError || !user) {
                console.error('Profile.js: Error obteniendo usuario o no hay sesión:', userError);
                if (!window.location.pathname.endsWith('/Login.html')) {
                     window.location.href = '/Login.html';
                }
                return;
            }

            currentUserId = user.id;
            profileEmailInput.value = user.email || '';

            console.log('Profile.js: Cargando perfil para Usuario ID:', currentUserId);

            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('full_name, avatar_url, phone_number')
                .eq('id', currentUserId)
                .single();

            const defaultAvatar = 'https://finai.es/images/avatar_predeterminado.png'; // Ruta a tu avatar por defecto

            if (profileError && profileError.code !== 'PGRST116') {
                console.error('Profile.js: Error cargando perfil desde tabla profiles:', profileError);
                alert('Error al cargar los datos del perfil.');
                profileAvatar.src = defaultAvatar; // Mostrar default incluso con error
            } else if (profileData) {
                console.log('Profile.js: Perfil encontrado:', profileData);
                profileNameInput.value = profileData.full_name || '';
                profileAvatar.src = profileData.avatar_url || defaultAvatar;
                originalProfileData = { ...profileData }; // Guardar datos originales

                if (iti) { // Si la librería de teléfono se inicializó...
                    iti.setNumber(profileData.phone_number || ''); // ...establecer el número
                } else { // Si la librería falló, poner el valor directamente (sin formato)
                    profilePhoneInput.value = profileData.phone_number || '';
                }
            } else {
                console.log('Profile.js: Perfil no encontrado (usuario nuevo?).');
                profileNameInput.value = '';
                profileAvatar.src = defaultAvatar;
                if (iti) iti.setNumber(''); // Limpiar campo de teléfono
                else profilePhoneInput.value = '';
                originalProfileData = { full_name: '', phone_number: null, avatar_url: null }; // Estado inicial
            }

        } catch (error) {
            console.error('Profile.js: Error inesperado cargando perfil:', error);
            alert('Ocurrió un error inesperado al cargar el perfil.');
        } finally {
            toggleEditMode(false); // Asegurar modo vista al final
        }
    }

    /**
     * Activa o desactiva el modo de edición del formulario.
     * @param {boolean} edit - True para activar modo edición, false para modo vista.
     */
    function toggleEditMode(edit) {
        isEditMode = edit;
        profileNameInput.readOnly = !edit;
        profilePhoneInput.readOnly = !edit;
        profileEmailInput.disabled = true; // Email siempre deshabilitado
        changeAvatarButton.style.display = edit ? 'inline-flex' : 'none';

        if (edit) {
            editSaveButton.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
            editSaveButton.type = 'submit';
            profileNameInput.classList.add('editing');
            profilePhoneInput.classList.add('editing'); // Clase al input original
            profileNameInput.focus();
        } else {
            editSaveButton.innerHTML = '<i class="fas fa-pencil-alt"></i> Editar Perfil';
            editSaveButton.type = 'button';
            profileNameInput.classList.remove('editing');
            profilePhoneInput.classList.remove('editing');
        }
        editSaveButton.disabled = false; // Asegurar que esté habilitado al cambiar modo
    }

    /**
     * Maneja el envío del formulario para guardar los cambios del perfil.
     * @param {Event} event - El evento de envío del formulario.
     */
    async function saveProfileChanges(event) {
        event.preventDefault();
        if (!supabase || !currentUserId || !isEditMode || !iti) {
             console.warn("Profile.js: Guardado prevenido. Faltan Supabase, UserID, modo edición o iti.");
             return;
        }

        let fullPhoneNumber = null;
        const phoneInputValue = profilePhoneInput.value.trim();

        // Validar número SOLO si el usuario escribió algo Y la librería está cargada
        if (phoneInputValue && typeof iti?.isValidNumber === 'function') {
            if (iti.isValidNumber()) {
                fullPhoneNumber = iti.getNumber(intlTelInputUtils.numberFormat.E164); // Obtiene +34...
            } else {
                alert('El número de teléfono introducido no parece válido para el país seleccionado.');
                return; // Detener si no es válido
            }
        } else if (!phoneInputValue) {
             fullPhoneNumber = null; // Permitir borrar el número guardando null
        } else {
            // Si hay texto pero la librería no validó (raro), no guardar o mostrar error
             console.warn("Profile.js: Número de teléfono presente pero no se pudo validar con iti.");
             // Podrías intentar guardar profilePhoneInput.value pero no es lo ideal
             // O mostrar un error: alert('Error validando teléfono'); return;
        }

        const newName = profileNameInput.value.trim();
        const originalPhone = originalProfileData.phone_number || null; // Asegurar null si no existía

        // Comprobar si hubo cambios
        if (newName === (originalProfileData.full_name || '') && fullPhoneNumber === originalPhone) {
            console.log('Profile.js: No changes detected.');
            toggleEditMode(false);
            return;
        }

        editSaveButton.disabled = true;
        editSaveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

        try {
            const updates = {
                full_name: newName,
                phone_number: fullPhoneNumber, // Guarda E.164 o null
                updated_at: new Date()
            };

            const { data, error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', currentUserId)
                .select('full_name, phone_number, avatar_url') // Necesitamos avatar_url para originalProfileData
                .single();

            if (error) {
                console.error('Profile.js: Error guardando perfil:', error);
                // ¡Aquí podría saltar el error CORS si aún no está solucionado!
                alert(`Error al guardar los cambios: ${error.message}`);
                 // Revertir campos a los valores originales si falla?
                 profileNameInput.value = originalProfileData.full_name || '';
                 if(iti) iti.setNumber(originalProfileData.phone_number || '');
                 else profilePhoneInput.value = originalProfileData.phone_number || '';

            } else {
                console.log('Profile.js: Perfil actualizado:', data);
                alert('Perfil actualizado correctamente.');
                originalProfileData = { // Actualizar datos originales locales
                    full_name: data.full_name,
                    phone_number: data.phone_number,
                    avatar_url: data.avatar_url // Mantenemos el avatar_url
                 };
                 // Asegurar que el número se muestra formateado tras guardar
                 if (iti) iti.setNumber(data.phone_number || '');
                 else profilePhoneInput.value = data.phone_number || '';
            }
        } catch (error) {
             console.error('Profile.js: Error inesperado guardando perfil:', error);
             alert('Ocurrió un error inesperado al guardar.');
             // Revertir campos?
             profileNameInput.value = originalProfileData.full_name || '';
             if(iti) iti.setNumber(originalProfileData.phone_number || '');
             else profilePhoneInput.value = originalProfileData.phone_number || '';
        } finally {
             toggleEditMode(false); // Volver a modo vista siempre
        }
    }

    /**
     * Maneja la selección y subida de un nuevo archivo de avatar.
     * @param {Event} event - El evento 'change' del input file.
     */
    async function handleAvatarSelected(event) {
         if (!supabase || !currentUserId) return;
         const file = event.target.files[0];
         if (!file) return;

         const maxSize = 5 * 1024 * 1024; // 5MB
         if (file.size > maxSize) {
             alert('El archivo es demasiado grande (máximo 5MB).');
             avatarUploadInput.value = '';
             return;
         }
         if (!file.type.startsWith('image/')) {
             alert('Por favor, selecciona un archivo de imagen.');
             avatarUploadInput.value = '';
             return;
         }

         const changeButtonOriginalContent = changeAvatarButton.innerHTML;
         changeAvatarButton.disabled = true;
         changeAvatarButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
         const avatarPreview = profileAvatar.src; // Guardar src actual por si falla

         try {
             // Mostrar preview local inmediatamente
             const reader = new FileReader();
             reader.onload = (e) => { profileAvatar.src = e.target.result; }
             reader.readAsDataURL(file);

             // Subir a Supabase Storage
             const fileExt = file.name.split('.').pop();
             const filePath = `${currentUserId}/avatar.${fileExt}`; // Sobrescribe el avatar anterior del usuario

             console.log(`Profile.js: Subiendo avatar a: avatars/${filePath}`);
             const { error: uploadError } = await supabase.storage
                 .from('avatars') // Nombre del Bucket (¡debe ser público o tener políticas!)
                 .upload(filePath, file, { upsert: true }); // upsert = true para sobrescribir

             if (uploadError) throw uploadError;

             console.log('Profile.js: Avatar subido. Obteniendo URL pública...');

             // Obtener URL pública (puede ser constante si el path no cambia)
             // Añadimos timestamp para forzar refresco de caché si la URL no cambia
             const { data: urlData } = supabase.storage
                 .from('avatars')
                 .getPublicUrl(filePath);

             let publicUrl = urlData.publicUrl;
              // Forzar refresco de caché añadiendo un timestamp como query param
             publicUrl += '?t=' + new Date().getTime();

             console.log('Profile.js: URL Pública:', publicUrl);

             // Actualizar tabla 'profiles'
             const { error: updateError } = await supabase
                 .from('profiles')
                 .update({ avatar_url: publicUrl, updated_at: new Date() })
                 .eq('id', currentUserId);

             if (updateError) throw updateError;

             // Actualizar datos originales locales
             originalProfileData.avatar_url = publicUrl;
             profileAvatar.src = publicUrl; // Asegurarse que muestra la versión final con timestamp

             alert('Foto de perfil actualizada.');

         } catch (error) {
             console.error('Profile.js: Error subiendo o actualizando avatar:', error);
             alert(`Error al actualizar la foto: ${error.message}`);
             profileAvatar.src = avatarPreview; // Revertir al preview anterior si falla
         } finally {
             changeAvatarButton.disabled = false;
             changeAvatarButton.innerHTML = changeButtonOriginalContent;
             avatarUploadInput.value = ''; // Limpiar input file
         }
    }

    // --- Asignación de Event Listeners ---

    document.addEventListener('DOMContentLoaded', () => {
        // Es importante inicializar la librería DESPUÉS de que el input exista en el DOM
        initializeIntlTelInput();
        // Cargar los datos DESPUÉS de inicializar la librería de teléfono
        loadUserProfile();

        // Asignar listeners a los botones una vez que el DOM está listo
        if (editSaveButton) {
            editSaveButton.addEventListener('click', (e) => {
                if (!isEditMode) {
                    e.preventDefault();
                    toggleEditMode(true);
                }
                // Si es modo edición (type=submit), el listener del form se activa solo
            });
        }

        if (profileForm) {
            profileForm.addEventListener('submit', saveProfileChanges);
        }

        if (changeAvatarButton) {
            changeAvatarButton.addEventListener('click', () => {
                if (avatarUploadInput) avatarUploadInput.click();
            });
        }

        if (avatarUploadInput) {
            avatarUploadInput.addEventListener('change', handleAvatarSelected);
        }

        if (backButton) {
            backButton.addEventListener('click', () => {
                 console.log('DEBUG: Botón Volver presionado');
                 window.location.href = '/Dashboard.html'; // Ir a dashboard
            });
        }

        if (settingsButton) {
            settingsButton.addEventListener('click', () => {
                console.log('DEBUG: Botón Configuración presionado');
                window.location.href = '/Settings.html'; // Ir a página de configuración (pendiente)
            });
        }

        if (changePasswordButton) {
            changePasswordButton.addEventListener('click', () => {
                console.log('DEBUG: Botón Cambiar Contraseña presionado');
                window.location.href = '/Change-password.html'; // Ir a página de cambio de pass (pendiente)
            });
        }
    }); // Fin de DOMContentLoaded

} // Fin del check inicial de Supabase