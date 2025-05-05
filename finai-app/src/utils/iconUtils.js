/*
Archivo: src/utils/iconUtils.js
Propósito: Funciones de utilidad relacionadas con la obtención de clases de iconos.
*/

/**
 * Devuelve la clase de icono Font Awesome para un tipo de cuenta.
 * @param {string | null | undefined} type El tipo de cuenta (ej: 'corriente', 'ahorro').
 * @returns {string} La clase CSS del icono Font Awesome (ej. "fas fa-landmark").
 */
export const getIconForAccountType = (type) => {
    switch (type?.toLowerCase()) { // Usar toLowerCase para ser más robusto
      case 'nomina': return 'fas fa-wallet';
      case 'corriente': return 'fas fa-landmark';
      case 'viajes': return 'fa-solid fa-plane'; // Asegúrate de tener FA Solid v6 o ajusta
      case 'ahorro': return 'fas fa-piggy-bank';
      case 'ahorro_colchon': return 'fas fa-shield-alt';
      case 'tarjeta_credito': return 'fas fa-credit-card';
      case 'efectivo': return 'fas fa-money-bill-wave';
      case 'inversion': return 'fas fa-chart-line';
      case 'otro': return 'fas fa-question-circle';
      default: return 'fas fa-university'; // Icono genérico por defecto
    }
  };

// --- Mapeo de Keywords a Iconos ---
// Puedes mantener el mapa aquí fuera para mayor claridad o dentro de la función.
const iconMap = {
    // Ingresos
    'nomina': 'fas fa-money-check-alt', 'salario': 'fas fa-money-check-alt',
    'freelance': 'fas fa-briefcase', 'negocio': 'fas fa-store',
    'regalo recibido': 'fas fa-gift', 'otros ingresos': 'fas fa-dollar-sign', 'ingreso': 'fas fa-arrow-down',
    // Gastos Comunes
    'comida': 'fas fa-utensils', 'supermercado': 'fas fa-shopping-basket',
    'restaurante': 'fas fa-concierge-bell', 'cafe': 'fas fa-coffee',
    'transporte': 'fas fa-bus-alt', 'coche': 'fas fa-car', 'gasolina': 'fas fa-gas-pump',
    'parking': 'fas fa-parking',
    'casa': 'fas fa-home', 'hogar': 'fas fa-home', 'alquiler': 'fas fa-file-contract',
    'hipoteca': 'fas fa-file-contract', 'mantenimiento': 'fas fa-tools',
    'facturas': 'fas fa-file-invoice-dollar', 'luz': 'fas fa-lightbulb', 'agua': 'fas fa-tint',
    'gas': 'fas fa-burn', 'internet': 'fas fa-wifi', 'telefono': 'fas fa-phone',
    'compras': 'fas fa-shopping-bag', 'ropa': 'fas fa-tshirt', 'tecnologia': 'fas fa-laptop',
    'ocio': 'fas fa-film', 'cine': 'fas fa-ticket-alt', 'concierto': 'fas fa-music',
    'libros': 'fas fa-book', 'suscripciones': 'fas fa-rss-square', 'netflix': 'fas fa-tv',
    'spotify': 'fab fa-spotify', // Requiere FA Brands (fab)
    'salud': 'fas fa-heartbeat', 'medico': 'fas fa-stethoscope', 'farmacia': 'fas fa-pills',
    'gimnasio': 'fas fa-dumbbell', 'deporte': 'fas fa-running',
    'regalos': 'fas fa-gift', 'donacion': 'fas fa-hand-holding-heart',
    'educacion': 'fas fa-graduation-cap', 'cursos': 'fas fa-chalkboard-teacher',
    'mascotas': 'fas fa-paw',
    'viajes': 'fas fa-plane-departure', 'vacaciones': 'fas fa-umbrella-beach', 'japon': 'fas fa-torii-gate', // Añadido ejemplo
    'tasas': 'fas fa-gavel', 'impuestos': 'fas fa-landmark',
    'inversion': 'fas fa-chart-line',
    'otros gastos': 'fas fa-question-circle', 'gasto': 'fas fa-arrow-up',
    // Transferencias y Pagos
    'transferencia': 'fas fa-exchange-alt', 'pago deudas': 'fas fa-receipt', 'pago prestamo': 'fas fa-hand-holding-usd',
    // Metas (ejemplos)
    'piso': 'fas fa-building', 'entrada': 'fas fa-key',
    'ahorro': 'fas fa-piggy-bank', 'emergencia': 'fas fa-briefcase-medical',
    // Otros
    'evaluacion': 'fas fa-balance-scale',
    'cuenta': 'fas fa-landmark',
    // Default
    'default': 'fas fa-tag'
};

/**
 * Devuelve la clase de icono Font Awesome basada en una palabra clave, nombre de categoría
 * o una clase Font Awesome existente.
 * Busca primero en un mapa predefinido y luego verifica si la keyword ya es una clase FA.
 * @param {string | null | undefined} iconKeyword La palabra clave o clase de icono (ej: 'comida', 'fas fa-car', null).
 * @returns {string} La clase CSS del icono Font Awesome (ej. "fas fa-utensils", "fas fa-tag").
 */
