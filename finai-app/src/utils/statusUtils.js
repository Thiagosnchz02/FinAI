/**
 * Devuelve la clase CSS para el badge de estado de la deuda.
 * @param {string | null | undefined} status El estado de la deuda ('pendiente', 'parcial', 'pagada').
 * @returns {string} La clase CSS correspondiente.
 */
const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
        case 'pagada': return 'status-paid';
        case 'pendiente': return 'status-pending';
        case 'parcial': return 'status-partial';
        default: return 'status-pending';
    }
};

/**
 * Devuelve el texto legible para el estado de la deuda.
 * @param {string | null | undefined} status El estado de la deuda.
 * @returns {string} El texto legible del estado.
 */
const getStatusText = (status) => {
    switch (status?.toLowerCase()) {
        case 'pagada': return 'Pagada';
        case 'pendiente': return 'Pendiente';
        case 'parcial': return 'Parcial';
        default: return 'Pendiente';
    }
};