/*
Archivo: src/pages/Profile.jsx
Propósito: Componente para la página de visualización y edición del perfil de usuario.
*/
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext.jsx'; // Importar useAuth
import toast from 'react-hot-toast'; // Importar toast
import PhoneInput from 'react-phone-number-input'; // Importar PhoneInput
import 'react-phone-number-input/style.css'; // Importar estilos PhoneInput
import Sidebar from '../components/layout/Sidebar.jsx'; 
import Avatar from 'react-nice-avatar'; 
import AvatarCreatorModal from '../components/Profile/AvatarCreatorModal.jsx';
import '../styles/Profile.scss';
import { formatDate } from '../utils/formatters.js';

// Importa imágenes
import defaultAvatar from '../assets/avatar_predeterminado.png';
import { DEFAULT_NICE_AVATAR_CONFIG } from '../utils/avatarNiceOptions.js';

function Profile() {
    // --- Estado del Componente ---
    const { user, loading: authLoading, session } = useAuth();
    const [profileData, setProfileData] = useState({
        fullName: '',
        email: '',
        phone: '',
        avatarUrl: defaultAvatar, // URL de imagen subida (fallback)
        avatarAttributes: null, // Para los atributos del avatar SVG
    });
    const [originalProfileData, setOriginalProfileData] = useState({});
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true); // Carga inicial
    const [isSaving, setIsSaving] = useState(false); // Guardando cambios
    //const [avatarFile, setAvatarFile] = useState(null);
    //const [avatarPreview, setAvatarPreview] = useState(defaultAvatar);
    const [error, setError] = useState(null);
    const [modalError, setModalError] = useState(''); 
    // Eliminados message y messageType

    const navigate = useNavigate();
    const [showScrollTop, setShowScrollTop] = useState(false);
    const fileInputRef = useRef(null);
    const [isAvatarCreatorModalOpen, setIsAvatarCreatorModalOpen] = useState(false);
    const isMounted = useRef(true); // Para cleanup

    // --- Efecto para Cargar Datos Iniciales ---

    useEffect(() => { // Cleanup Ref
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    // --- Carga de Datos Iniciales ---
    const fetchData = useCallback(async (currentUserId, currentUserEmail) => {
        if (!isMounted.current) return;
        setIsLoading(true); setError(null); // Usar setError si lo añades
        console.log('Profile: Cargando perfil para Usuario ID:', currentUserId);
        try {
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('full_name, avatar_url, phone_number, avatar_attributes')
                .eq('id', currentUserId)
                .single();

            if (!isMounted.current) return;

            if (profileError && profileError.code !== 'PGRST116') {
                throw profileError;
            }

            const currentData = {
                fullName: profile?.full_name || '',
                email: currentUserEmail || '', // Email siempre de auth
                phone: profile?.phone_number || '',
                avatarUrl: profile?.avatar_url || defaultAvatar,
                avatarAttributes: typeof profile?.avatar_attributes === 'string' 
                                    ? JSON.parse(profile.avatar_attributes) 
                                    : (profile?.avatar_attributes || null),
            };
            setProfileData(currentData);
            //setAvatarPreview(currentData.avatarUrl);
            setOriginalProfileData({ // Guardar originales para comparar
                full_name: profile?.full_name || '',
                phone_number: profile?.phone_number || null,
                avatar_url: profile?.avatar_url || null,
                avatar_attributes: currentData.avatarAttributes,
            });

        } catch (err) {
            console.error('Profile: Error cargando perfil:', err);
            if (isMounted.current) {
                setError(err.message || 'Error al cargar el perfil.');
                toast.error(`Error al cargar perfil: ${err.message}`);
                setProfileData({ fullName: '', email: currentUserEmail || '', phone: '', avatarUrl: null, avatarAttributes: null });
                setOriginalProfileData({ full_name: '', phone_number: null, avatar_url: null, avatar_attributes: null });
            }
        } finally {
            if (isMounted.current) setIsLoading(false);
        }
    }, [supabase]); // Dependencia supabase

    useEffect(() => {
        if (authLoading) { setIsLoading(true); return; }
        if (user && session?.user?.email) { fetchData(user.id, session.user.email); }
        else if (!user && !authLoading) { navigate('/login'); }
    }, [user, authLoading, session, navigate, fetchData]);

    // --- Manejadores de Eventos ---

    // Activa/Desactiva modo edición
    const handleEditToggle = useCallback(() => {
        if (isEditing) { // Cancelar
            //setAvatarFile(null);
            setProfileData(prev => ({
                ...prev,
                fullName: originalProfileData.full_name || '',
                phone: originalProfileData.phone_number || '',
                avatarUrl: originalProfileData.avatar_url || defaultAvatar,
                avatarAttributes: originalProfileData.avatar_attributes || null, // Restaurar URL original
            }));
             // La preview se actualizará por el useEffect [avatarFile, isEditing...]
        }
        setIsEditing(prev => !prev);
        setModalError('');
    }, [isEditing, originalProfileData]);

    // --- NUEVA FUNCIÓN PARA GUARDAR ATRIBUTOS DEL AVATAR DESDE EL MODAL ---
    const handleSaveAvatarAttributes = useCallback((attributes) => {
        console.log("Profile: Atributos de avatar recibidos del modal:", attributes);
        if (isMounted.current) {
            setProfileData(prev => ({
                ...prev,
                avatarAttributes: attributes, // Guardar el objeto de configuración
                avatarUrl: null // Opcional: Limpiar avatarUrl si se establece un avatar SVG
            }));
            setIsAvatarCreatorModalOpen(false);
            toast.success("Avatar diseñado. ¡No olvides guardar los cambios del perfil!");
        }
    }, []);

    // Guarda los cambios del perfil
    const handleSaveProfile = useCallback(async (event) => {
        event.preventDefault();
        if (!user?.id || !isEditing) return;

        setIsSaving(true);
        const toastId = toast.loading('Guardando perfil...');

        const newName = profileData.fullName.trim();
        const newPhone = profileData.phone?.trim() ? profileData.phone.trim() : null;
        const avatarAttributesChanged = JSON.stringify(profileData.avatarAttributes) !== JSON.stringify(originalProfileData.avatar_attributes);

        const nameChanged = newName !== (originalProfileData.full_name || '');
        const phoneChanged = newPhone !== (originalProfileData.phone_number || null);

        if (!nameChanged && !phoneChanged && !avatarAttributesChanged) {
            toast('No hay cambios para guardar.', { id: toastId, icon: 'ℹ️' });
            setIsEditing(false); setIsSaving(false); return;
        }

        try {
            const updates = {};
            if (nameChanged) updates.full_name = newName;
            if (phoneChanged) updates.phone_number = newPhone;
            if (avatarAttributesChanged) {
                // Si avatarAttributes es null (ej. usuario borró el avatar SVG), guardar null
                // Si es un objeto, guardarlo. Supabase lo manejará si la columna es JSONB.
                // Si tu columna es TEXT, necesitarás JSON.stringify(profileData.avatarAttributes).
                updates.avatar_attributes = profileData.avatarAttributes; 
                updates.avatar_url = null; // Limpiar la URL de imagen si se usa avatar SVG
            }

            if (Object.keys(updates).length > 0) {
                updates.updated_at = new Date();
                console.log("Actualizando profiles:", updates);
                const { data: updatedProfile, error: updateError } = await supabase
                    .from('profiles').update(updates).eq('id', user.id)
                    .select('full_name, phone_number, avatar_url, avatar_attributes').single(); // Devolver datos actualizados

                if (updateError) throw new Error(`Error al guardar perfil: ${updateError.message}`);

                // Actualizar estado local con los datos confirmados por la DB
                 if (isMounted.current) {
                    const updatedAttrs = typeof updatedProfile.avatar_attributes === 'string'
                                        ? JSON.parse(updatedProfile.avatar_attributes)
                                        : (updatedProfile.avatar_attributes || null);
                    setProfileData(prev => ({
                        ...prev,
                        fullName: updatedProfile.full_name || '',
                        phone: updatedProfile.phone_number || '',
                        avatarUrl: updatedProfile.avatar_url || defaultAvatar,
                        avatarAttributes: updatedAttrs,
                    }));
                    setOriginalProfileData({ // Actualizar base de comparación
                        full_name: updatedProfile.full_name || '',
                        phone_number: updatedProfile.phone_number || null,
                        avatar_url: updatedProfile.avatar_url || null,
                        avatar_attributes: updatedAttrs,
                    });
                    //setAvatarPreview(updatedProfile.avatar_url || defaultAvatar); // Actualizar preview final
                 }
            }

            if (isMounted.current) {
                toast.success('¡Perfil actualizado!', { id: toastId });
                setIsEditing(false);
                //setAvatarFile(null); // Limpiar archivo subido
            }

        } catch (error) {
            console.error('Profile: Error guardando:', error);
             if (isMounted.current) {
                setModalError(`Error: ${error.message}`);
                toast.error(`Error: ${error.message}`, { id: toastId });
                 // Opcional: revertir preview si falla la subida/guardado
                 //if (avatarChanged) setAvatarPreview(originalProfileData.avatar_url || defaultAvatar);
             }
        } finally {
             if (isMounted.current) setIsSaving(false);
        }
    }, [user, isEditing, profileData, originalProfileData, supabase, navigate]); // Añadir fetchData y handleEditToggle si se usan

    // Maneja cambios en los inputs del formulario
    const handleInputChange = useCallback((event) => {
        const { name, value } = event.target;
        setProfileData(prev => ({ ...prev, [name]: value }));
    }, []);

    // Handler específico para PhoneInput
    const handlePhoneChange = useCallback((value) => {
        setProfileData(p => ({ ...p, phone: value || '' }));
    }, []);

    // Simula click en el input file oculto
    const handleAvatarButtonClick = useCallback(() => {
        if (isEditing) {
            console.log("Abriendo modal para crear/editar avatar...");
            setIsAvatarCreatorModalOpen(true); // Abrir el modal del creador de avatares
        }
    }, [isEditing]);

    // Maneja la selección de un nuevo archivo de avatar
    const handleAvatarFileChange = useCallback((event) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (file.size > maxSize) {
                toast.error('El archivo es demasiado grande (máx 5MB).');
                setAvatarFile(null); event.target.value = ''; return;
            }
            if (!file.type.startsWith('image/')) {
                toast.error('Selecciona un archivo de imagen.');
                setAvatarFile(null); event.target.value = ''; return;
            }
            setAvatarFile(file);
            // Preview se actualiza en useEffect
        }
    }, []);

    // Navegación
    const handleChangePasswordClick = useCallback(() => navigate('/change-password'), [navigate]);
    const handleSettingsClick = useCallback(() => navigate('/settings'), [navigate]);
    const handleBack = useCallback(() => navigate(-1), [navigate]);
    const scrollToTop = useCallback(() => window.scrollTo({ top: 0, behavior: 'smooth' }), []);

    const handleSignOutFromAllDevices = async () => {
        const confirmationToastId = toast(
            (t) => (
                <div style={{display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center'}}>
                    <p>¿Cerrar sesión en todos los demás dispositivos?</p>
                    <div style={{display: 'flex', gap: '8px'}}>
                        <button
                            className="btn btn-sm btn-danger"
                            onClick={async () => {
                                toast.dismiss(confirmationToastId);
                                const processingToastId = toast.loading('Cerrando otras sesiones...');
                                try {
                                    const { error } = await supabase.auth.signOut({ scope: 'others' }); // 'others' para Supabase JS v2+
                                    if (error) throw error;
                                    toast.success('Se ha cerrado sesión en otros dispositivos.', { id: processingToastId });
                                } catch (err) {
                                    console.error("Error al cerrar otras sesiones:", err);
                                    toast.error(`Error: ${err.message}`, { id: processingToastId });
                                }
                            }}
                        >
                            Sí, cerrar
                        </button>
                        <button className="btn btn-sm btn-secondary" onClick={() => toast.dismiss(confirmationToastId)}>
                            Cancelar
                        </button>
                    </div>
                </div>
            ), { duration: 10000, position: "top-center" }
        );
    };

    // --- Renderizado ---
    if (isLoading && !user) { // Mostrar carga inicial si no hay usuario aún
        return ( <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}> <p>Cargando...</p> </div> );
    }

    const hasChanges = useMemo(() => {
        if (!originalProfileData) return false;
        return (
            profileData.fullName !== (originalProfileData.full_name || '') ||
            (profileData.phone || '') !== (originalProfileData.phone_number || '') ||
            JSON.stringify(profileData.avatarAttributes) !== JSON.stringify(originalProfileData.avatar_attributes)
        );
    }, [profileData, originalProfileData]);

    // --- Lógica para el avatar a mostrar ---
    const displayAvatarConfig = profileData.avatarAttributes || DEFAULT_NICE_AVATAR_CONFIG;
    const showSvgAvatar = !!profileData.avatarAttributes;
    const fallbackImageUrl = profileData.avatarUrl || defaultAvatar;

    return (
        <div style={{ display: 'flex' }}>
            
            <Sidebar
                // Pasar estado de carga/guardado si quieres deshabilitar botones mientras ocurre algo
                isProcessing={isLoading || isSaving /* ...o el estado relevante */}
            />

            {/* --- Contenido Principal --- */}
            <div className="page-container">
                {/* Cabecera */}
                <div className="page-header">
                   <button onClick={handleBack} id="backButton" className="btn-icon" aria-label="Volver" disabled={isSaving}><i className="fas fa-arrow-left"></i></button>
                   <div className="header-title-group">
                       {showSvgAvatar ? (
                            <Avatar
                                style={{ width: '40px', height: '40px' }} // Tamaño para cabecera
                                className="header-avatar-small" // Tu clase para bordes, etc.
                                {...displayAvatarConfig}
                                shape="circle"
                            />
                        ) : (
                            <img id="userAvatarHeader" src={fallbackImageUrl} alt="Avatar" className="header-avatar-small" />
                        )}
                        <h1>Mi Perfil</h1>
                   </div>
                   <button onClick={handleSettingsClick} id="settingsButton" className="btn-icon" aria-label="Configuración" disabled={isSaving}><i className="fas fa-cog"></i></button>
                </div>

                {/* Contenedor Perfil */}
                {isLoading && <p style={{textAlign: 'center', padding: '20px'}}>Cargando tu información...</p>}
                
                {!isLoading && user && !error && ( // Asegúrate de que !error también esté aquí
                    <div className="profile-container">
                        <h2 className="profile-title">Mi Perfil</h2>
                        <form id="profileForm" onSubmit={handleSaveProfile}>
                            
                            {/* --- SECCIÓN DEL AVATAR ACTUALIZADA --- */}
                            <div className="profile-avatar-section"> {/* Esta clase ya la tienes y debería centrar el contenido */}
                                {showSvgAvatar ? (
                                    <Avatar
                                        style={{ width: '150px', height: '150px' }}
                                        className="profile-avatar" // Usa tu clase .profile-avatar
                                        {...displayAvatarConfig}
                                        shape="circle" // Forzar círculo para el componente Avatar
                                    />
                                ) : (
                                    <img 
                                        id="profileAvatar" 
                                        src={fallbackImageUrl}
                                        alt="Avatar" 
                                        className="profile-avatar" // Tu clase .profile-avatar
                                    />
                                )}
                                {isEditing && ( 
                                    <button 
                                        type="button" 
                                        id="changeAvatarButton" 
                                        className="btn btn-sm btn-change-avatar" // Aplicar clases base
                                        onClick={handleAvatarButtonClick}
                                        disabled={isSaving}
                                        title={profileData.avatarAttributes ? "Editar Avatar" : "Crear Avatar Fini"}
                                    > 
                                        <i className={profileData.avatarAttributes ? "fas fa-paint-brush" : "fas fa-magic"}></i> 
                                        {profileData.avatarAttributes ? 'Editar Avatar' : 'Crear Avatar'}
                                    </button> 
                                )}
                                <input 
                                    type="file" 
                                    id="avatarUpload" 
                                    accept="image/*" 
                                    style={{ display: 'none' }} 
                                    ref={fileInputRef} 
                                    onChange={handleAvatarFileChange} 
                                    disabled={!isEditing || isSaving}
                                />
                            </div>
                            {/* --- FIN SECCIÓN DEL AVATAR --- */}

                            <div className="profile-main-info">
                                <div className="info-fields">
                                    <div className="input-group">
                                        <label htmlFor="profileName">Nombre y Apellidos</label>
                                        <input type="text" id="profileName" name="fullName" value={profileData.fullName} onChange={handleInputChange} readOnly={!isEditing} className={!isEditing ? 'input-readonly' : ''} disabled={isSaving}/>
                                    </div>
                                    <div className="input-group">
                                        <label htmlFor="profileEmail">Correo Electrónico</label>
                                        <input type="email" id="profileEmail" name="email" value={profileData.email} readOnly disabled />
                                    </div>
                                </div>
                            </div>

                            <div className="input-group">
                                <label htmlFor="profilePhone">Número de Teléfono</label>
                                <PhoneInput
                                    id="profilePhone" placeholder="Introduce tu teléfono"
                                    value={profileData.phone}
                                    onChange={handlePhoneChange} 
                                    defaultCountry="ES" international countryCallingCodeEditable={false}
                                    readOnly={!isEditing} disabled={isSaving}
                                    className={`phone-input-container ${!isEditing ? 'input-readonly' : ''}`}
                                />
                            </div>

                            <div className="input-group">
                                <label>Contraseña</label>
                                <div className="password-display">
                                    <span>********</span>
                                    <button type="button" id="changePasswordButton" className="btn-link" onClick={handleChangePasswordClick} disabled={isSaving}> Cambiar Contraseña </button>
                                </div>
                            </div>

                            {!isEditing && user && (
                                <div className="user-meta-info">
                                    {user.created_at && (
                                        <p><i className="fas fa-calendar-alt meta-icon"></i>Miembro desde: {formatDate(user.created_at, 'PPP')}</p>
                                    )}
                                    {user.last_sign_in_at && (
                                        <p><i className="fas fa-history meta-icon"></i>Última conexión: {formatDate(user.last_sign_in_at, 'Pp')}</p>
                                    )}
                                </div>
                            )}

                            {modalError && <p className="error-message modal-error">{modalError}</p>} {/* Si tienes modalError para el formulario de perfil */}

                            <div className="form-actions">
                                {isEditing ? (
                                    <>
                                        <button type="button" onClick={handleEditToggle} className="btn btn-secondary" disabled={isSaving}>Cancelar</button>
                                        <button type="submit" id="saveProfileButton" className="btn btn-primary" disabled={isSaving || !hasChanges}> {/* hasChanges debe considerar avatarAttributes */}
                                            <i className={`fas ${isSaving ? 'fa-spinner fa-spin' : 'fa-save'}`}></i> {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                                        </button>
                                    </>
                                ) : (
                                    <button type="button" onClick={handleEditToggle} id="editProfileButton" className="btn btn-primary" disabled={isLoading}>
                                        <i className="fas fa-pencil-alt"></i> Editar Perfil
                                    </button>
                                )}
                            </div>
                        </form>

                        {!isEditing && ( // Mostrar solo si no se está editando
                            <div className="profile-advanced-actions">
                                <button 
                                    type="button" 
                                    onClick={handleSignOutFromAllDevices} 
                                    className="btn btn-outline-danger btn-sm" // Estilo de peligro pero no tan fuerte
                                    disabled={isSaving}
                                    title="Cierra la sesión en todos los demás navegadores y dispositivos."
                                >
                                    <i className="fas fa-sign-out-alt"></i> Cerrar Sesión en Otros Dispositivos
                                </button>
                            </div>
                        )}

                    </div>
                )}
            </div> {/* Fin page-container */}
             {/* --- RENDERIZAR EL MODAL DEL CREADOR DE AVATARES --- */}
            <AvatarCreatorModal
                isOpen={isAvatarCreatorModalOpen}
                onClose={() => setIsAvatarCreatorModalOpen(false)}
                onSaveAvatar={handleSaveAvatarAttributes}
                initialConfig={profileData.avatarAttributes || undefined} // Pasa los atributos actuales o undefined
                isSaving={isSaving} // Podrías tener un isSavingAvatar específico si la operación es larga
            />
             {/* Botón Scroll-Top */}
             {showScrollTop && ( <button onClick={scrollToTop} id="scrollTopBtn" className="scroll-top-btn visible" title="Volver arriba"><i className="fas fa-arrow-up"></i></button> )}
        </div> // Fin contenedor flex principal
    );
}

export default Profile;
