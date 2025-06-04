import React from 'react';
import { Link } from 'react-router-dom'; // Para enlace de perfil
import { useAuth } from '../../contexts/AuthContext.jsx';
import Avatar from 'react-nice-avatar'; 
import defaultAvatar from '../../assets/avatar_predeterminado.png';
import { DEFAULT_NICE_AVATAR_CONFIG } from '../../utils/avatarNiceOptions.js';


function MainHeader({
  pageTitle,
  //avatarUrl,
  unreadNotifications,
  onNotificationClick,
  onProfileClick,
  //onMenuClick // Para menú hamburguesa en móvil (si lo implementas)
}) {

  const { userProfile } = useAuth(); // Obtener el perfil completo del usuario del contexto

  // Determinar qué avatar mostrar
  const showSvgAvatar = !!userProfile?.avatarAttributes;
  const imageUrl = userProfile?.avatarUrl || defaultAvatar; // Fallback a defaultAvatar si no hay avatarUrl
   
  // Si no hay atributos SVG y no hay avatarUrl, pero quieres un SVG por defecto de react-nice-avatar:
  const displayAttributes = userProfile?.avatarAttributes || DEFAULT_NICE_AVATAR_CONFIG;
  // Y luego usarías siempre <Avatar {...displayAttributes} /> si showSvgAvatar o si userProfile.avatarAttributes es null pero quieres el default SVG.
  // Por ahora, la lógica es: SVG si existe, sino URL de imagen, sino imagen por defecto.

  return (
    <header className="main-header">
      <div className="header-left">
        {/* Botón Hamburguesa (opcional, para vistas móviles) */}
        {/* <button onClick={onMenuClick} className="btn-icon hamburger-btn" aria-label="Abrir menú"><i className="fas fa-bars"></i></button> */}
        <div className="header-title">
          <span id="pageTitle">{pageTitle || 'Dashboard'}</span>
        </div>
      </div>
      <div className="header-right">
        <button onClick={onNotificationClick} className="btn-icon notification-btn" aria-label="Notificaciones">
          <i className="fas fa-bell"></i>
          {unreadNotifications > 0 && <span className="notification-badge">{unreadNotifications > 9 ? '9+' : unreadNotifications}</span>}
        </button>
        <button onClick={onProfileClick} className="btn-icon profile-btn" aria-label="Mi Perfil" title="Mi Perfil">
          {showSvgAvatar && userProfile.avatarAttributes ? (
            <Avatar
              style={{ width: '32px', height: '32px' }} // Tamaño para header-avatar-small
              className="header-avatar-small" // Tu clase existente para bordes, etc.
              shape="circle" // react-nice-avatar usa 'shape'
              {...userProfile.avatarAttributes}
            />
          ) : (
            <img 
              src={imageUrl} 
              alt="Avatar" 
              className="header-avatar-small" 
            />
          )}
        </button>
      </div>
    </header>
  );
}

export default MainHeader;