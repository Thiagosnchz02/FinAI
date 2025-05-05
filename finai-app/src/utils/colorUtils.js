/*
Archivo: src/utils/colorUtils.js
Propósito: Funciones de utilidad relacionadas con colores.
*/

/**
 * Determina si un color de fondo hexadecimal es "oscuro" (para decidir el color del texto).
 * @param {string | null | undefined} bgColor El color de fondo en formato hexadecimal (ej: '#ffffff', '#000', 'e0e0e0').
 * @returns {boolean} True si el color es oscuro, false en caso contrario o si es inválido.
 */
export const isColorDark = (bgColor) => {
    if (!bgColor || typeof bgColor !== 'string' || bgColor.length < 4) return false; // Validación básica inicial
    try {
        // Limpiar el '#' si existe
        const color = bgColor.charAt(0) === '#' ? bgColor.substring(1) : bgColor;
  
        // Validar longitud (hex corto o largo)
        if (color.length !== 6 && color.length !== 3) return false;
  
        // Convertir a formato largo si es corto (e.g., #03F -> #0033FF)
        const fullHex = color.length === 3
            ? color[0] + color[0] + color[1] + color[1] + color[2] + color[2]
            : color;
  
        // Convertir hex a RGB
        const r = parseInt(fullHex.substring(0, 2), 16);
        const g = parseInt(fullHex.substring(2, 4), 16);
        const b = parseInt(fullHex.substring(4, 6), 16);
  
        // Calcular luminancia (fórmula estándar)
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
        // Umbral de luminancia (0.5 es común, puedes ajustarlo)
        return luminance < 0.5;
  
    } catch (e) {
        console.error("Error parsing color:", bgColor, e);
        return false; // Asumir que no es oscuro si hay error
    }
  };