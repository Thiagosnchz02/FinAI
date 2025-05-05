import React from 'react';
import { Link } from 'react-router-dom'; // Para enlace de perfil

function MainHeader({
  pageTitle,
  avatarUrl,
  unreadNotifications,
  onNotificationClick,
  onProfileClick,
  onMenuClick // Para menú hamburguesa en móvil (si lo implementas)
}) {
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
        <button onClick={onProfileClick} className="btn-icon profile-btn" aria-label="Mi Perfil">
          <img src={avatarUrl} alt="Avatar" className="header-avatar-small" />
        </button>
      </div>
    </header>
  );
}

export default MainHeader;