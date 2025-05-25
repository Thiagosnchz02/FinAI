// src/components/layout/PageHeader.jsx
import React, { useMemo  } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx'; // Para acceder a userProfile
import Avatar from 'react-nice-avatar'; // O 'avataaars' si es la que usas
import defaultAvatar from '../../assets/avatar_predeterminado.png'; // Tu avatar por defecto
// import { DEFAULT_NICE_AVATAR_CONFIG } from '../../utils/avatarNiceOptions.js'; // Si tienes un SVG por defecto

// Props esperadas:
// - pageTitle: string (requerido)
// - showBackButton: boolean (opcional, por defecto true)
// - showSettingsButton: boolean (opcional, por defecto true)
// - actionButton: ReactNode (opcional, para el botón de "Añadir X" específico de la página)
// - headerClassName: string (opcional, para clases CSS adicionales específicas de la página)

function PageHeader({ 
    pageTitle, 
    showBackButton = true, 
    showSettingsButton = true, 
    actionButton = null,
    headerClassName = '' 
}) {
    const { user, userProfile, loading: authLoadingState } = useAuth(); // Obtener userProfile y el loading del AuthContext
    const navigate = useNavigate();

    console.log(`[PageHeader "${pageTitle}"] Renderizando. Auth Loading:`, authLoadingState);
    console.log(`[PageHeader "${pageTitle}"] userProfile recibido:`, JSON.parse(JSON.stringify(userProfile || {})));
    if (userProfile) {
        console.log(`[PageHeader "${pageTitle}"] userProfile.avatarAttributes:`, userProfile.avatarAttributes);
        console.log(`[PageHeader "${pageTitle}"] userProfile.avatarUrl:`, userProfile.avatarUrl);
    }

    const handleBack = () => navigate(-1);
    const handleSettingsClick = () => navigate('/settings');

    // Lógica para determinar qué avatar mostrar
    const avatarToDisplay = useMemo(() => {
        if (userProfile?.avatarAttributes && Object.keys(userProfile.avatarAttributes).length > 0) {
            console.log(`[PageHeader "${pageTitle}"] Decisión: Usando Avatar SVG con atributos:`, userProfile.avatarAttributes);
            return (
                <Avatar
                    style={{ width: '40px', height: '40px' }} // Tamaño para cabecera
                    className="header-avatar-small" // Tu clase para bordes, etc.
                    shape="circle" // Para react-nice-avatar
                    {...userProfile.avatarAttributes}
                />
            );
        } else if (userProfile?.avatarUrl) {
            console.log(`[PageHeader "${pageTitle}"] Decisión: Usando avatarUrl:`, userProfile.avatarUrl);
            return <img src={userProfile.avatarUrl} alt="Avatar" className="header-avatar-small" />;
        } else {
            console.log(`[PageHeader "${pageTitle}"] Decisión: Usando defaultAvatar.`);
            return <img src={defaultAvatar} alt="Avatar por defecto" className="header-avatar-small" />;
        }
    }, [userProfile, pageTitle]);


    return (
        <div className={`page-header ${headerClassName}`}> {/* Aplicar clase específica si se pasa */}
            {showBackButton && (
                <button onClick={handleBack} id="backButtonPageHeader" className="btn-icon" aria-label="Volver">
                    <i className="fas fa-arrow-left"></i>
                </button>
            )}
            
            <div className="header-title-group">
                {/* Mostrar el avatar determinado */}
                {avatarToDisplay}
                <h1>{pageTitle || 'Página'}</h1>
            </div>

            <div className="header-actions-slot"> {/* Contenedor para el botón de acción de la página y el de configuración */}
                {actionButton} {/* Aquí se renderizará el botón de "Añadir X" si se pasa */}
                
                {showSettingsButton && (
                    <button onClick={handleSettingsClick} 
                        id={`settingsButton-${pageTitle?.replace(/\s+/g, '-')}`} 
                        className="btn-icon" 
                        aria-label="Configuración" 
                        title="Configuración"
                    >
                        <i className="fas fa-cog"></i>
                    </button>
                )}
            </div>
        </div>
    );
}

// Añadir useMemo a las importaciones de React
PageHeader.defaultProps = {
    showBackButton: true,
    showSettingsButton: true,
    actionButton: null,
    headerClassName: ''
};

export default PageHeader;