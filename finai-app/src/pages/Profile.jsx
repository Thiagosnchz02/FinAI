/*
Archivo: src/pages/Profile.jsx
Propósito: Componente para la página de visualización y edición del perfil de usuario.
*/
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient'; // Asegúrate que la ruta sea correcta

// Importa imágenes
import finAiLogo from '../assets/Logo_FinAI_Oficial.png'; // Asegúrate que la ruta sea correcta
import defaultAvatar from '../assets/avatar_predeterminado.png'; // Asegúrate que la ruta sea correcta

// --- NOTAS IMPORTANTES ---
// 1. Input Teléfono: Se usa un input de texto simple. Se recomienda 'react-phone-number-input'
//    para una mejor experiencia y validación: npm install react-phone-number-input
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
<PhoneInput placeholder="Introduce tu teléfono" value={profileData.phone} onChange={(value) => setProfileData(p => ({...p, phone: value}))} defaultCountry="ES" readOnly={!isEditing} />

function Profile() {
    // --- Estado del Componente ---
    const [isEditing, setIsEditing] = useState(false); // Controla el modo edición/vista
    const [profileData, setProfileData] = useState({ // Datos del perfil (desde Supabase)
        fullName: '',
        email: '', // Email se obtiene de auth, no de 'profiles' típicamente
        phone: '', // Número de teléfono (sin formato intl-tel-input por ahora)
        avatarUrl: defaultAvatar, // URL del avatar actual
    });
    const [originalProfileData, setOriginalProfileData] = useState({}); // Para comparar cambios
    const [userId, setUserId] = useState(null); // ID del usuario autenticado
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [avatarFile, setAvatarFile] = useState(null); // Archivo seleccionado para nuevo avatar
    const [avatarPreview, setAvatarPreview] = useState(defaultAvatar); // Preview del avatar (actual o nuevo)
    const [message, setMessage] = useState(''); // Mensajes para el usuario (éxito/error)
    const [messageType, setMessageType] = useState(''); // 'success' o 'error'

    const navigate = useNavigate();
    const fileInputRef = useRef(null); // Referencia al input file oculto

    // --- Efecto para Cargar Datos Iniciales ---
    useEffect(() => {
        let isMounted = true; // Flag para evitar actualizaciones en componente desmontado

        const fetchProfileData = async () => {
            setIsLoading(true);
            setMessage('');
            try {
                // 1. Obtener usuario autenticado
                const { data: { user }, error: userError } = await supabase.auth.getUser();

                if (userError || !user) {
                    console.error('Profile.js: Error obteniendo usuario o no hay sesión:', userError);
                    if (isMounted) navigate('/login'); // Redirigir a login si no hay usuario
                    return;
                }

                if (!isMounted) return; // Salir si el componente se desmontó mientras se esperaba
                setUserId(user.id);
                setProfileData(prev => ({ ...prev, email: user.email || '' })); // Guardar email

                // 2. Obtener perfil de la tabla 'profiles'
                console.log('Profile.js: Cargando perfil para Usuario ID:', user.id);
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('full_name, avatar_url, phone_number')
                    .eq('id', user.id)
                    .single();

                if (!isMounted) return;

                if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = 'No rows returned' (usuario nuevo)
                    console.error('Profile.js: Error cargando perfil desde tabla profiles:', profileError);
                    setMessage('Error al cargar los datos del perfil.');
                    setMessageType('error');
                    setProfileData(prev => ({ ...prev, avatarUrl: defaultAvatar })); // Usar avatar por defecto
                    setAvatarPreview(defaultAvatar);
                    setOriginalProfileData({ full_name: '', phone_number: null, avatar_url: defaultAvatar });
                } else if (profile) {
                    console.log('Profile.js: Perfil encontrado:', profile);
                    const currentData = {
                        fullName: profile.full_name || '',
                        email: user.email || '', // Asegurar email de auth
                        phone: profile.phone_number || '', // Guardar como string simple
                        avatarUrl: profile.avatar_url || defaultAvatar,
                    };
                    setProfileData(currentData);
                    setAvatarPreview(currentData.avatarUrl);
                    // Guardar datos originales para comparar al guardar
                    setOriginalProfileData({
                        full_name: profile.full_name || '',
                        phone_number: profile.phone_number || null, // Guardar null si no hay
                        avatar_url: profile.avatar_url || null
                    });
                } else {
                     console.log('Profile.js: Perfil no encontrado (usuario nuevo?).');
                     const initialData = { fullName: '', email: user.email || '', phone: '', avatarUrl: defaultAvatar };
                     setProfileData(initialData);
                     setAvatarPreview(defaultAvatar);
                     setOriginalProfileData({ full_name: '', phone_number: null, avatar_url: null });
                }

            } catch (error) {
                console.error('Profile.js: Error inesperado cargando perfil:', error);
                if (isMounted) {
                    setMessage('Ocurrió un error inesperado al cargar el perfil.');
                    setMessageType('error');
                    setProfileData(prev => ({ ...prev, avatarUrl: defaultAvatar }));
                    setAvatarPreview(defaultAvatar);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchProfileData();

        // Función de limpieza para evitar setear estado si el componente se desmonta
        return () => {
            isMounted = false;
        };
    }, [navigate]); // navigate como dependencia por si redirige

    // --- Efecto para actualizar preview cuando cambia avatarFile ---
    useEffect(() => {
      if (avatarFile) {
          const reader = new FileReader();
          reader.onloadend = () => setAvatarPreview(reader.result);
          reader.readAsDataURL(avatarFile);
      } else if (!isEditing) {
           setAvatarPreview(profileData.avatarUrl || defaultAvatar);
      }
  }, [avatarFile, isEditing, profileData.avatarUrl]);


    // --- Manejadores de Eventos ---

    // Activa/Desactiva modo edición
    const handleEditToggle = useCallback(() => {
        if (isEditing) {
            // Al salir del modo edición (Cancelar)
            setAvatarFile(null); // Descarta el archivo seleccionado
            setAvatarPreview(profileData.avatarUrl || defaultAvatar); // Restaura preview original
            // Restaura los datos del formulario a los originales
            setProfileData(prev => ({
                ...prev,
                fullName: originalProfileData.full_name || '',
                phone: originalProfileData.phone_number || '', // Usar el original guardado
            }));
            console.log("Cancelando edición / Volviendo a modo vista");
        } else {
            // Al entrar en modo edición
            // Los datos originales ya están guardados, no hace falta hacer nada más aquí
             console.log("Entrando en modo edición");
        }
        setIsEditing(prev => !prev);
        setMessage(''); // Limpiar mensajes
    }, [isEditing, profileData.avatarUrl, originalProfileData]);

    // Guarda los cambios del perfil
    const handleSaveProfile = useCallback(async (event) => {
        event.preventDefault();
        if (!userId || !isEditing) return;

        setIsSaving(true);
        setMessage('');

        const newName = profileData.fullName.trim();
        const newPhone = profileData.phone.trim() ? profileData.phone.trim() : null; // Guardar null si está vacío

        // Comprobar si hubo cambios en nombre o teléfono
        const nameChanged = newName !== (originalProfileData.full_name || '');
        const phoneChanged = newPhone !== (originalProfileData.phone_number || null);
        const avatarChanged = !!avatarFile; // Hay un nuevo archivo de avatar seleccionado

        if (!nameChanged && !phoneChanged && !avatarChanged) {
            console.log('Profile.js: No changes detected.');
            setIsEditing(false); // Salir del modo edición
            setIsSaving(false);
            return;
        }

        console.log("Guardando perfil...", { newName, newPhone, avatarChanged });

        try {
            let newAvatarUrl = profileData.avatarUrl; // Mantener URL actual por defecto

            // 1. Subir nuevo avatar si existe
            if (avatarFile) {
                const fileExt = avatarFile.name.split('.').pop();
                const filePath = `${userId}/avatar.${fileExt}`; // Ruta única por usuario
                console.log(`Profile.js: Subiendo avatar a: avatars/${filePath}`);

                const { error: uploadError } = await supabase.storage
                    .from('avatars') // Nombre del Bucket
                    .upload(filePath, avatarFile, { upsert: true }); // upsert = true para sobrescribir

                if (uploadError) throw new Error(`Error al subir avatar: ${uploadError.message}`);

                // Obtener URL pública (con timestamp para caché)
                const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
                if (!urlData || !urlData.publicUrl) throw new Error('No se pudo obtener la URL pública del avatar.');

                newAvatarUrl = `${urlData.publicUrl}?t=${new Date().getTime()}`; // Añadir timestamp
                console.log('Profile.js: Nueva URL Pública:', newAvatarUrl);
            }

            // 2. Actualizar datos del perfil en la tabla 'profiles' si algo cambió
            if (nameChanged || phoneChanged || (avatarChanged && newAvatarUrl !== profileData.avatarUrl)) {
                 const updates = {
                    full_name: newName,
                    phone_number: newPhone, // Guardar string o null
                    avatar_url: newAvatarUrl, // Guardar nueva o la misma URL
                    updated_at: new Date()
                };
                console.log("Actualizando tabla profiles:", updates);
                const { data: updatedProfile, error: updateError } = await supabase
                    .from('profiles')
                    .update(updates)
                    .eq('id', userId)
                    .select('full_name, phone_number, avatar_url') // Devolver datos actualizados
                    .single();

                if (updateError) throw new Error(`Error al guardar perfil: ${updateError.message}`);

                console.log('Profile.js: Perfil actualizado en DB:', updatedProfile);
                // Actualizar estado local y datos originales con la info de la DB
                setProfileData(prev => ({
                    ...prev, // Mantener email
                    fullName: updatedProfile.full_name || '',
                    phone: updatedProfile.phone_number || '',
                    avatarUrl: updatedProfile.avatar_url || defaultAvatar
                }));
                setOriginalProfileData({ // Actualizar base para futuras comparaciones
                    full_name: updatedProfile.full_name || '',
                    phone_number: updatedProfile.phone_number || null,
                    avatar_url: updatedProfile.avatar_url || null
                });
                setAvatarPreview(updatedProfile.avatar_url || defaultAvatar); // Asegurar preview actualizado
            }

            setMessage('Perfil actualizado correctamente.');
            setMessageType('success');
            setIsEditing(false); // Salir del modo edición
            setAvatarFile(null); // Limpiar archivo seleccionado

        } catch (error) {
            console.error('Profile.js: Error guardando perfil:', error);
            setMessage(error.message || 'Ocurrió un error inesperado al guardar.');
            setMessageType('error');
            // Opcional: Revertir preview si la subida/guardado falló
             if (avatarChanged) {
                 setAvatarPreview(profileData.avatarUrl || defaultAvatar);
             }
        } finally {
            setIsSaving(false);
        }
    }, [userId, isEditing, profileData, originalProfileData, avatarFile, supabase]); // Incluir supabase como dependencia

    // Maneja cambios en los inputs del formulario
    const handleInputChange = useCallback((event) => {
        const { name, value } = event.target;
        setProfileData(prevData => ({
            ...prevData,
            [name]: value,
        }));
    }, []);

    // Simula click en el input file oculto
    const handleAvatarButtonClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    // Maneja la selección de un nuevo archivo de avatar
    const handleAvatarFileChange = useCallback((event) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            // Validación simple (opcional, se puede hacer más robusta)
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (file.size > maxSize) {
                setMessage('El archivo es demasiado grande (máximo 5MB).');
                setMessageType('error');
                setAvatarFile(null);
                event.target.value = ''; // Limpiar input
                return;
            }
            if (!file.type.startsWith('image/')) {
                setMessage('Por favor, selecciona un archivo de imagen.');
                setMessageType('error');
                setAvatarFile(null);
                event.target.value = ''; // Limpiar input
                return;
            }
            // Si pasa validación
            setAvatarFile(file);
            setMessage(''); // Limpiar mensaje de error previo
            // La preview se actualiza en el useEffect [avatarFile]
        }
    }, []);

    // Navegación
    const handleChangePasswordClick = useCallback(() => navigate('/change-password'), [navigate]);
    const handleSettingsClick = useCallback(() => navigate('/settings'), [navigate]);
    const handleLogout = useCallback(async () => {
        setIsLoading(true); // Mostrar indicador mientras se cierra sesión
        console.log('Cerrando sesión...');
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            // El listener de auth en App.js o similar debería detectar el cambio y redirigir
            // Si no, se puede forzar aquí: navigate('/login');
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
            setMessage("Error al cerrar sesión.");
            setMessageType("error");
            setIsLoading(false); // Ocultar indicador si falla
        }
        // No poner setIsLoading(false) aquí, la redirección desmontará el componente
    }, [navigate, supabase]); // Incluir supabase
    const handleBack = useCallback(() => navigate(-1), [navigate]); // O a /dashboard

    // --- Renderizado ---
    if (isLoading && !userId) { // Mostrar carga solo al inicio, no al guardar
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <p>Cargando perfil...</p> {/* O un spinner */}
            </div>
        );
    }

    return (
        <div style={{ display: 'flex' }}>

            {/* --- Sidebar (Reutilizable - Considerar extraer a componente) --- */}
            <aside className="sidebar">
                <div className="sidebar-logo"> <img src={finAiLogo} alt="FinAi Logo Small" /> </div>
                <nav className="sidebar-nav">
                    {/* Usar NavLink para 'active' class automática si se configura */}
                    <Link to="/dashboard" className="nav-button" title="Dashboard"><i className="fas fa-home"></i> <span>Dashboard</span></Link>
                    <Link to="/accounts" className="nav-button" title="Cuentas"><i className="fas fa-wallet"></i> <span>Cuentas</span></Link>
                    <Link to="/budgets" className="nav-button" title="Presupuestos"><i className="fas fa-chart-pie"></i> <span>Presupuestos</span></Link>
                    <Link to="/categories" className="nav-button" title="Categorías"><i className="fas fa-tags"></i> <span>Categorías</span></Link>
                    <Link to="/transactions" className="nav-button" title="Transacciones"><i className="fas fa-exchange-alt"></i> <span>Transacciones</span></Link>
                    <Link to="/trips" className="nav-button" title="Viajes"><i className="fas fa-suitcase-rolling"></i> <span>Viajes</span></Link>
                    <Link to="/evaluations" className="nav-button" title="Evaluación"><i className="fas fa-balance-scale"></i> <span>Evaluación</span></Link>
                    <Link to="/reports" className="nav-button" title="Informes"><i className="fas fa-chart-bar"></i> <span>Informes</span></Link>
                    <Link to="/profile" className="nav-button active" title="Perfil"><i className="fas fa-user-circle"></i> <span>Perfil</span></Link> {/* Active */}
                    <Link to="/settings" className="nav-button" title="Configuración"><i className="fas fa-cog"></i> <span>Configuración</span></Link>
                    <Link to="/debts" className="nav-button" title="Deudas"><i className="fas fa-credit-card"></i> <span>Deudas</span></Link>
                    <Link to="/loans" className="nav-button" title="Préstamos"><i className="fas fa-hand-holding-usd"></i> <span>Préstamos</span></Link>
                    <Link to="/fixed-expenses" className="nav-button" title="Gastos Fijos"><i className="fas fa-receipt"></i> <span>Gastos Fijos</span></Link>
                    <Link to="/goals" className="nav-button" title="Metas"><i className="fas fa-bullseye"></i> <span>Metas</span></Link>
                </nav>
                <button className="nav-button logout-button" onClick={handleLogout} title="Cerrar Sesión" disabled={isLoading || isSaving}>
                    {isLoading ? <><i className="fas fa-spinner fa-spin"></i> <span>Saliendo...</span></> : <><i className="fas fa-sign-out-alt"></i> <span>Salir</span></>}
                </button>
            </aside>

            {/* --- Contenido Principal --- */}
            <div className="page-container">
                {/* --- Cabecera --- */}
                <div className="page-header">
                    <button onClick={handleBack} id="backButton" className="btn-icon" aria-label="Volver" disabled={isSaving}><i className="fas fa-arrow-left"></i></button>
                    <div className="header-title-group">
                        <img id="userAvatarHeader" src={avatarPreview} alt="Avatar" className="header-avatar-small" />
                        <h1>Perfil</h1>
                    </div>
                    <button onClick={handleSettingsClick} id="settingsButton" className="btn-icon" aria-label="Configuración" disabled={isSaving}><i className="fas fa-cog"></i></button>
                </div>

                {/* --- Contenedor del Perfil --- */}
                <div className="profile-container">
                    <h2 className="profile-title">Mi Perfil</h2>
                    <form id="profileForm" onSubmit={handleSaveProfile}>

                        <div className="profile-main-info">
                            <div className="avatar-section">
                                <img id="profileAvatar" src={avatarPreview} alt="Avatar de Usuario" className="profile-avatar" />
                                <input
                                    type="file"
                                    id="avatarUpload"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    ref={fileInputRef}
                                    onChange={handleAvatarFileChange}
                                    disabled={!isEditing || isSaving} // Deshabilitar si no está editando o guardando
                                />
                                {isEditing && (
                                    <button
                                        type="button"
                                        id="changeAvatarButton"
                                        className="btn-change-avatar"
                                        onClick={handleAvatarButtonClick}
                                        disabled={isSaving} // Deshabilitar mientras guarda
                                    >
                                        <i className="fas fa-camera"></i> Cambiar
                                    </button>
                                )}
                            </div>
                            <div className="info-fields">
                                <div className="input-group">
                                    <label htmlFor="profileName">Nombre y Apellidos</label>
                                    <input
                                        type="text"
                                        id="profileName"
                                        name="fullName"
                                        value={profileData.fullName}
                                        onChange={handleInputChange}
                                        readOnly={!isEditing}
                                        className={isEditing ? 'editing' : ''} // Clase visual opcional
                                        disabled={isSaving}
                                    />
                                </div>
                                <div className="input-group">
                                    <label htmlFor="profileEmail">Correo Electrónico</label>
                                    <input
                                        type="email"
                                        id="profileEmail"
                                        name="email"
                                        value={profileData.email}
                                        readOnly
                                        disabled // Siempre deshabilitado
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="input-group">
                            <label htmlFor="profilePhone">Número de Teléfono</label>
                            <PhoneInput
                                id="profilePhone" // Asegúrate que el CSS no dependa del id si lo cambias
                                placeholder="Introduce tu teléfono"
                                value={profileData.phone}
                                // Actualiza el estado directamente. Guarda '' si está vacío.
                                onChange={(value) => setProfileData(p => ({ ...p, phone: value || '' }))}
                                defaultCountry="ES"
                                international
                                countryCallingCodeEditable={false} // Opcional
                                readOnly={!isEditing}
                                disabled={isSaving}
                                // Aplica una clase para estilos readonly si es necesario
                                className={`phone-input-container ${!isEditing ? 'input-readonly' : ''}`}
                                // inputClassName="your-custom-input-class" // Clase para el input interno
                            />
                        </div>

                        <div className="input-group">
                            <label>Contraseña</label>
                            <div className="password-display">
                                <span>********</span>
                                <button
                                    type="button"
                                    id="changePasswordButton"
                                    className="btn-link"
                                    onClick={handleChangePasswordClick}
                                    disabled={isSaving} // Deshabilitar mientras guarda
                                >
                                    Cambiar Contraseña
                                </button>
                            </div>
                        </div>

                        {/* Mensaje de éxito/error */}
                        {message && (
                            <p className={`message ${messageType === 'error' ? 'error-message' : 'success-message'}`}>
                                {message}
                            </p>
                        )}

                        <div className="form-actions">
                            {isEditing ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleEditToggle} // Cancela y revierte cambios
                                        className="btn btn-secondary"
                                        disabled={isSaving}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit" // Guarda los cambios
                                        id="editSaveButton"
                                        className="btn btn-primary"
                                        disabled={isSaving || (!avatarFile && profileData.fullName === (originalProfileData.full_name || '') && profileData.phone === (originalProfileData.phone_number || ''))} // Deshabilitar si no hay cambios
                                    >
                                        <i className={`fas ${isSaving ? 'fa-spinner fa-spin' : 'fa-save'}`}></i> {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                                    </button>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleEditToggle} // Entra en modo edición
                                    id="editSaveButton"
                                    className="btn btn-primary"
                                    disabled={isLoading} // Deshabilitar si aún está cargando
                                >
                                    <i className="fas fa-pencil-alt"></i> Editar Perfil
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div> {/* Fin page-container */}
        </div> // Fin contenedor flex principal
    );
}

export default Profile;
