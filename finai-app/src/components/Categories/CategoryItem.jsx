import React from 'react';
import { getIconClass } from '../../utils/iconUtils'; // Importar utilidad de iconos
import { isColorDark } from '../../utils/colorUtils'; // Importar utilidad de color

function CategoryItem({
  category,
  onViewClick, // Para abrir modal en modo 'view' (usado en default)
  onEditClick, // Para abrir modal en modo 'edit' (usado en custom)
  onDeleteClick // Para iniciar el proceso de borrado (usado en custom)
}) {

  // --- Cálculos de Estilo y Texto ---
  const bgColor = category.color || '#e0e0e0';
  const textColor = isColorDark(bgColor) ? '#ffffff' : '#2d3748';
  const iconClass = getIconClass(category.icon);
  const typeIndicator = category.type === 'ingreso' ? '(Ingreso)' : '(Gasto)';
  const isDefault = category.is_default;

  // --- Manejador de Clic Principal ---
  // Si es default, llama a onViewClick. Si no, no hace nada (las acciones están en botones)
  // Podríamos hacer que al hacer clic en custom también abra en modo edit, si se quiere.
  const handleClick = () => {
    if (isDefault && onViewClick) {
      onViewClick(category);
    }
    // else if (!isDefault && onEditClick) {
    //   onEditClick(category); // Opcional: editar al hacer clic en custom
    // }
  };

  return (
    <div
      className="category-item"
      style={{ backgroundColor: bgColor, color: textColor }}
      onClick={handleClick}
      title={isDefault ? "Ver detalle (no editable)" : category.name}
    >
      <span className="category-icon"><i className={iconClass}></i></span>
      <span className="category-name">{category.name}</span>

      {/* Acciones y tipo (solo visibles/clickables si no es default) */}
      <div className="category-actions">
        <span className="category-type-indicator">{typeIndicator}</span>
        {!isDefault && onEditClick && (
          <button
            onClick={(e) => { e.stopPropagation(); onEditClick(category); }} // Evita que el clic se propague al div padre
            className="btn-icon btn-edit"
            aria-label="Editar"
            style={{ color: 'inherit' }} // Heredar color del texto para mejor contraste
          >
            <i className="fas fa-pencil-alt"></i>
          </button>
        )}
        {!isDefault && onDeleteClick && (
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteClick(category.id, category.name); }} // Evita propagación
            className="btn-icon btn-delete"
            aria-label="Eliminar"
            style={{ color: 'inherit' }}
          >
            <i className="fas fa-trash-alt"></i>
          </button>
        )}
      </div>

      {/* Badge para default */}
      {isDefault && (
        <span className="default-badge" title="Categoría por defecto">Default</span>
      )}
    </div>
  );
}

export default CategoryItem;