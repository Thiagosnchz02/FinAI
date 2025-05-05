import React, { useState, useEffect } from 'react';

function CategoryModal({
  isOpen,
  onClose,
  onSubmit, // Función del padre que recibe los datos finales
  mode = 'add', // 'add', 'edit', 'view'
  initialData = null, // El objeto categoría completo para 'edit'/'view'
  isSaving = false,
  error = '' // Error pasado desde el padre (ej: fallo al guardar)
}) {

  // Estado interno del formulario
  const [formData, setFormData] = useState({
    categoryName: '',
    categoryType: 'gasto',
    isVariable: false,
    categoryIcon: '',
    categoryColor: '#e0e0e0',
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
        });
      } else { // Modo 'add' o sin datos válidos
        setFormData({
          categoryName: '', categoryType: 'gasto', isVariable: false,
          categoryIcon: '', categoryColor: '#e0e0e0',
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

  // Manejador de submit interno
  const handleSubmit = (event) => {
    event.preventDefault();
    if (mode === 'view') return; // No enviar si solo es vista

    // Validación interna básica
    if (!formData.categoryName.trim()) {
      setLocalError('El nombre es obligatorio.');
      return;
    }
    // Aquí podrías añadir más validaciones (ej: formato icono) si quieres

    setLocalError('');
    onSubmit(formData); // Llama a la función onSubmit del padre con los datos
  };

  // No renderizar si no está abierto
  if (!isOpen) return null;

  // Determinar si los campos deben estar deshabilitados
  const isDisabled = mode === 'view' || isSaving;

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
            <input type="text" id="categoryNameModal" name="categoryName" required value={formData.categoryName} onChange={handleInputChange} disabled={isDisabled}/>
          </div>

          <div className="input-group">
            <label>Tipo</label>
            <div className="radio-group">
              <label> <input type="radio" name="categoryType" value="gasto" checked={formData.categoryType === 'gasto'} onChange={handleInputChange} disabled={isDisabled}/> Gasto </label>
              <label> <input type="radio" name="categoryType" value="ingreso" checked={formData.categoryType === 'ingreso'} onChange={handleInputChange} disabled={isDisabled}/> Ingreso </label>
            </div>
          </div>

          <div className="input-group">
              <div className="checkbox-container" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input type="checkbox" id="categoryIsVariableModal" name="isVariable" checked={formData.isVariable} onChange={handleInputChange} style={{ width: 'auto' }} disabled={isDisabled}/>
                  <label htmlFor="categoryIsVariableModal" style={{ marginBottom: '0' }}>¿Es Gasto Variable?</label>
              </div>
              <p className="input-description" style={{ fontSize: '0.8em', color: '#666', marginTop: '5px' }}> Marcar para gastos variables (Ocio, Comidas...). Desmarcar para fijos (Alquiler...). </p>
          </div>

          <div className="input-group">
              <label htmlFor="categoryIconModal">Icono (Clase Font Awesome)</label>
              <input type="text" id="categoryIconModal" name="categoryIcon" placeholder="Ej: fas fa-shopping-cart" value={formData.categoryIcon} onChange={handleInputChange} disabled={isDisabled}/>
              <small>Busca en <a href="https://fontawesome.com/search?m=free&s=solid" target="_blank" rel="noopener noreferrer">Font Awesome</a>.</small>
              {/* TODO: Añadir validación de formato o preview del icono si se desea */}
          </div>

          <div className="input-group">
              <label htmlFor="categoryColorModal">Color de Fondo</label>
              <input type="color" id="categoryColorModal" name="categoryColor" value={formData.categoryColor} onChange={handleInputChange} disabled={isDisabled}/>
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

export default CategoryModal;