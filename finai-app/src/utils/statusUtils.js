/**
 * Devuelve la clase CSS para el badge de estado de la deuda.
 * @param {string | null | undefined} status El estado de la deuda ('pendiente', 'parcial', 'pagada').
 * @returns {string} La clase CSS correspondiente.
 */
export const getStatusBadgeClass = (status) => {
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
export const getStatusText = (status) => {
    switch (status?.toLowerCase()) {
        case 'pagada': return 'Pagada';
        case 'pendiente': return 'Pendiente';
        case 'parcial': return 'Parcial';
        default: return 'Pendiente';
    }
};
  /**
 * Devuelve la clase CSS para el badge de estado de un préstamo.
 * @param {string | null | undefined} status ('cobrado', 'pendiente', 'parcial').
 * @returns {string} La clase CSS correspondiente.
 */
  export const getStatusBadgeClassLoan = (status) => {
    switch (status?.toLowerCase()) {
        case 'cobrado': return 'status-collected'; // Necesitas definir esta clase en tu CSS/SCSS
        case 'pendiente': return 'status-pending-loan'; // Necesitas definir esta clase
        case 'parcial': return 'status-partial-loan'; // Necesitas definir esta clase
        default: return 'status-pending-loan';
    }
};

/**
 * Devuelve el texto legible para el estado de un préstamo.
 * @param {string | null | undefined} status ('cobrado', 'pendiente', 'parcial').
 * @returns {string} El texto descriptivo del estado.
 */
export const getStatusTextLoan = (status) => {
    switch (status?.toLowerCase()) {
        case 'cobrado': return 'Cobrado';
        case 'pendiente': return 'Pendiente';
        case 'parcial': return 'Parcialmente Cobrado';
        default: return 'Pendiente';
    }
};