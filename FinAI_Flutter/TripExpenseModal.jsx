import React, { useState, useEffect } from 'react';

function TripExpenseModal({ isOpen, onClose, onSubmit, mode, initialData, tripId, accounts = [], expenseCategories = [], isSaving, error }) {
    // Estado interno del formulario
    const [formData, setFormData] = useState({
        description: '', amount: '', expense_date: '', categorId: '', notes: '', accountId: ''
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
                    categoryId: initialData.category_id || '',
                    notes: initialData.notes || '',
                    accountId: initialData.account_id || ''
                });
            } else { // add
                setFormData({ description: '', amount: '', expense_date: today, categorId: '', notes: '', accountId: accounts.length > 0 ? accounts[0].id : '' });
            }
        } else {
            setLocalError('');
        }
    }, [isOpen, mode, initialData, error, accounts]);

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
        // --- VALIDAR CUENTA DE ORIGEN ---
        if (!formData.accountId) { setLocalError("Selecciona la cuenta de origen del gasto."); return; }
        // Validar categoría si usas un selector y es obligatoria
         if (!formData.categoryId) { setLocalError("Selecciona una categoría para el gasto."); return; }

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
                    {/* --- NUEVO: SELECTOR DE CUENTA DE ORIGEN --- */}
                    <div className="input-group">
                        <label htmlFor="modalExpAccount">Cuenta de Origen</label>
                        <select 
                            id="modalExpAccount" 
                            name="accountId" 
                            required 
                            value={formData.accountId} 
                            onChange={handleChange} 
                            disabled={isSaving || accounts.length === 0}
                        >
                            <option value="" disabled>Selecciona una cuenta...</option>
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                            ))}
                            {accounts.length === 0 && <option disabled>No hay cuentas disponibles</option>}
                        </select>
                    </div>
                    {/* Campo Categoría: selector */}
                    <div className="input-group">
                        <label htmlFor="modalExpCategory">Categoría</label>
                        <select 
                            id="modalExpCategory" 
                            name="categoryId" // O el nombre que uses para el ID
                            required // Si es obligatoria
                            value={formData.categoryId} 
                            onChange={handleChange} 
                            disabled={isSaving || expenseCategories.length === 0}
                        >
                            <option value="" disabled>Selecciona categoría...</option>
                            {expenseCategories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
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