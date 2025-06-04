import React from 'react';
import { timeAgo } from '../../utils/formatters.js'; // Ajusta ruta
import { getNotificationIcon } from '../../utils/iconUtils.js'; // Ajusta ruta

function NotificationPanel({
  isOpen,
  notifications = [],
  isLoading,
  onMarkAllRead,
  onNotificationClick,
  // onClose // Podríamos añadir un botón X para cerrar
}) {
  return (
    <div id="notificationPanel" className={`notification-panel ${isOpen ? 'active' : ''}`}>
      <div className="notification-panel-header">
        <h4>Notificaciones</h4>
        {notifications.some(n => !n.is_read) && ( // Mostrar solo si hay no leídas
             <button onClick={onMarkAllRead} id="markAllReadBtn" className="btn-link-small" title="Marcar todas como leídas">
                 Marcar todas leídas
             </button>
        )}
      </div>
      <div id="notificationList" className="notification-list">
        {isLoading && <p className="panel-loading">Cargando...</p>}
        {!isLoading && notifications.length === 0 && <p className="panel-empty">No tienes notificaciones.</p>}
        {!isLoading && notifications.map(n => (
          <div
            key={n.id}
            className={`notification-item ${!n.is_read ? 'unread' : ''}`}
            onClick={() => onNotificationClick(n)} // Llama al handler del padre
            role="button" // Indica que es clickeable
            tabIndex={0} // Permite foco con teclado
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onNotificationClick(n.id)} // Accesibilidad teclado
            title={n.message} // Añadir title para accesibilidad y vista previa
          >
            <span className={getNotificationIcon(n.type)}></span>
            <div className="content">
              <p className="message">{n.message || ''}</p>
              <span className="timestamp">{timeAgo(n.created_at)}</span>
            </div>
             {/* Opcional: botón para borrar notificación individual? */}
             {/* <button className="btn-icon btn-delete-notif" onClick={(e) => { e.stopPropagation(); onDeleteNotification(n.id); }}>&times;</button> */}
          </div>
        ))}
      </div>
    </div>
  );
}

export default NotificationPanel;