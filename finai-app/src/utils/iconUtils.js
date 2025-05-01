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
  /**
 * Devuelve una clase de icono Font Awesome basada en palabras clave de la descripción o acreedor de la deuda.
 * @param {string} [description=''] La descripción de la deuda.
 * @param {string} [creditor=''] El nombre del acreedor.
 * @returns {string} La clase CSS del icono Font Awesome.
 */
const getIconForDebt = (description = '', creditor = '') => {
    const desc = (description || '').toLowerCase();
    const cred = (creditor || '').toLowerCase();
    if (desc.includes('coche') || desc.includes('car') || desc.includes('vehiculo') || desc.includes('moto')) return 'fas fa-car-side';
    if (desc.includes('hipoteca') || desc.includes('piso') || desc.includes('vivienda') || desc.includes('propiedad') || desc.includes('property')) return 'fas fa-house-damage';
    if (desc.includes('estudios') || desc.includes('master') || desc.includes('universidad') || desc.includes('educacion') || desc.includes('education')) return 'fas fa-graduation-cap';
    if (desc.includes('personal') || cred.includes('maria') || cred.includes('juan')) return 'fas fa-user-friends';
    if (cred.includes('banco') || cred.includes('bank') || cred.includes('caixa') || cred.includes('santander') || cred.includes('bbva') || cred.includes('ing')) return 'fas fa-landmark';
    return 'fas fa-money-bill-wave';
};
  // Puedes añadir aquí getIconClass general u otros mapeos de iconos