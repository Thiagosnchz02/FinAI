// src/components/Profile/AvatarCreatorModal.jsx
import React, { useState, useEffect } from 'react';
import Avatar from 'react-nice-avatar'; // Componente para renderizar el avatar
import { NICE_AVATAR_OPTIONS, DEFAULT_NICE_AVATAR_CONFIG, NICE_AVATAR_COLORS } from '../../utils/avatarNiceOptions.js'; // Ajusta la ruta
import toast from 'react-hot-toast'; // Para el botón aleatorio
import { isColorDark } from '../../utils/colorUtils.js';

function AvatarCreatorModal({
    isOpen,
    onClose,
    onSaveAvatar, // Función para guardar la configuración del avatar
    initialConfig = null, // Configuración inicial si se está editando
    isSaving 
}) {
    const [avatarConfig, setAvatarConfig] = useState(initialConfig || DEFAULT_NICE_AVATAR_CONFIG);

    useEffect(() => {
        if (isOpen) {
            setAvatarConfig(initialConfig || DEFAULT_NICE_AVATAR_CONFIG);
        }
    }, [isOpen, initialConfig]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setAvatarConfig(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSave = () => {
        if (onSaveAvatar) {
            onSaveAvatar(avatarConfig); // Pasa el objeto completo de configuración
        }
    };

    const handleRandomize = () => {
        console.log("Randomizing Avatar...");
        const randomConfig = { 
            // No empezar con DEFAULT_NICE_AVATAR_CONFIG para que todos los campos se randomicen
            // shape: 'circle' // Si quieres que siempre sea círculo
        };

        // Randomizar todas las propiedades de estilo (no colores)
        Object.keys(NICE_AVATAR_OPTIONS).forEach(key => {
            if (key.toLowerCase().includes('color')) return; // Saltar colores aquí

            const optionsArray = NICE_AVATAR_OPTIONS[key];
            if (optionsArray && optionsArray.length > 0) {
                randomConfig[key] = optionsArray[Math.floor(Math.random() * optionsArray.length)].value;
            }
        });

        // Randomizar colores específicos de las paletas
        const colorKeys = ['faceColor', 'hairColor', 'hatColor', 'shirtColor'];
        colorKeys.forEach(colorKey => {
            const paletteName = colorKey.replace('Color', '').toLowerCase(); // 'face', 'hair', 'hat', 'shirt'
            const colorPalette = NICE_AVATAR_COLORS[paletteName]; // NICE_AVATAR_COLORS tiene arrays de objetos {name, value}
            if (colorPalette && colorPalette.length > 0) {
                randomConfig[colorKey] = colorPalette[Math.floor(Math.random() * colorPalette.length)].value; // Usar .value
            } else {
                // Fallback si la paleta específica no existe
                const fallbackPalette = NICE_AVATAR_COLORS.hair;
                if (fallbackPalette && fallbackPalette.length > 0) {
                    randomConfig[colorKey] = fallbackPalette[Math.floor(Math.random() * fallbackPalette.length)].value;
                }
            }
        });

        // Randomizar bgColor (que tiene una estructura diferente en NICE_AVATAR_OPTIONS)
        const bgColorOptions = NICE_AVATAR_OPTIONS['bgColor'];
        if (bgColorOptions && bgColorOptions.length > 0) {
            randomConfig['bgColor'] = bgColorOptions[Math.floor(Math.random() * bgColorOptions.length)].value;
        }
        
        // Asegurar que hairStyle 'none' no tenga color de pelo que lo haga visible
        if (randomConfig.hairStyle === 'none') {
            // La librería debería manejar esto, pero por si acaso, o si quieres un color de piel para la "calva"
            // randomConfig.hairColor = randomConfig.faceColor; // O un color transparente si la librería lo soporta
        }

        console.log("Generated Random Config:", randomConfig);
        setAvatarConfig(randomConfig);
        toast.success("¡Avatar aleatorio generado!", { icon: '🎲'});
    };

    if (!isOpen) return null;

    // Helper para crear selectores
    const renderSelect = (optionKey, label) => {
        const options = NICE_AVATAR_OPTIONS[optionKey] || [];
        if (options.length === 0 && !optionKey.toLowerCase().includes('color')) { // No renderizar si no hay opciones (excepto colores que tienen su propio render)
            console.warn(`No options found for ${optionKey}`);
            return null; 
        }

        // Para los selectores de color, usamos la estructura de NICE_AVATAR_OPTIONS que ya tiene label y value
        // Para otros, usamos la estructura simple.
        const currentOptions = options;

        return (
            <div className="input-group avatar-option-group">
                <label htmlFor={`avatar-${optionKey}`}>{label}</label>
                <select
                    id={`avatar-${optionKey}`}
                    name={optionKey}
                    value={avatarConfig[optionKey] || ''}
                    onChange={handleChange}
                    disabled={isSaving}
                >
                    {currentOptions.map(opt => (
                        <option 
                            key={opt.value} 
                            value={opt.value}
                            // Para selectores de color, mostrar el color en el fondo de la opción
                            style={optionKey.toLowerCase().includes('color') ? 
                                { backgroundColor: opt.value, color: isColorDark(opt.value) ? 'white' : 'black' } 
                                : {}
                            }
                        >
                            {opt.label} {/* Ahora opt.label es el nombre descriptivo */}
                        </option>
                    ))}
                </select>
            </div>
        );
    };

    if (isOpen) {
        console.log("[AvatarCreatorModal] AvatarConfig para renderizar:", JSON.parse(JSON.stringify(avatarConfig)));
    }

    return (
        <div className="modal-overlay active" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget && !isSaving) onClose(); }}>
            <div className="modal-content avatar-creator-modal-content">
                <button onClick={onClose} className="modal-close-btn" aria-label="Cerrar modal" title="Cerrar" disabled={isSaving}>
                    <i className="fas fa-times"></i>
                </button>
                <h2>¡Crea tu Avatar!</h2>

                <div className="avatar-editor-layout">
                    <div className="avatar-preview-pane">
                        <p className="preview-title">Vista Previa</p>
                        <div className="avatar-live-preview">
                            <Avatar
                                style={{ width: '200px', height: '200px' }}
                                {...avatarConfig} // Pasa toda la configuración
                                shape="circle" // Forzar círculo para la preview
                            />
                        </div>
                        <button 
                            type="button" 
                            onClick={handleRandomize} 
                            className="btn btn-secondary btn-sm randomize-btn"
                            disabled={isSaving}
                            title="Generar un avatar aleatorio"
                        >
                            <i className="fas fa-random"></i> Aleatorio
                        </button>
                    </div>

                    <div className="avatar-options-pane">
                        <p className="options-title">Personaliza</p>
                        <div className="options-grid">
                            {renderSelect('sex', 'Sexo')}
                            {renderSelect('faceColor', 'Color de Piel')}
                            {renderSelect('earSize', 'Tamaño Orejas')}
                            {renderSelect('hairStyle', 'Estilo de Pelo')}
                            {renderSelect('hairColor', 'Color de Pelo')}
                            {renderSelect('hatStyle', 'Sombrero/Gorro')}
                            {renderSelect('hatColor', 'Color Sombrero')}
                            {renderSelect('eyeStyle', 'Ojos')}
                            {/* {renderSelect('eyeBrowStyle', 'Cejas')} // Descomenta para añadir más */}
                            {renderSelect('glassesStyle', 'Gafas')}
                            {renderSelect('noseStyle', 'Nariz')}
                            {renderSelect('mouthStyle', 'Boca')}
                            {renderSelect('shirtStyle', 'Ropa')}
                            {renderSelect('shirtColor', 'Color Ropa')}
                            {renderSelect('bgColor', 'Color de Fondo')}
                        </div>
                    </div>
                </div>

                <div className="modal-actions">
                    <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSaving}>
                        Cancelar
                    </button>
                    <button type="button" onClick={handleSave} className="btn btn-primary" disabled={isSaving}>
                        {isSaving ? 'Guardando...' : 'Guardar Avatar'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AvatarCreatorModal;

