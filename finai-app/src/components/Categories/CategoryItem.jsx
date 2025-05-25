import React from 'react';
import { getIconClass } from '../../utils/iconUtils'; // Importar utilidad de iconos
import { isColorDark } from '../../utils/colorUtils'; // Importar utilidad de color

function CategoryItem({
  category,
  onViewClick, // Para abrir modal en modo 'view' (usado en default)
  onEditClick, // Para abrir modal en modo 'edit' (usado en custom)
  onArchiveClick,   // Para custom activas -> Archivar
  onUnarchiveClick, // Para custom archivadas -> Desarchivar
  isArchivedView = false, // Para iniciar el proceso de borrado (usado en custom)
  isSubcategory = false
}) {

  // --- Cálculos de Estilo y Texto ---
  const bgColor = category.color || '#e0e0e0';
  const textColor = isColorDark(bgColor) ? '#ffffff' : '#2d3748';
  const iconClass = getIconClass(category.icon);
  const typeIndicator = category.type === 'ingreso' ? '(Ingreso)' : '(Gasto)';
  const isDefault = category.is_default;
  const isArchived = category.is_archived;

  const handleClick = () => {
    if (isDefault && onViewClick) {
        onViewClick(category);
    } else if (isArchivedView && onViewClick) { // Si está en vista archivada y tiene onViewClick
        onViewClick(category); // Podrías querer un modo 'view' para archivadas también
    } //else if (!isDefault && !isArchived && onEditClick) {
      // Opcional: si quieres que hacer clic en una categoría personalizada activa la edite
      // onEditClick(category); 
  }

  // Aplicar una clase diferente si es subcategoría para indentación/estilo
  const itemClassName = `category-item ${isArchived ? 'archived' : ''} ${isSubcategory ? 'subcategory-item' : ''}`;

  return (
    <div
    className={itemClassName}
      style={{ backgroundColor: bgColor, color: textColor, opacity: isArchived ? 0.6 : 1 }}
      onClick={handleClick}
      title={
        isDefault ? "Ver detalle (no editable ni archivable)" :
        isArchived ? `Categoría archivada: ${category.name}` :
        isSubcategory ? `Subcategoría: ${category.name}` :
        `Categoría: ${category.name}`
    }
    >
      <span className="category-icon"><i className={iconClass}></i></span>
      <span className="category-name">{category.name}</span>

      {/* Acciones y tipo (solo visibles/clickables si no es default) */}
      <div className="category-actions">
        <span className="category-type-indicator">{typeIndicator}</span>
        {/* Botón Editar: solo para personalizadas activas */}
        {!isDefault && !isArchived && onEditClick && (
          <button
            onClick={(e) => { e.stopPropagation(); onEditClick(category); }}
            className="btn-icon btn-edit"
            aria-label="Editar"
            title="Editar Categoría"
            style={{ color: 'inherit' }}
          >
              <i className="fas fa-pencil-alt"></i>
          </button>
        )}
        {/* Botón Archivar: solo para personalizadas activas */}
        {!isDefault && !isArchived && onArchiveClick && (
          <button
            onClick={(e) => { e.stopPropagation(); onArchiveClick(category); }}
            className="btn-icon btn-archive" // Cambiar clase si quieres estilo diferente
            aria-label="Archivar"
            title="Archivar Categoría"
            style={{ color: 'inherit' }}
          >
            <i className="fas fa-archive"></i> {/* Icono de archivar */}
          </button>
        )}

         {/* Botón Desarchivar: solo para personalizadas archivadas (si se muestran) */}
         {!isDefault && isArchived && onUnarchiveClick && isArchivedView && (
           <button
            onClick={(e) => { e.stopPropagation(); onUnarchiveClick(category); }}
            className="btn-icon btn-unarchive" // Clase para estilo
            aria-label="Desarchivar"
            title="Desarchivar Categoría"
            style={{ color: 'inherit' }}
           >
               <i className="fas fa-box-open"></i> {/* Icono de desarchivar */}
           </button>
          )}
          </div>

          {isDefault && (
               <span className="default-badge" title="Categoría por defecto">Default</span>
          )}
          {isArchived && !isDefault && ( // Mostrar badge de archivada solo si no es default
               <span className="archived-badge" title="Categoría archivada">Archivada</span>
          )}
          {/* Podrías añadir un indicador visual si es una subcategoría, aunque la indentación ya lo hará */}
          {/* {isSubcategory && <span className="subcategory-indicator">Sub</span>} */}
    </div>
  );
}

export default CategoryItem;