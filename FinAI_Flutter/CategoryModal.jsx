import React, { useState, useEffect } from 'react';
import { PREDEFINED_ICONS } from '../../utils/iconConstants';
import { PREDEFINED_COLORS } from '../../utils/colorConstants';

function CategoryModal({
  isOpen,
  onClose,
  onSubmit, // Función del padre que recibe los datos finales
  mode = 'add', // 'add', 'edit', 'view'
  initialData = null, // El objeto categoría completo para 'edit'/'view'
  parentCategories = [], 
  isSaving = false,
  error = '' // Error pasado desde el padre (ej: fallo al guardar)
}) {

  // Estado interno del formulario
  const [submittedFormData, setFormData] = useState({
    categoryName: '',
    categoryType: 'gasto',
    isVariable: false,
    categoryIcon: '',
    categoryColor: '#e0e0e0',
    parent_category_id: '',
  });
  const [localError, setLocalError] = useState(''); // Para errores de validación interna

  // Sincronizar estado interno cuando cambian las props
  useEffect(() => {
    setLocalError(error); // Mostrar error del padre si existe
    if (isOpen) {
      if ((mode === 'edit' || mode === 'view') && initialData) {
        setFormData({
          categoryName: initialData.name || '',
          categoryType: initialData.type || 'gasto',
          isVariable: initialData.is_variable || false,
          categoryIcon: initialData.icon || '',
          categoryColor: initialData.color || '#e0e0e0',
          parent_category_id: initialData.parent_category_id || '',
        });
      } else { // Modo 'add' o sin datos válidos
        setFormData({
          categoryName: '', categoryType: 'gasto', isVariable: false,
          categoryIcon: '', categoryColor: '#e0e0e0',
          parent_category_id: '',
        });
      }
    } else {
      setLocalError(''); // Limpiar al cerrar
    }
  }, [isOpen, mode, initialData, error]);

  // Manejador de cambios interno
  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (localError) setLocalError(''); // Limpiar error local al escribir
  };

  //Manejador seleccionar Icono
  const handleIconSelect = (iconClassName) => {
    setFormData(prevData => ({
        ...prevData,
        categoryIcon: iconClassName,
    }));
    if (localError) setLocalError('');
  };

  //Manejador seleccionar Color
  const handleColorSelect = (colorValue) => {
    setFormData(prevData => ({
        ...prevData,
        categoryColor: colorValue,
    }));
    if (localError) setLocalError('');
  };

  // Manejador de submit interno
  const handleSubmit = (event) => {
    event.preventDefault();
    if (mode === 'view') return; // No enviar si solo es vista

    // Validación interna básica
    if (!submittedFormData.categoryName.trim()) {
      setLocalError('El nombre es obligatorio.');
      return;
    }
    // Aquí podrías añadir más validaciones (ej: formato icono) si quieres

    // Asegurarse de que parent_category_id sea null si está vacío, para Supabase
    const dataToSubmit = {
      ...submittedFormData,
      parent_category_id: submittedFormData.parent_category_id === '' ? null : submittedFormData.parent_category_id
    };

    setLocalError('');
    onSubmit(dataToSubmit); // Llama a la función onSubmit del padre con los datos
  };

  // No renderizar si no está abierto
  if (!isOpen) return null;

  // Determinar si los campos deben estar deshabilitados
  const isDisabled = mode === 'view' || isSaving;
  // No se puede seleccionar como padre la categoría que se está editando
  const filteredParentCategories = parentCategories.filter(pCat => initialData ? pCat.id !== initialData.id : true);

  return (
    <div className="modal-overlay active" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget && !isSaving) onClose(); }}>
      <div className="modal-content">
        <h2>
          {mode === 'add' ? 'Añadir Nueva Categoría' : (mode === 'edit' ? 'Editar Categoría' : 'Ver Categoría')}
        </h2>
        <form onSubmit={handleSubmit}>
          {/* ID y Default no son editables, pero pueden ser útiles */}
          <input type="hidden" name="categoryId" value={initialData?.id || ''} readOnly />
          <input type="hidden" name="isDefaultCategory" value={initialData?.is_default ? 'true' : 'false'} readOnly/>

          <div className="input-group">
            <label htmlFor="categoryNameModal">Nombre</label> {/* Cambiado id por colisión */}
            <input type="text" id="categoryNameModal" name="categoryName" required value={submittedFormData.categoryName} onChange={handleInputChange} disabled={isDisabled}/>
          </div>

          {/* --- NUEVO CAMPO: SELECTOR DE CATEGORÍA PADRE --- */}
          {/* Solo mostrar si no es una categoría por defecto (las default no pueden ser hijas) */}
          {/* Y solo en modo 'add' o 'edit' */}
          {(mode === 'add' || (mode === 'edit' && initialData && !initialData.is_default)) && (
            <div className="input-group">
              <label htmlFor="parentCategoryModal">Categoría Padre (Opcional)</label>
              <select 
                id="parentCategoryModal" 
                name="parent_category_id" 
                value={submittedFormData.parent_category_id} 
                onChange={handleInputChange} 
                disabled={isDisabled}
              >
              <option value="">(Ninguna - Categoría Principal)</option>
                {filteredParentCategories.map(pCat => (
                  <option key={pCat.id} value={pCat.id}>
                    {pCat.name} ({pCat.type === 'ingreso' ? 'Ingreso' : 'Gasto'})
                  </option>
                ))}
              </select>
                <small>Si la dejas en blanco, será una categoría principal.</small>
            </div>
          )}

          <div className="input-group">
            <label>Tipo</label>
            <div className="radio-group">
              <label> <input type="radio" name="categoryType" value="gasto" checked={submittedFormData.categoryType === 'gasto'} onChange={handleInputChange} disabled={isDisabled}/> Gasto </label>
              <label> <input type="radio" name="categoryType" value="ingreso" checked={submittedFormData.categoryType === 'ingreso'} onChange={handleInputChange} disabled={isDisabled}/> Ingreso </label>
            </div>
          </div>

          <div className="input-group">
              <div className="checkbox-container" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input type="checkbox" id="categoryIsVariableModal" name="isVariable" checked={submittedFormData.isVariable} onChange={handleInputChange} style={{ width: 'auto' }} disabled={isDisabled}/>
                  <label htmlFor="categoryIsVariableModal" style={{ marginBottom: '0' }}>¿Es Gasto Variable?</label>
              </div>
              <p className="input-description" style={{ fontSize: '0.8em', color: '#666', marginTop: '5px' }}> Marcar para gastos variables (Ocio, Comidas...). Desmarcar para fijos (Alquiler...). </p>
          </div>

          <div className="input-group">
            <label htmlFor="categoryIconModal">Icono</label>
              <div className="icon-selector-container">
                {PREDEFINED_ICONS.map(icon => (
                  <button
                    type="button" // Importante para que no envíe el formulario
                    key={icon.className}
                    className={`icon-selector-btn ${submittedFormData.categoryIcon === icon.className ? 'selected' : ''}`}
                    title={icon.name}
                    onClick={() => handleIconSelect(icon.className)}
                    disabled={isDisabled}
                  >
                  <i className={icon.className}></i>
                  </button>
                ))}
              </div>
              <input 
                type="text" 
                id="categoryIconModal" 
                name="categoryIcon" 
                placeholder="O pega una clase Font Awesome (ej: fas fa-home)" 
                value={submittedFormData.categoryIcon} 
                onChange={handleInputChange} 
                disabled={isDisabled}
                style={{marginTop: '10px'}}
              />
              <small>Selecciona un icono de la lista o introduce una clase de <a href="https://fontawesome.com/search?m=free&s=solid" target="_blank" rel="noopener noreferrer">Font Awesome (Solid)</a>.</small>
            </div>

            <div className="input-group">
              <label htmlFor="categoryColorModal">Color de Fondo</label>
                <div className="color-palette-container">
                  {PREDEFINED_COLORS.map(color => (
                    <button
                      type="button" // Importante para que no envíe el formulario
                      key={color.value}
                      className={`color-palette-btn ${submittedFormData.categoryColor === color.value ? 'selected' : ''}`}
                      title={color.name}
                      style={{ backgroundColor: color.value }}
                      onClick={() => handleColorSelect(color.value)}
                      disabled={isDisabled}
                    >
                    {/* Opcional: un checkmark si está seleccionado */}
                      {submittedFormData.categoryColor === color.value && <i className="fas fa-check" style={{color: isColorDark(color.value) ? 'white' : 'black'}}></i>}
                    </button>
                  ))}
                </div>
                <div className="custom-color-picker-container" style={{marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px'}}>
                  <input 
                    type="color" 
                    id="categoryColorModal" 
                    name="categoryColor" 
                    value={submittedFormData.categoryColor} 
                    onChange={handleInputChange} 
                    disabled={isDisabled}
                    style={{height: '38px', width: '50px', padding: '2px', border: '1px solid #ccc', borderRadius: '4px'}}
                  />
                  <span style={{fontSize: '0.9em'}}>O elige uno personalizado</span>
                </div>
                  <small>Selecciona un color de la paleta o elige uno personalizado.</small>
              </div>

          {/* Mostrar error (local o del padre) */}
          {(localError || error) && (
              <p className="error-message">{localError || error}</p>
          )}

          <div className="modal-actions">
              <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSaving}>
                  {mode === 'view' ? 'Cerrar' : 'Cancelar'}
              </button>
              {mode !== 'view' && (
                  <button type="submit" className="btn btn-primary" disabled={isSaving}>
                      {isSaving ? 'Guardando...' : 'Guardar Categoría'}
                  </button>
              )}
          </div>
        </form>
      </div>
    </div>
  );
}


function isColorDark(hexColor) {
  if (!hexColor) return false;
  const color = (hexColor.charAt(0) === '#') ? hexColor.substring(1, 7) : hexColor;
  const r = parseInt(color.substring(0, 2), 16); // Red
  const g = parseInt(color.substring(2, 4), 16); // Green
  const b = parseInt(color.substring(4, 6), 16); // Blue
  return (r * 0.299 + g * 0.587 + b * 0.114) < 186; // Umbral para considerar oscuro
}
export default CategoryModal;