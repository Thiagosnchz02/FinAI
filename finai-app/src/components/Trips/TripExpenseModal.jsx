import React, { useState, useEffect } from 'react';

function TripExpenseModal({ isOpen, onClose, onSubmit, mode, initialData, tripId, isSaving, error }) {
    // Estado interno del formulario
    const [formData, setFormData] = useState({
        description: '', amount: '', expense_date: '', category: '', notes: ''
    });
    const [localError, setLocalError] = useState('');

    // Sincronizar con props
    useEffect(() => {
        setLocalError(error);
        const today = new Date().toISOString().split('T')[0];
        if (isOpen) {
            if (mode === 'edit' && initialData) {
                setFormData({
                    description: initialData.description || '',
                    amount: initialData.amount || '',
                    expense_date: initialData.expense_date ? initialData.expense_date.split('T')[0] : today,
                    category: initialData.category || '',
                    notes: initialData.notes || ''
                });
            } else { // add
                setFormData({ description: '', amount: '', expense_date: today, category: '', notes: '' });
            }
        } else {
            setLocalError('');
        }
    }, [isOpen, mode, initialData, error]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (localError) setLocalError('');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Validaciones básicas
        if (!formData.description.trim()) { setLocalError("La descripción es obligatoria."); return; }
        const amount = parseFloat(formData.amount);
        if (isNaN(amount) || amount <= 0) { setLocalError("El importe debe ser un número positivo."); return; }
        if (!formData.expense_date) { setLocalError("La fecha es obligatoria."); return; }
        // No validar categoría aquí, es texto libre

        setLocalError('');
        onSubmit({ ...formData, amount: amount }); // Enviar amount como número
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay active" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget && !isSaving) onClose(); }}>
            <div className="modal-content">
                <h2>{mode === 'add' ? 'Añadir Gasto del Viaje' : 'Editar Gasto del Viaje'}</h2>
                <form onSubmit={handleSubmit}>
                    {/* ID no visible */}
                    <input type="hidden" name="expenseId" value={initialData?.id || ''} readOnly />
                    {/* tripId no necesita input, ya se pasa en onSubmit desde el padre */}
                    <div className="input-group"> <label htmlFor="modalExpDesc">Descripción</label> <input type="text" id="modalExpDesc" name="description" required value={formData.description} onChange={handleChange} disabled={isSaving}/> </div>
                    <div className="input-group"> <label htmlFor="modalExpAmount">Importe (€)</label> <input type="number" id="modalExpAmount" name="amount" required step="0.01" min="0.01" value={formData.amount} onChange={handleChange} disabled={isSaving}/> </div>
                    <div className="input-group"> <label htmlFor="modalExpDate">Fecha</label> <input type="date" id="modalExpDate" name="expense_date" required value={formData.expense_date} onChange={handleChange} disabled={isSaving}/> </div>
                    <div className="input-group"> <label htmlFor="modalExpCategory">Categoría</label> <input type="text" id="modalExpCategory" name="category" value={formData.category} onChange={handleChange} disabled={isSaving} placeholder="(Opcional) Ej: Comida, Transporte..." /> </div>
                    <div className="input-group"> <label htmlFor="modalExpNotes">Notas</label> <textarea id="modalExpNotes" name="notes" rows={2} value={formData.notes} onChange={handleChange} disabled={isSaving}></textarea> </div>

                    {(localError || error) && <p className="error-message">{localError || error}</p>}

                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSaving}>Cancelar</button>
                        <button type="submit" className="btn btn-primary" disabled={isSaving}>
                            {isSaving ? 'Guardando...' : (mode === 'add' ? 'Añadir Gasto' : 'Guardar Cambios')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default TripExpenseModal;