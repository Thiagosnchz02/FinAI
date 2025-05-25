// src/utils/avatarNiceOptions.js

// Paleta de colores comunes para el avatar
export const NICE_AVATAR_COLORS = {
    hair: [
        { name: 'Negro', value: '#000000' }, { name: 'Marrón Oscuro', value: '#2C1E1E' },
        { name: 'Marrón', value: '#4A312C' }, { name: 'Castaño', value: '#542A08' },
        { name: 'Castaño Claro', value: '#71472D' }, { name: 'Avellana', value: '#A56A49' },
        { name: 'Rubio Ceniza', value: '#DBAC84' }, { name: 'Rubio Claro', value: '#E0C0A0' },
        { name: 'Rubio Arena', value: '#D6B8A0' }, { name: 'Rojizo', value: '#AC6464' },
        { name: 'Rubio Dorado', value: '#F5D76E' }, { name: 'Naranja', value: '#F4A460' },
        { name: 'Rubio Platino', value: '#E8DCB3' }, { name: 'Azul Hielo', value: '#D2EFF3' },
        { name: 'Lila', value: '#9287FF' }, { name: 'Turquesa Claro', value: '#6BD9E9' }
    ],
    hat: [
        { name: 'Negro', value: '#000000' }, { name: 'Blanco', value: '#FFFFFF' },
        { name: 'Marrón Sombrero', value: '#77311D' }, { name: 'Rosa Sombrero', value: '#FC909F' },
        { name: 'Azul Hielo Sombrero', value: '#D2EFF3' }, { name: 'Azul Eléctrico Sombrero', value: '#506AF4' },
        { name: 'Naranja Sombrero', value: '#F48150' }
    ],
    face: [ // Colores de piel
        { name: 'Piel Clara', value: '#F9C9B6' }, { name: 'Piel Media', value: '#AC6651' },
        { name: 'Piel Oscura', value: '#77311D' }, { name: 'Piel Amarilla', value: '#F5D76E' },
        { name: 'Piel Pálida', value: '#E0C0A0' }, { name: 'Piel Azulada', value: '#D2EFF3' }
    ],
    shirt: [
        { name: 'Lila Ropa', value: '#9287FF' }, { name: 'Turquesa Ropa', value: '#6BD9E9' },
        { name: 'Rosa Ropa', value: '#FC909F' }, { name: 'Amarillo Ropa', value: '#F4D150' },
        { name: 'Marrón Ropa', value: '#77311D' }, { name: 'Blanco Ropa', value: '#FFFFFF' },
        { name: 'Negro Ropa', value: '#2C1E1E' }, { name: 'Azul Eléctrico Ropa', value: '#506AF4' }
    ],
    // bgColor se define directamente en NICE_AVATAR_OPTIONS porque puede incluir gradientes
};

export const NICE_AVATAR_OPTIONS = {
    sex: [ { value: 'man', label: 'Hombre' }, { value: 'woman', label: 'Mujer' } ],
    faceColor: NICE_AVATAR_COLORS.face.map(c => ({ value: c.value, label: c.name })),
    earSize: [ { value: 'small', label: 'Pequeñas' }, { value: 'big', label: 'Grandes' } ],
    hairStyle: [
        { value: 'none', label: 'Sin Pelo / Calvo' }, // Valor correcto para "sin pelo"
        { value: 'normal', label: 'Normal' }, { value: 'thick', label: 'Grueso' },
        { value: 'mohawk', label: 'Mohicano' }, { value: 'womanLong', label: 'Largo (Mujer)' },
        { value: 'womanShort', label: 'Corto (Mujer)' },
        // Puedes añadir más de la demo de react-nice-avatar si quieres
    ],
    hairColor: NICE_AVATAR_COLORS.hair.map(c => ({ value: c.value, label: c.name })),
    hatStyle: [
        { value: 'none', label: 'Ninguno' }, { value: 'beanie', label: 'Gorro Lana' },
        { value: 'turban', label: 'Turbante' }, { value: 'normal', label: 'Sombrero Normal' }
        // Añade más si quieres
    ],
    hatColor: NICE_AVATAR_COLORS.hat.map(c => ({ value: c.value, label: c.name })),
    eyeStyle: [
        { value: 'circle', label: 'Círculo' }, { value: 'oval', label: 'Ovalados' },
        { value: 'smile', label: 'Sonrientes' }, { value: 'shadow', label: 'Sombreados'}, { value: 'round', label: 'Redondos'}
    ],
    glassesStyle: [
        { value: 'none', label: 'Ningunas' }, { value: 'round', label: 'Redondas' },
        { value: 'square', label: 'Cuadradas' },
    ],
    noseStyle: [ { value: 'short', label: 'Corta' }, { value: 'long', label: 'Larga' }, { value: 'round', label: 'Redonda' } ],
    mouthStyle: [
        { value: 'laugh', label: 'Riendo' }, { value: 'smile', label: 'Sonrisa' },
        { value: 'peace', label: 'Paz' }, { value: 'serious', label: 'Seria'}, { value: 'sad', label: 'Triste'}
    ],
    shirtStyle: [ { value: 'hoody', label: 'Sudadera' }, { value: 'polo', label: 'Polo' }, { value: 'shirt', label: 'Camisa' } ],
    shirtColor: NICE_AVATAR_COLORS.shirt.map(c => ({ value: c.value, label: c.name })),
    bgColor: [ // Para el fondo del avatar
        { value: '#9287FF', label: 'Morado Claro' }, { value: '#6BD9E9', label: 'Turquesa' },
        { value: '#FC909F', label: 'Rosa' }, { value: '#F4D150', label: 'Amarillo' },
        { value: '#E0DDFF', label: 'Lavanda Suave' }, { value: '#D2EFF3', label: 'Azul Hielo' },
        { value: 'linear-gradient(45deg, #3D45C3 0%, #9287FF 100%)', label: 'Gradiente Morado' },
        { value: 'linear-gradient(45deg, #17EAD9 0%, #6078EA 100%)', label: 'Gradiente Turquesa' },
        { value: 'transparent', label: 'Transparente' }, { value: '#FFFFFF', label: 'Blanco'}, { value: '#000000', label: 'Negro'}
    ],
};

// Configuración por defecto para un nuevo avatar con react-nice-avatar
export const DEFAULT_NICE_AVATAR_CONFIG = {
    sex: "man",
    faceColor: "#F9C9B6", // Piel Clara
    earSize: "small",
    hairStyle: "normal",
    hairColor: "#2C1E1E", // Marrón Oscuro
    hatStyle: "none",
    hatColor: "#000000", 
    eyeStyle: "oval",
    glassesStyle: "none",
    noseStyle: "short",
    mouthStyle: "smile",
    shirtStyle: "hoody",
    shirtColor: "#9287FF", // Lila Ropa
    bgColor: "linear-gradient(45deg, #3D45C3 0%, #9287FF 100%)",
    // shape: "circle", // 'shape' es una prop de <Avatar>, no parte de la config de atributos
};