export const getIconClass = (iconKeyword) => {
    // 1. Limpiar y convertir a minúsculas la keyword, o usar '' si es null/undefined
    const lowerKeyword = iconKeyword?.trim().toLowerCase() || '';

    // 2. Si está vacío después de limpiar, devolver default
    if (!lowerKeyword) {
        return iconMap['default'];
    }

    // 3. Buscar en el mapa
    const mappedIcon = iconMap[lowerKeyword];
    if (mappedIcon) {
        return mappedIcon;
    }

    // 4. Verificar si ya es una clase Font Awesome válida (simplificado)
    //    (ej: empieza con 'fa' y contiene ' fa-')
    if (lowerKeyword.startsWith('fa') && lowerKeyword.includes(' fa-')) {
        return iconKeyword.trim(); // Devolver la clase original (con espacios originales)
    }

    // 5. Si no, devolver el icono por defecto
    return iconMap['default'];
};

/**
 * Devuelve una clase de icono Font Awesome basada en palabras clave de la descripción o acreedor de la deuda.
 * @param {string} [description=''] La descripción de la deuda.
 * @param {string} [creditor=''] El nombre del acreedor.
 * @returns {string} La clase CSS del icono Font Awesome.
 */
export const getIconForDebt = (description = '', creditor = '') => {
    const desc = (description || '').toLowerCase();
    const cred = (creditor || '').toLowerCase();
    if (desc.includes('coche') || desc.includes('car') || desc.includes('vehiculo') || desc.includes('moto')) return 'fas fa-car-side';
    if (desc.includes('hipoteca') || desc.includes('piso') || desc.includes('vivienda') || desc.includes('propiedad') || desc.includes('property')) return 'fas fa-house-damage';
    if (desc.includes('estudios') || desc.includes('master') || desc.includes('universidad') || desc.includes('educacion') || desc.includes('education')) return 'fas fa-graduation-cap';
    if (desc.includes('personal') || cred.includes('maria') || cred.includes('juan')) return 'fas fa-user-friends';
    if (cred.includes('banco') || cred.includes('bank') || cred.includes('caixa') || cred.includes('santander') || cred.includes('bbva') || cred.includes('ing')) return 'fas fa-landmark';
    return 'fas fa-money-bill-wave';
};

/**
 * Devuelve la clase de icono de Font Awesome para un préstamo.
 * @param {string} [description=''] (Actualmente no usada para lógica)
 * @returns {string} La clase CSS del icono Font Awesome.
 */
export const getIconForLoan = (description = '') => {
    // Podrías añadir lógica basada en description si quieres, ej:
    // const lowerDesc = description.toLowerCase();
    // if (lowerDesc.includes('coche')) return 'fas fa-car';
    // if (lowerDesc.includes('estudios')) return 'fas fa-graduation-cap';
    return 'fas fa-hand-holding-usd'; // Icono genérico actual
};

export const getIconForTrip = (name = '', destination = '') => {
    const text = `${(name || '').toLowerCase()} ${(destination || '').toLowerCase()}`;
    if (text.includes('japón') || text.includes('asia') || text.includes('tokio')) return 'fas fa-torii-gate';
    if (text.includes('parís') || text.includes('francia') || text.includes('europa') || text.includes('torre eiffel')) return 'fas fa-archway';
    if (text.includes('montaña') || text.includes('senderismo') || text.includes('rural') || text.includes('trekking')) return 'fas fa-hiking';
    if (text.includes('playa') || text.includes('costa') || text.includes('cancún') || text.includes('méxico') || text.includes('caribe')) return 'fas fa-umbrella-beach';
    if (text.includes('avión') || text.includes('vuelo')) return 'fas fa-plane';
    return 'fas fa-suitcase-rolling'; // Icono por defecto
};

// En src/utils/iconUtils.js (añade esta función si no está)
export const getIconForInvestmentType = (type) => {
    switch (type?.toLowerCase()) {
        case 'acciones': return 'fas fa-chart-line';
        case 'fondo': return 'fas fa-seedling';
        case 'crypto': return 'fab fa-bitcoin'; // Requiere FA Brands
        case 'inmueble': return 'fas fa-home';
        case 'otro': return 'fas fa-question-circle';
        default: return 'fas fa-dollar-sign';
    }
};

export const getNotificationIcon = (type) => {
    switch (type) {
        case 'recordatorio_gasto_fijo': return 'fas fa-calendar-alt icon recordatorio_gasto_fijo';
        case 'presupuesto_excedido': return 'fas fa-exclamation-triangle icon presupuesto_excedido';
        case 'meta_alcanzada': return 'fas fa-trophy icon meta_alcanzada';
        default: return 'fas fa-info-circle icon';
    }
  };
  // Puedes añadir aquí getIconClass general u otros mapeos de iconos