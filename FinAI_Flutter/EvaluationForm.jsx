import React from 'react';
// Importa aquí utils si los necesitas DIRECTAMENTE en el form (ej. para alguna lógica específica)
// import { formatCurrency } from '../../utils/formatters'; // Probablemente no necesario aquí

// Recibe el estado formData y los handlers del padre
function EvaluationForm({
  formData,
  onFormChange, // Función para actualizar el estado formData en el padre
  onSubmit, // Función para manejar el submit en el padre
  isSaving,
  evaluationId // ID de la evaluación existente (si hay)
}) {

  // Los valores de los inputs vienen de formData (prop)
  // Los cambios llaman a onFormChange (prop)

  return (
    <form id="evaluationForm" onSubmit={onSubmit}>
      {/* Input oculto para mantener el ID si estamos editando */}
      <input type="hidden" id="evaluationId" value={evaluationId || ''} readOnly />

      <div className="evaluation-grid">
        {/* Columna 1 */}
        <div className="evaluation-column">
          <div className="input-group">
            <label htmlFor="evalIngreso"><i className="fas fa-arrow-down icon-green"></i> Ingreso</label>
            <input type="number" id="evalIngreso" name="evalIngreso" // Usar name para el handler genérico
                   placeholder="0.00" step="any" min="0"
                   value={formData?.evalIngreso || ''}
                   onChange={onFormChange} disabled={isSaving}/>
          </div>
          <div className="input-group">
            <label htmlFor="evalAhorroMes"><i className="fas fa-piggy-bank icon-blue"></i> Ahorro Mes</label>
            <input type="number" id="evalAhorroMes" name="evalAhorroMes"
                   placeholder="0.00" step="any" min="0"
                   value={formData?.evalAhorroMes || ''}
                   onChange={onFormChange} disabled={isSaving}/>
          </div>
          <div className="input-group">
            <label htmlFor="evalFijos"><i className="fas fa-receipt icon-red"></i> Fijos</label>
            <input type="number" id="evalFijos" name="evalFijos"
                   placeholder="0.00" step="any" min="0"
                   value={formData?.evalFijos || ''}
                   onChange={onFormChange} disabled={isSaving}/>
          </div>
          <div className="input-group">
            <label htmlFor="evalVariables"><i className="fas fa-shopping-cart icon-orange"></i> Variables</label>
            <input type="number" id="evalVariables" name="evalVariables"
                   placeholder="0.00" step="any" min="0"
                   value={formData?.evalVariables || ''} 
                   onChange={onFormChange} disabled={isSaving}/>
          </div>
        </div>

        {/* Columna 2 */}
        <div className="evaluation-column">
          <div className="input-group">
            <label htmlFor="evalColchon"><i className="fas fa-shield-alt icon-blue-dark"></i> Colchón</label>
            <input type="number" id="evalColchon" name="evalColchon"
                   placeholder="0.00" step="any" min="0"
                   value={formData?.evalColchon || ''} onChange={onFormChange} disabled={isSaving}/>
          </div>
          <div className="input-group">
            <label htmlFor="evalViajes"><i className="fas fa-plane icon-lightblue"></i> Viajes</label>
            <input type="number" id="evalViajes" name="evalViajes"
                   placeholder="0.00" step="any" min="0"
                   value={formData?.evalViajes || ''} onChange={onFormChange} disabled={isSaving}/>
          </div>
          <div className="input-group">
            <label htmlFor="evalInversion"><i className="fas fa-chart-line icon-purple"></i> Inversión</label>
            <input type="number" id="evalInversion" name="evalInversion"
                   placeholder="0.00" step="any" min="0"
                   value={formData?.evalInversion || ''} onChange={onFormChange} disabled={isSaving}/>
          </div>
          <div className="input-group">
            <label htmlFor="evalExtra"><i className="fas fa-plus-circle icon-green"></i> Extra</label>
            <input type="number" id="evalExtra" name="evalExtra"
                   placeholder="0.00" step="any" // Permite negativos
                   value={formData?.evalExtra || ''} onChange={onFormChange} disabled={isSaving}/>
          </div>
        </div>
      </div>

      {/* Observaciones */}
      <div className="input-group notes-area">
          <label htmlFor="evalObservaciones"><i className="fas fa-pen icon-gray"></i> Observaciones</label>
          <textarea id="evalObservaciones" name="evalObservaciones" // Usar name
                    rows={3} placeholder="Anotaciones sobre la planificación..."
                    value={formData?.evalObservaciones || ''} onChange={onFormChange} disabled={isSaving}></textarea>
      </div>

      {/* Botón Guardar (el feedback de mensaje se muestra fuera del form) */}
      <div className="action-section">
          <button type="submit" id="saveEvaluationBtn" className="btn btn-primary btn-save" disabled={isSaving}>
              <i className="fas fa-save"></i> {isSaving ? 'Guardando...' : 'Guardar Evaluación'}
          </button>
      </div>
    </form>
  );
}

export default EvaluationForm;