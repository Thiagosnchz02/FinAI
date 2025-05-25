import React, { useState, useEffect, useCallback } from 'react'; // Añadido useCallback
import { supabase } from '../../services/supabaseClient'; // Importar supabase para RPC
import { useAuth } from '../../contexts/AuthContext.jsx'; // Importar useAuth para user.id
import { formatCurrency } from '../../utils/formatters.js'; // Para mostrar la sugerencia formateada

function BudgetModal({
  isOpen,
  onClose,
  onSubmit, // Función que recibe los datos del formulario al guardar
  mode = 'add',
  initialData = null, // { categoryId: '', amount: '' } o null
  isSaving = false,
  error = '',
  availableCategories = [], // Lista de categorías que se pueden seleccionar
  displayPeriod = '',
  selectedPeriod // Para mostrar en el título
}) {

  const { user } = useAuth();

  const [formData, setFormData] = useState({ categoryId: '', amount: '' });
  const [localError, setLocalError] = useState('');

  const [suggestedAmount, setSuggestedAmount] = useState(null);
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);

  // Sincronizar estado interno con props cuando el modal se abre o cambian los datos iniciales/error
  useEffect(() => {
    setLocalError(error); // Mostrar error pasado desde el padre
    if (isOpen) {
      setSuggestedAmount(null); 
      setIsLoadingSuggestion(false);
      if (mode === 'edit' && initialData) {
        setFormData({
          categoryId: initialData.category_id || '', // Asegúrate que initialData tenga category_id
          amount: initialData.amount || '',
        });
      } else { // Modo 'add' o sin datos
        setFormData({ categoryId: '', amount: '' });
      }
    } else {
      setLocalError(''); // Limpiar error local al cerrar
    }
  }, [isOpen, mode, initialData, error]);

  // --- NUEVO useEffect PARA OBTENER SUGERENCIA ---
    useEffect(() => {
        // Solo en modo 'add', cuando se selecciona una categoría, y tenemos usuario y periodo
        if (isOpen && mode === 'add' && formData.categoryId && user?.id && selectedPeriod) {
            const fetchSuggestion = async () => {
                setIsLoadingSuggestion(true);
                setSuggestedAmount(null); // Limpiar sugerencia anterior
                console.log(`BudgetModal: Obteniendo sugerencia para categoría ${formData.categoryId}, periodo ${selectedPeriod}`);

                // La p_reference_date es el primer día del mes del selectedPeriod
                const [year, month] = selectedPeriod.split('-').map(Number);
                const referenceDate = new Date(Date.UTC(year, month - 1, 1)).toISOString().split('T')[0];
                const monthsLookback = 3; // Mirar los últimos 3 meses, puedes hacerlo configurable

                try {
                    const { data, error: rpcError } = await supabase.rpc('get_category_spending_suggestion', {
                        p_user_id: user.id,
                        p_target_category_id: formData.categoryId,
                        p_reference_date: referenceDate,
                        p_months_lookback: monthsLookback
                    });

                    if (rpcError) {
                        throw rpcError;
                    }
                    
                    console.log("BudgetModal: Sugerencia recibida:", data);
                    if (data !== null && data > 0) { // Solo mostrar si es un valor positivo
                        setSuggestedAmount(data);
                    } else {
                        setSuggestedAmount(0); // Indicar que no hay gasto o es 0
                    }

                } catch (err) {
                    console.error("BudgetModal: Error obteniendo sugerencia de gasto:", err);
                    // No mostrar error al usuario por esto, es solo una sugerencia
                    setSuggestedAmount(null); // O 0 si prefieres
                } finally {
                    setIsLoadingSuggestion(false);
                }
            };

            fetchSuggestion();
        } else {
            // Si no se cumplen las condiciones (ej. se deselecciona categoría), limpiar sugerencia
            setSuggestedAmount(null);
        }
    // formData.categoryId es la dependencia clave para disparar esto
    // user?.id y selectedPeriod deben estar disponibles
    }, [isOpen, mode, formData.categoryId, user?.id, selectedPeriod, supabase]); 

  // Manejador local de cambios
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (localError) setLocalError(''); // Limpiar error al escribir
    if (name !== 'categoryId') {
            // Si el usuario empieza a escribir su propio importe, podríamos ocultar la sugerencia
            // o dejarla visible como referencia. Por ahora, la dejamos.
        }
  };

  // Manejador local de submit
  const handleSubmit = (event) => {
    event.preventDefault();
    // Validaciones básicas (se pueden reforzar en el padre también)
    if (!formData.categoryId) {
      setLocalError('Selecciona una categoría.'); return;
    }
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      setLocalError('El importe debe ser mayor que cero.'); return;
    }
    setLocalError('');
    onSubmit(formData); // Llama a la función onSubmit del padre con los datos actuales
  };

  // No renderizar si no está abierto
  if (!isOpen) return null;

  return (
    <div className="modal-overlay active" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget && !isSaving) onClose(); }}>
      <div className="modal-content">
        {/* Título dinámico */}
        <h2>{mode === 'add' ? `Añadir Presupuesto (${displayPeriod})` : `Editar Presupuesto (${displayPeriod})`}</h2>
        <form onSubmit={handleSubmit}>
          {/* Campo oculto para ID (aunque no se use directamente aquí, puede ser útil) */}
          <input type="hidden" name="budgetId" value={initialData?.id || ''} readOnly />

          <div className="input-group">
            <label htmlFor="modalBudgetCategory">Categoría (Gasto)</label>
            <select
              id="modalBudgetCategory"
              name="categoryId"
              required
              value={formData.categoryId}
              onChange={handleInputChange}
              disabled={mode === 'edit' || isSaving || availableCategories.length === 0}
            >
              {/* Opción por defecto */}
              <option value="" disabled>Selecciona...</option>

              {/* Si editamos, mostramos la categoría actual (aunque no esté en availableCategories) */}
              {mode === 'edit' && initialData?.category_data && (
                 <option value={initialData.category_id}>
                     {initialData.category_data.name} {/* Asume que pasas category_data en initialData */}
                 </option>
              )}

              {/* Mostramos las categorías disponibles */}
              {availableCategories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} {/* El 'name' ya viene con "↳ " si es subcategoría */}
                </option>
              ))}

              {/* Mensaje si no hay categorías disponibles (solo en modo 'add') */}
              {mode === 'add' && availableCategories.length === 0 && (
                 <option disabled>No hay más categorías disponibles.</option>
              )}
            </select>
            <small>Un presupuesto por categoría/mes. Las categorías de gasto se muestran aquí.</small>
          </div>

          <div className="input-group">
            <label htmlFor="modalBudgetAmount">Importe Presupuestado (€)</label>
            <input
              type="number" id="modalBudgetAmount" name="amount"
              required step="0.01" placeholder="0.00" min="0.01"
              value={formData.amount} onChange={handleInputChange}
              disabled={isSaving}
              autoFocus={mode === 'edit'}
            />
            {/* --- MOSTRAR SUGERENCIA --- */}
              {mode === 'add' && formData.categoryId && !isLoadingSuggestion && suggestedAmount !== null && (
                <small className="input-suggestion" style={{ display: 'block', marginTop: '5px', color: '#007bff' }}>
                  <i className="fas fa-lightbulb" style={{marginRight: '5px'}}></i>
                  Sugerencia (gasto promedio últimos 3 meses): 
                  <strong> {formatCurrency(suggestedAmount)}</strong>
                </small>
              )}
              {mode === 'add' && formData.categoryId && isLoadingSuggestion && (
                <small className="input-suggestion loading" style={{ display: 'block', marginTop: '5px', color: '#6c757d' }}>
                  <i className="fas fa-spinner fa-spin" style={{marginRight: '5px'}}></i>
                  Calculando sugerencia...
                </small>
              )}
          </div>

          {/* Mostrar error local o el pasado por props */}
          {(localError || error) && (
            <p className="error-message">{localError || error}</p>
          )}

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSaving}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? 'Guardando...' : (mode === 'edit' ? 'Actualizar Importe' : 'Guardar Presupuesto')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BudgetModal;