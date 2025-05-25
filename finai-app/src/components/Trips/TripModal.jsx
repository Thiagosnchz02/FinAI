import React, { useState, useEffect } from 'react';

function TripModal({ isOpen, onClose, onSubmit, mode, initialData, isSaving, error }) {
    // Estado interno del formulario
    const [formData, setFormData] = useState({
        name: '', destination: '', start_date: '', end_date: '', budget: 0, saved_amount: 0, notes: '', status: 'planificado',
    });
    const [localError, setLocalError] = useState('');

    // Sincronizar con props al abrir/cambiar
    useEffect(() => {
        setLocalError(error); // Mostrar error del padre
        if (isOpen) {
            if (mode === 'edit' && initialData) {
                setFormData({
                    name: initialData.name || '',
                    destination: initialData.destination || '',
                    // Asegurar formato YYYY-MM-DD para input date
                    start_date: initialData.start_date?.split('T')[0] || '',
                    end_date: initialData.end_date?.split('T')[0] || '',
                    budget: initialData.budget || 0,
                    saved_amount: initialData.saved_amount || 0,
                    notes: initialData.notes || '',
                    status: initialData.status || 'planificado',
                });
            } else { // add
                setFormData({ name: '', destination: '', start_date: '', end_date: '', budget: 0, saved_amount: 0, notes: '', status: 'planificado', });
            }
        } else {
            setLocalError(''); // Limpiar al cerrar
        }
    }, [isOpen, mode, initialData, error]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (localError) setLocalError(''); // Limpiar al escribir
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Validaciones básicas (pueden mejorarse)
        if (!formData.name.trim()) { setLocalError("El nombre del viaje es obligatorio."); return; }
        const budget = parseFloat(formData.budget);
        const saved = parseFloat(formData.saved_amount);
        if (isNaN(budget) || budget < 0) { setLocalError("El presupuesto debe ser un número válido (0 o más)."); return; }
        if (isNaN(saved) || saved < 0) { setLocalError("El ahorrado debe ser un número válido (0 o más)."); return; }
        if (formData.start_date && formData.end_date && formData.start_date > formData.end_date) {
            setLocalError("La fecha de fin no puede ser anterior a la fecha de inicio."); return;
        }
        if (!formData.status) { // Validar que el estado tenga un valor
            setLocalError("Por favor, selecciona un estado para el viaje."); return;
        }

        setLocalError('');
        // Enviar el formData completo (que ahora incluye 'status') al padre
        onSubmit({ 
            ...formData, 
            budget: budget, // Enviar como número
            saved_amount: saved // Enviar como número
        });
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay active" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget && !isSaving) onClose(); }}>
            <div className="modal-content">
                <h2>{mode === 'add' ? 'Añadir Nuevo Viaje' : 'Editar Viaje'}</h2>
                <form onSubmit={handleSubmit}>
                    {/* ID no visible, útil para referencia */}
                    <input type="hidden" name="tripId" value={initialData?.id || ''} readOnly />
                    <div className="input-group"> <label htmlFor="modalTripName">Nombre</label> <input type="text" id="modalTripName" name="name" required value={formData.name} onChange={handleChange} disabled={isSaving}/> </div>
                    <div className="input-group"> <label htmlFor="modalTripDestination">Destino</label> <input type="text" id="modalTripDestination" name="destination" value={formData.destination} onChange={handleChange} disabled={isSaving}/> </div>
                    <div className="input-group"> <label htmlFor="modalTripStartDate">Fecha Inicio</label> <input type="date" id="modalTripStartDate" name="start_date" value={formData.start_date} onChange={handleChange} disabled={isSaving}/> </div>
                    <div className="input-group"> <label htmlFor="modalTripEndDate">Fecha Fin</label> <input type="date" id="modalTripEndDate" name="end_date" value={formData.end_date} onChange={handleChange} disabled={isSaving}/> </div>
                    <div className="input-group"> <label htmlFor="modalTripBudget">Presupuesto (€)</label> <input type="number" id="modalTripBudget" name="budget" step="0.01" min="0" value={formData.budget} onChange={handleChange} disabled={isSaving}/> </div>
                    <div className="input-group"> <label htmlFor="modalTripSavedAmount">Ahorrado Específico (€)</label> <input type="number" id="modalTripSavedAmount" name="saved_amount" step="0.01" min="0" value={formData.saved_amount} onChange={handleChange} disabled={isSaving}/> <small>Dinero apartado.</small> </div>
                    {/* --- NUEVO: SELECTOR DE ESTADO DEL VIAJE --- */}
                    <div className="input-group">
                        <label htmlFor="tripStatusM">Estado del Viaje</label>
                        <select 
                            id="tripStatusM" 
                            name="status" 
                            required 
                            value={formData.status} 
                            onChange={handleChange} 
                            disabled={isSaving}
                        >
                            <option value="planificado">Planificado</option>
                            <option value="en curso">En Curso</option>
                            <option value="finalizado">Finalizado</option>
                            {/* Podrías añadir más estados si los necesitas, ej: 'cancelado' */}
                        </select>
                    </div>
                    {/* ----------------------------------------- */}
                    <div className="input-group"> <label htmlFor="modalTripNotes">Notas (Opcional)</label> <textarea id="modalTripNotes" name="notes" rows={2} value={formData.notes} onChange={handleChange} disabled={isSaving}></textarea> </div>

                    {(localError || error) && <p className="error-message">{localError || error}</p>}

                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSaving}>Cancelar</button>
                        <button type="submit" className="btn btn-primary" disabled={isSaving}>
                            {isSaving ? 'Guardando...' : (mode === 'add' ? 'Crear Viaje' : 'Guardar Cambios')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default TripModal;