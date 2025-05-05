/*
Archivo: src/pages/Profile.jsx
Propósito: Componente para la página de visualización y edición del perfil de usuario.
*/
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext.jsx'; // Importar useAuth
import toast from 'react-hot-toast'; // Importar toast
import PhoneInput from 'react-phone-number-input'; // Importar PhoneInput
import 'react-phone-number-input/style.css'; // Importar estilos PhoneInput
import Sidebar from '../components/layout/Sidebar.jsx'; 

// Importa imágenes
import defaultAvatar from '../assets/avatar_predeterminado.png';

function Profile() {
    // --- Estado del Componente ---
    const { user, loading: authLoading } = useAuth(); // Usa AuthContext
    const [profileData, setProfileData] = useState({ fullName: '', email: '', phone: '', avatarUrl: defaultAvatar });
    const [originalProfileData, setOriginalProfileData] = useState({}); // Para comparar cambios
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true); // Carga inicial
    const [isSaving, setIsSaving] = useState(false); // Guardando cambios
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(defaultAvatar);
    // Eliminados message y messageType

    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const isMounted = useRef(true); // Para cleanup

    // --- Carga de Datos Iniciales ---
    const fetchData = useCallback(async (currentUserId, currentUserEmail) => {
        setIsLoading(true); setError(null); // Usar setError si lo añades
        console.log('Profile: Cargando perfil para Usuario ID:', currentUserId);
        try {
            const { data: profile, error: profileError } = await supabase
                .from('profiles').select('full_name, avatar_url, phone_number')
                .eq('id', currentUserId).single();

            if (!isMounted.current) return;

            if (profileError && profileError.code !== 'PGRST116') {
                throw profileError;
            }

            const currentData = {
                fullName: profile?.full_name || '',
                email: currentUserEmail || '', // Email siempre de auth
                phone: profile?.phone_number || '',
                avatarUrl: profile?.avatar_url || defaultAvatar,
            };
            setProfileData(currentData);
            setAvatarPreview(currentData.avatarUrl);
            setOriginalProfileData({ // Guardar originales para comparar
                full_name: profile?.full_name || '',
                phone_number: profile?.phone_number || null,
                avatar_url: profile?.avatar_url || null
            });

        } catch (error) {
            console.error('Profile: Error cargando perfil:', error);
            toast.error(`Error al cargar perfil: ${error.message}`);
            // Establecer valores por defecto en caso de error
            setProfileData({ fullName: '', email: currentUserEmail || '', phone: '', avatarUrl: defaultAvatar });
            setAvatarPreview(defaultAvatar);
            setOriginalProfileData({ full_name: '', phone_number: null, avatar_url: null });
        } finally {
            if (isMounted.current) setIsLoading(false);
        }
    }, [supabase]); // Dependencia supabase

    // --- Efecto para Cargar Datos Iniciales ---
    useEffect(() => { // Cleanup Ref
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    useEffect(() => { // Carga inicial
        if (authLoading) { setIsLoading(true); return; }
        if (!user) { navigate('/login'); return; }
        fetchData(user.id, user.email); // Llama a fetchData con ID y email
    }, [user, authLoading, navigate, fetchData]);

    useEffect(() => { // Actualizar preview avatar
        if (avatarFile) {
            const reader = new FileReader();
            reader.onloadend = () => { if (isMounted.current) setAvatarPreview(reader.result) };
            reader.readAsDataURL(avatarFile);
        } else if (!isEditing && isMounted.current) {
             // Restaura preview solo si se cancela la edición
             setAvatarPreview(profileData.avatarUrl || defaultAvatar);
        }
   }, [avatarFile, isEditing, profileData.avatarUrl]);


    // --- Manejadores de Eventos ---

    // Activa/Desactiva modo edición
    const handleEditToggle = useCallback(() => {
        if (isEditing) { // Cancelar
            setAvatarFile(null);
            setProfileData(prev => ({
                ...prev,
                fullName: originalProfileData.full_name || '',
                phone: originalProfileData.phone_number || '',
                avatarUrl: originalProfileData.avatar_url || defaultAvatar // Restaurar URL original
            }));
             // La preview se actualizará por el useEffect [avatarFile, isEditing...]
        }
        setIsEditing(prev => !prev);
    }, [isEditing, originalProfileData]);

    // Guarda los cambios del perfil
    const handleSaveProfile = useCallback(async (event) => {
        event.preventDefault();
        if (!user?.id || !isEditing) return;

        setIsSaving(true);
        const toastId = toast.loading('Guardando perfil...');

        const newName = profileData.fullName.trim();
        const newPhone = profileData.phone?.trim() ? profileData.phone.trim() : null;
        const avatarChanged = !!avatarFile;

        const nameChanged = newName !== (originalProfileData.full_name || '');
        const phoneChanged = newPhone !== (originalProfileData.phone_number || null);

        if (!nameChanged && !phoneChanged && !avatarChanged) {
            toast('No hay cambios para guardar.', { id: toastId, icon: 'ℹ️' });
            setIsEditing(false); setIsSaving(false); return;
        }

        try {
            let avatar_url = originalProfileData.avatar_url; // Empezar con la URL original

            // 1. Subir avatar SI cambió
            if (avatarFile) {
                const fileExt = avatarFile.name.split('.').pop();
                const filePath = `${user.id}/avatar.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('avatars').upload(filePath, avatarFile, { upsert: true });
                if (uploadError) throw new Error(`Subida Avatar: ${uploadError.message}`);

                // Obtener nueva URL pública (importante invalidar caché si la ruta es la misma)
                const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
                avatar_url = urlData?.publicUrl ? `${urlData.publicUrl}?t=${new Date().getTime()}` : null;
                console.log('Nuevo avatar URL:', avatar_url);
            }

            // 2. Actualizar tabla profiles SI algo cambió (nombre, tlf o avatar)
            const updates = {};
            if (nameChanged) updates.full_name = newName;
            if (phoneChanged) updates.phone_number = newPhone;
            if (avatarChanged) updates.avatar_url = avatar_url; // Guardar nueva URL (o la misma si no cambió archivo)

            if (Object.keys(updates).length > 0) {
                updates.updated_at = new Date();
                console.log("Actualizando profiles:", updates);
                const { data: updatedProfile, error: updateError } = await supabase
                    .from('profiles').update(updates).eq('id', user.id)
                    .select('full_name, phone_number, avatar_url').single(); // Devolver datos actualizados

                if (updateError) throw new Error(`Guardar Perfil: ${updateError.message}`);

                // Actualizar estado local con los datos confirmados por la DB
                 if (isMounted.current) {
                    setProfileData(prev => ({
                        ...prev,
                        fullName: updatedProfile.full_name || '',
                        phone: updatedProfile.phone_number || '',
                        avatarUrl: updatedProfile.avatar_url || defaultAvatar
                    }));
                    setOriginalProfileData({ // Actualizar base de comparación
                        full_name: updatedProfile.full_name || '',
                        phone_number: updatedProfile.phone_number || null,
                        avatar_url: updatedProfile.avatar_url || null
                    });
                    setAvatarPreview(updatedProfile.avatar_url || defaultAvatar); // Actualizar preview final
                 }
            }

            if (isMounted.current) {
                toast.success('¡Perfil actualizado!', { id: toastId });
                setIsEditing(false);
                setAvatarFile(null); // Limpiar archivo subido
            }

        } catch (error) {
            console.error('Profile: Error guardando:', error);
             if (isMounted.current) {
                toast.error(`Error: ${error.message}`, { id: toastId });
                 // Opcional: revertir preview si falla la subida/guardado
                 if (avatarChanged) setAvatarPreview(originalProfileData.avatar_url || defaultAvatar);
             }
        } finally {
             if (isMounted.current) setIsSaving(false);
        }
    }, [user, isEditing, profileData, originalProfileData, avatarFile, supabase, fetchData, handleEditToggle]); // Añadir fetchData y handleEditToggle si se usan

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
    const handleAvatarButtonClick = useCallback(() => fileInputRef.current?.click(), []);

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

    // --- Renderizado ---
    if (isLoading && !user) { // Mostrar carga inicial si no hay usuario aún
        return ( <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}> <p>Cargando...</p> </div> );
    }

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
                       <img id="userAvatarHeader" src={avatarPreview} alt="Avatar" className="header-avatar-small" />
                       <h1>Perfil</h1>
                   </div>
                   <button onClick={handleSettingsClick} id="settingsButton" className="btn-icon" aria-label="Configuración" disabled={isSaving}><i className="fas fa-cog"></i></button>
                </div>

                {/* Contenedor Perfil */}
                <div className="profile-container">
                    <h2 className="profile-title">Mi Perfil</h2>
                    <form id="profileForm" onSubmit={handleSaveProfile}>
                        <div className="profile-main-info">
                            <div className="avatar-section">
                                <img id="profileAvatar" src={avatarPreview} alt="Avatar" className="profile-avatar" />
                                <input type="file" id="avatarUpload" accept="image/*" style={{ display: 'none' }} ref={fileInputRef} onChange={handleAvatarFileChange} disabled={!isEditing || isSaving}/>
                                {isEditing && ( <button type="button" id="changeAvatarButton" className="btn-change-avatar" onClick={handleAvatarButtonClick} disabled={isSaving}> <i className="fas fa-camera"></i> Cambiar </button> )}
                            </div>
                            <div className="info-fields">
                                <div className="input-group">
                                    <label htmlFor="profileName">Nombre y Apellidos</label>
                                    <input type="text" id="profileName" name="fullName" value={profileData.fullName} onChange={handleInputChange} readOnly={!isEditing} className={isEditing ? 'editing' : ''} disabled={isSaving}/>
                                </div>
                                <div className="input-group">
                                    <label htmlFor="profileEmail">Correo Electrónico</label>
                                    <input type="email" id="profileEmail" name="email" value={profileData.email} readOnly disabled />
                                </div>
                            </div>
                        </div>

                        <div className="input-group">
                            <label htmlFor="profilePhone">Número de Teléfono</label>
                            {/* Implementación PhoneInput */}
                            <PhoneInput
                                id="profilePhone" placeholder="Introduce tu teléfono"
                                value={profileData.phone}
                                onChange={handlePhoneChange} // Usa handler específico
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

                        {/* Feedback con Toast (no se muestra nada aquí) */}

                        <div className="form-actions">
                            {isEditing ? (
                                <>
                                    <button type="button" onClick={handleEditToggle} className="btn btn-secondary" disabled={isSaving}>Cancelar</button>
                                    <button type="submit" id="editSaveButton" className="btn btn-primary" disabled={isSaving || (!avatarFile && profileData.fullName === (originalProfileData.full_name || '') && profileData.phone === (originalProfileData.phone_number || ''))}>
                                         <i className={`fas ${isSaving ? 'fa-spinner fa-spin' : 'fa-save'}`}></i> {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                                    </button>
                                </>
                            ) : (
                                <button type="button" onClick={handleEditToggle} id="editSaveButton" className="btn btn-primary" disabled={isLoading}>
                                    <i className="fas fa-pencil-alt"></i> Editar Perfil
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div> {/* Fin page-container */}

             {/* Botón Scroll-Top */}
             {showScrollTop && ( <button onClick={scrollToTop} id="scrollTopBtn" className="scroll-top-btn visible" title="Volver arriba"><i className="fas fa-arrow-up"></i></button> )}
        </div> // Fin contenedor flex principal
    );
}

export default Profile;
