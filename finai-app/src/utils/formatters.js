/*
Archivo: src/utils/formatters.js
Propósito: Funciones de utilidad para formatear datos (moneda, fechas, etc.).
*/

/**
 * Formatea un número como moneda en formato español (EUR por defecto).
 * @param {number | string | null | undefined} value El valor numérico a formatear.
 * @param {string} [currency='EUR'] El código de moneda ISO 4217.
 * @returns {string} El valor formateado como moneda o 'N/A' si la entrada no es válida.
 */
export const formatCurrency = (value, currency = 'EUR') => {
    if (isNaN(value) || value === null || value === undefined) return 'N/A';
    // Asegurarse de que es un número antes de formatear
    const numberValue = Number(value);
    if (isNaN(numberValue)) return 'N/A'; // Devuelve 'N/A' si la conversión falla
    try {
        return new Intl.NumberFormat('es-ES', {
          style: 'currency',
          currency: currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2 // Asegura siempre 2 decimales
        }).format(numberValue);
    } catch (e) {
        console.error("Error formatting currency:", value, currency, e);
        // Fallback simple si Intl falla
        return `${numberValue.toFixed(2)} ${currency}`;
    }
  };
  
  // Puedes añadir aquí otras funciones de formato, como formatDate, timeAgo, etc.
  // si las vas a reutilizar en otros componentes.
  
  /**
   * Formatea una cadena de fecha (YYYY-MM-DD o ISO) a formato DD/MM/YYYY.
   * @param {string | null | undefined} dateString La cadena de fecha.
   * @returns {string} La fecha formateada o '--/--/----' si no es válida.
   */
  export const formatDate = (dateString) => {
      if (!dateString) return '--/--/----';
      try {
          const date = new Date(dateString);
          // Ajuste crucial para evitar problemas de UTC en fechas sin hora:
          // Crear la fecha asumiendo UTC para que coincida con YYYY-MM-DD
          const year = date.getUTCFullYear();
          const month = date.getUTCMonth();
          const day = date.getUTCDate();
          const adjustedDate = new Date(year, month, day);
  
          if (isNaN(adjustedDate.getTime())) return '--/--/----';
  
          const formattedDay = String(adjustedDate.getDate()).padStart(2, '0');
          const formattedMonth = String(adjustedDate.getMonth() + 1).padStart(2, '0'); // Mes es 0-indexado
          const formattedYear = adjustedDate.getFullYear();
          return `${formattedDay}/${formattedMonth}/${formattedYear}`;
      } catch (e) {
          console.error("Error formateando fecha:", dateString, e);
          return '--/--/----';
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

// --- Añade aquí las de DEUDAS si no estaban ya ---
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
        case 'parcial': return 'Parcial'; // O "Parcialmente Pagada" si prefieres
        default: return 'Pendiente';
    }
};
export const timeAgo = (timestamp) => {
    if (!timestamp) return '';
    const now = new Date();
    const past = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
  
    if (diffInSeconds < 60) return `hace ${diffInSeconds} seg`;
    if (diffInMinutes < 60) return `hace ${diffInMinutes} min`;
    if (diffInHours < 24) return `hace ${diffInHours} h`;
    if (diffInDays === 1) return `ayer`;
    if (diffInDays < 7) return `hace ${diffInDays} días`;
    return past.toLocaleDateString('es-ES'); // Formato fecha si es más antiguo
  };