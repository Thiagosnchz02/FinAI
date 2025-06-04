import React, { useState, useEffect, useRef } from 'react';
//import { QRCode } from 'qrcode.react'; // <-- Importación nombrada
//import QRCode from 'qrcode.react';
import * as QRCode from 'qrcode.react';
import toast from 'react-hot-toast'; // Para feedback de copia

function Setup2faModal({ isOpen, onClose, onVerify, setupData, isProcessing }) {
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const secretInputRef = useRef(null);

  useEffect(() => {
    // Limpiar al abrir/cerrar
    setVerificationCode('');
    setError('');
  }, [isOpen]);

  // Handler para verificar el código (llama al onVerify del padre)
  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^[0-9]{6}$/.test(verificationCode)) {
        setError('Introduce un código de 6 dígitos válido.');
        return;
    }
    try {
        await onVerify(verificationCode); // Llama a la función del padre
        // Si onVerify tiene éxito, el padre llamará a onClose eventualmente
    } catch (err) {
        // Captura el error re-lanzado por el padre para mostrarlo aquí
        console.error("Error caught in modal verify handler:", err);
        setError(err.message || 'Error al verificar el código.');
    }
  };

  // Handler para copiar la clave secreta
  const handleCopySecret = () => {
    if (secretInputRef.current) {
        navigator.clipboard.writeText(secretInputRef.current.value)
            .then(() => toast.success("Clave secreta copiada.")) // Usar toast
            .catch(err => toast.error("Error al copiar."));
    }
  };

  // Función para cancelar que indica si debe intentar desenrolar
  const handleCancel = () => {
    onClose(true); // true indica intentar desenrolar
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay active" style={{ display: 'flex', zIndex: 1050 }} onClick={(e) => { if (e.target === e.currentTarget && !isProcessing) handleCancel(); }}>
      <div className="modal-content">
        <h2>Configurar Autenticación (2FA)</h2>
        <p className="modal-instructions">1. Escanea el código QR con tu app de autenticación (Google Authenticator, Authy, etc.).</p>
        <div className="mfa-setup-details">
          <div className="qr-code-container" style={{ textAlign: 'center', margin: '15px 0' }}>
            {/* Usar qrcode.react para generar el SVG */}
            {setupData.qrCodeSvgString ? (
                // Extraer la data URI correctamente
                <QRCode value={setupData.qrCodeSvgString.replace(/ G$/, '')} size={180} level="M" renderAs="svg"/>
            ) : <p>Generando QR...</p>}
          </div>
          <div className="secret-key-container">
            <label htmlFor="secretCodeDisplay">O introduce esta clave manualmente:</label>
            <div style={{display: 'flex', alignItems: 'center'}}>
                 <input type="text" id="secretCodeDisplay" ref={secretInputRef} readOnly value={setupData.secret || 'GENERANDO...'} style={{flexGrow: 1, marginRight: '5px', backgroundColor: '#eee'}}/>
                 <button type="button" onClick={handleCopySecret} className="btn-icon-small" title="Copiar" disabled={!setupData.secret || isProcessing}><i className="fas fa-copy"></i></button>
            </div>
          </div>
        </div>
        <p className="modal-instructions" style={{marginTop: '15px'}}>2. Introduce el código de 6 dígitos generado por la app.</p>
        <form onSubmit={handleVerify}>
          {/* El factorId se maneja en el padre, no es necesario aquí */}
          <div className="input-group">
            <label htmlFor="verificationCodeInput">Código de Verificación</label>
            <input
                type="text" id="verificationCodeInput" name="verificationCodeInput"
                required inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
                autoComplete="one-time-code" placeholder="123456"
                value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)}
                disabled={isProcessing}
             />
          </div>
          {error && <p className="error-message">{error}</p>}
          <div className="modal-actions">
            <button type="button" onClick={handleCancel} className="btn btn-secondary" disabled={isProcessing}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={isProcessing || verificationCode.length !== 6}>
                {isProcessing ? 'Verificando...' : 'Verificar y Activar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Setup2faModal;