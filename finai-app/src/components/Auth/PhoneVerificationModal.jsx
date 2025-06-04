// src/components/Auth/PhoneVerificationModal.jsx
import React, { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient'; // Ajusta la ruta si es necesario
import toast from 'react-hot-toast';
import PhoneInput, { isValidPhoneNumber, formatPhoneNumber } from 'react-phone-number-input'; // Si permites cambiar el número
import 'react-phone-number-input/style.css';

function PhoneVerificationModal({
    isOpen,
    onClose,
    userId, // ID del usuario actual
    phoneToVerify, // Número de teléfono que se recogió en el registro
    onVerificationSuccess // Callback para cuando el teléfono se verifica con éxito
}) {
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [currentPhoneNumber, setCurrentPhoneNumber] = useState(phoneToVerify || ''); // Permitir editar si es necesario
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            // phoneToVerify ya debería ser E.164 limpio desde localStorage
           const cleanE164Phone = phoneToVerify ? formatPhoneNumber(phoneToVerify, 'E.164') : '';
            setCurrentPhoneNumber(cleanE164Phone || '');
            console.log("[PhoneVerificationModal] Modal abierto. phoneToVerify:", phoneToVerify, "currentPhoneNumber inicializado a (E.164 limpio):", cleanE164Phone);
            setOtp('');
            setOtpSent(false);
            setError('');
        }
    }, [isOpen, phoneToVerify]);

    const handlePhoneNumberChange = useCallback((value) => {
        console.log("[PhoneVerificationModal] PhoneInput value:", value);
        setCurrentPhoneNumber(value || '');
        setError(''); // Limpiar error si el usuario cambia el número
    }, []);

    const handleSendOtp = async () => {
        // Normalizar de nuevo por si el usuario editó el campo y PhoneInput no lo hizo 100%
        const phoneToSend = currentPhoneNumber ? formatPhoneNumber(currentPhoneNumber, 'E.164') : undefined;

        if (!phoneToSend || !isValidPhoneNumber(phoneToSend)) {
            setError('Por favor, introduce un número de teléfono válido en formato internacional.');
            return;
        }
        setIsLoading(true); setError('');
        const toastId = toast.loading('Enviando código...');
        console.log("[PhoneVerificationModal] handleSendOtp: Teléfono a enviar a updateUser y signInWithOtp:", phoneToSend);

        try {
            const { error: updateUserError } = await supabase.auth.updateUser({
                phone: phoneToSend // Enviar E.164 limpio
            });
            if (updateUserError) throw new Error(updateUserError.message || "No se pudo actualizar el número de teléfono.");
            console.log("[PhoneVerificationModal] Teléfono actualizado en auth.users (o ya estaba).");

            const { error: otpError } = await supabase.auth.signInWithOtp({
                phone: phoneToSend, // Enviar E.164 limpio
            });
            if (otpError) throw new Error(otpError.message || "No se pudo enviar el código OTP.");

            toast.success('Código de verificación enviado.', { id: toastId });
            setOtpSent(true);
        } catch (err) {
            console.error('Error en handleSendOtp (PhoneVerificationModal):', err);
            setError(err.message || 'Ocurrió un error.');
            toast.error(err.message || 'Ocurrió un error.', { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        const phoneToVerifyWith = currentPhoneNumber ? formatPhoneNumber(currentPhoneNumber, 'E.164') : undefined;
        if (!phoneToVerifyWith || !otp || otp.length < 6) {
            setError('Introduce un número de teléfono válido y el código OTP de 6 dígitos.');
            return;
        }
        setIsLoading(true); setError('');
        const toastId = toast.loading('Verificando código...');
        console.log(`[PhoneVerificationModal] handleVerifyOtp: Verificando con teléfono: ${phoneToVerifyWith}, token: ${otp}`);

        try {
            const { data, error: verifyError } = await supabase.auth.verifyOtp({
                phone: phoneToVerifyWith, // Enviar E.164 limpio
                token: otp,
                type: 'phone_change',
            });
            if (verifyError) throw new Error(verifyError.message || 'Código OTP incorrecto o expirado.');

            toast.success('¡Número de teléfono verificado!', { id: toastId });
            if (onVerificationSuccess) onVerificationSuccess(phoneToVerifyWith);
            onClose();
        } catch (err) {
            console.error('Error en handleVerifyOtp (PhoneVerificationModal):', err);
            setError(err.message || 'Ocurrió un error.');
            toast.error(err.message || 'Ocurrió un error.', { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay active" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget && !isLoading) onClose(); }}>
            <div className="modal-content small phone-verification-modal-content">
                <button onClick={onClose} className="modal-close-btn" aria-label="Cerrar modal" title="Cerrar" disabled={isLoading}>
                    <i className="fas fa-times"></i>
                </button>
                <h2>Verificar Número de Teléfono</h2>
                
                {!otpSent ? (
                    <>
                        <p className="modal-intro-text">
                            Para completar tu registro y usar todas las funcionalidades (como el agente de IA por WhatsApp),
                            necesitamos verificar el número de teléfono que proporcionaste: <strong>{phoneToVerify}</strong>.
                        </p>
                        <div className="input-group">
                            <label htmlFor="modalPhoneNumberVerify">Número de Teléfono</label>
                            <PhoneInput
                                id="modalPhoneNumberVerify"
                                placeholder="Confirma o corrige tu número"
                                value={currentPhoneNumber}
                                onChange={handlePhoneNumberChange}
                                defaultCountry="ES"
                                international={true}
                                countryCallingCodeEditable={false}
                                disabled={isLoading}
                                className="phone-input-container-modal"
                            />
                            {currentPhoneNumber !== phoneToVerify && phoneToVerify && (
                                <small style={{color: 'var(--accent-orange)'}}>Has modificado el número original.</small>
                            )}
                        </div>
                        {error && <p className="error-message modal-error">{error}</p>}
                        <div className="modal-actions">
                            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isLoading}>Cancelar</button>
                            <button 
                                type="button" 
                                onClick={handleSendOtp} 
                                className="btn btn-primary" 
                                disabled={isLoading || !isValidPhoneNumber(currentPhoneNumber || '')}
                            >
                                {isLoading ? 'Enviando...' : 'Enviar Código de Verificación'}
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <p className="modal-intro-text">
                            Hemos enviado un código de 6 dígitos a <strong>{currentPhoneNumber}</strong>.
                            Por favor, introdúcelo abajo.
                        </p>
                        <div className="input-group">
                            <label htmlFor="modalOtpCode">Código de Verificación (OTP)</label>
                            <input
                                type="text"
                                id="modalOtpCode"
                                value={otp}
                                onChange={(e) => { setOtp(e.target.value); setError(''); }}
                                placeholder="------"
                                maxLength={6}
                                disabled={isLoading}
                                className="otp-input"
                            />
                        </div>
                        {error && <p className="error-message modal-error">{error}</p>}
                        <div className="modal-actions">
                            <button type="button" onClick={() => {setOtpSent(false); setError(''); setOtp('');}} className="btn btn-link" disabled={isLoading}>
                                Cambiar número / Reenviar
                            </button>
                            <button 
                                type="button" 
                                onClick={handleVerifyOtp} 
                                className="btn btn-primary" 
                                disabled={isLoading || otp.length < 6}
                            >
                                {isLoading ? 'Verificando...' : 'Verificar y Confirmar Teléfono'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default PhoneVerificationModal;