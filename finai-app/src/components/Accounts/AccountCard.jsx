import React, {  useMemo  } from 'react';
import { formatCurrency } from '../../utils/formatters'; // Importa desde utils
import { getIconForAccountType } from '../../utils/iconUtils'; // Importa desde utils

const TARGET_BALANCE_VISIBLE_TYPES = ['ahorro', 'ahorro_colchon', 'viajes', 'inversion', 'efectivo', 'corriente', 'otro'];

// El componente recibe la cuenta, el saldo calculado, y los manejadores como props
function AccountCard({ 
  account, 
  balance, 
  numericBalance,
  onEdit,
  onArchive,    // <-- NUEVA PROP
  onUnarchive }) {
  //nDelete }) {
  const iconClass = getIconForAccountType(account.type);
  let typeText = (account.type || 'otro').replace(/_/g, ' ');
  typeText = typeText.charAt(0).toUpperCase() + typeText.slice(1);
  if (typeText === 'Tarjeta credito') typeText = 'Tarjeta de Crédito';

  //const currentNumericBalance = parseFloat(String(balance).replace(/[^\d.,-]+/g,"").replace(/\.(?=.*\.)/g, '').replace(',','.'));
  const balanceNumber = parseFloat(String(balance).replace(/[^0-9.,-]+/g,"").replace('.','').replace(',','.')); // Intenta obtener número del string formateado

  const targetBalance = Number(account.target_balance) || 0;
  const currentNumericBalance = Number(numericBalance) || 0;
  const showTargetInfo = TARGET_BALANCE_VISIBLE_TYPES.includes(account.type) && targetBalance > 0;

  const progressTowardsTarget = useMemo(() => {
    if (!showTargetInfo || targetBalance <= 0) return 0;
    // El progreso se basa en el saldo actual numérico
     if (isNaN(balanceNumber)) return 0; // Si no se pudo parsear el balance, progreso 0
      return Math.min(100, Math.max(0, (balanceNumber / targetBalance) * 100));
  }, [balanceNumber, targetBalance, showTargetInfo]);
  

  // Determinar clase CSS para el saldo
  
  let balanceClass = 'neutral';
    if (!isNaN(balanceNumber)) {
        if (balanceNumber > 0) balanceClass = 'positive';
        else if (balanceNumber < 0) balanceClass = 'negative';
    } else if (String(balance).toLowerCase().includes('error') || String(balance).toLowerCase().includes('n/a')) {
        balanceClass = 'error-text';
    } else if (String(balance).toLowerCase().includes('calculando')) {
        balanceClass = 'calculating-text'; // Para 'Calculando...'
    }

  const isArchived = account.is_archived;

  let targetProgressBarColor = 'var(--accent-blue, #4299e1)'; // Azul por defecto para progreso de objetivo
    if (progressTowardsTarget >= 100) {
        targetProgressBarColor = 'var(--accent-green, #4CAF50)'; // Verde si se alcanzó o superó
    } else if (progressTowardsTarget >= 75) {
        targetProgressBarColor = 'var(--accent-orange, #ff9800)'; // Naranja si está cerca
    }

  const balanceDisplayInfo = useMemo(() => {
        let className = 'neutral';
        let icon = 'fas fa-minus'; // Icono para cero o neutral
        let iconTitle = 'Saldo cero o no especificado';

        if (isNaN(currentNumericBalance)) {
            if (String(balance).toLowerCase().includes('error')) {
                className = 'error-text';
                icon = 'fas fa-exclamation-circle';
                iconTitle = 'Error al cargar saldo';
            } else if (String(balance).toLowerCase().includes('calculando')) {
                className = 'calculating-text';
                icon = 'fas fa-spinner fa-spin'; // Icono de carga
                iconTitle = 'Calculando saldo...';
            }
        } else {
            if (currentNumericBalance > 0.009) { // Un pequeño umbral para considerar positivo
                className = 'positive';
                icon = 'fas fa-arrow-up';
                iconTitle = 'Saldo positivo';
            } else if (currentNumericBalance < -0.009) { // Un pequeño umbral para considerar negativo
                className = 'negative';
                icon = 'fas fa-arrow-down';
                iconTitle = 'Saldo negativo';
            }
            // Si está entre -0.009 y 0.009, se considera neutral/cero con el icono 'fa-minus'
        }
        return { className, icon, iconTitle };
    }, [currentNumericBalance, balance]);

  return (
    <div className={`account-card ${isArchived ? 'archived' : ''}`} data-id={account.id} data-type={account.type} style={{ borderLeftColor: /* tu lógica de color */ '#ccc' }}>
            <div className="card-header">
                <span className="account-icon"><i className={iconClass}></i></span>
                <h3 className="account-name">{account.name}{account.bank_name ? ` | ${account.bank_name}` : ''}</h3>
                {isArchived && <span className="archived-badge-account">Archivada</span>} {/* Badge para archivadas */}
            </div>
            <div className="card-body">
                <p className={`account-balance ${balanceDisplayInfo.className}`}>
                    {balanceDisplayInfo.icon && (
                        <i 
                            className={`${balanceDisplayInfo.icon} balance-indicator-icon`} 
                            title={balanceDisplayInfo.iconTitle}
                        ></i>
                    )}
                    {balance}
                </p>
                <p className="account-type">Tipo: {typeText}</p>
                {showTargetInfo && (
                    <div className="account-target-progress">
                        <div className="target-info">
                            <span>Objetivo: {formatCurrency(targetBalance, account.currency)}</span>
                            {balanceNumber >= targetBalance ? (
                                <span className="target-achieved"><i className="fas fa-check-circle"></i> ¡Conseguido!</span>
                            ) : (
                                <span>Faltan: {formatCurrency(targetBalance - balanceNumber, account.currency)}</span>
                            )}
                        </div>
                        <div className="progress-bar-container target-progress-bar-container" title={`${progressTowardsTarget.toFixed(1)}% del objetivo`}>
                            <div 
                                className="progress-bar" 
                                style={{ width: `${progressTowardsTarget}%`, backgroundColor: targetProgressBarColor }}
                            ></div>
                        </div>
                    </div>
                )}
            </div>
            <div className="card-actions">
                {/* Botón Editar: solo para cuentas activas */}
                {!isArchived && onEdit && (
                    <button onClick={() => onEdit(account)} className="btn-icon btn-edit" aria-label="Editar Cuenta" title="Editar Cuenta"><i className="fas fa-pencil-alt"></i></button>
                )}

                {/* Botón Archivar: solo para cuentas activas */}
                {!isArchived && onArchive && (
                    <button onClick={() => onArchive(account.id, account.name)} className="btn-icon btn-archive-account" aria-label="Archivar Cuenta" title="Archivar Cuenta">
                        <i className="fas fa-archive"></i> {/* Icono de archivar */}
                    </button>
                )}

                {/* Botón Desarchivar: solo para cuentas archivadas */}
                {isArchived && onUnarchive && (
                    <button onClick={() => onUnarchive(account.id, account.name)} className="btn-icon btn-unarchive-account" aria-label="Desarchivar Cuenta" title="Desarchivar Cuenta">
                        <i className="fas fa-box-open"></i> {/* Icono de desarchivar */}
                    </button>
                )}
                {/* El botón de eliminar original se reemplaza por archivar/desarchivar */}
            </div>
        </div>
  );
}

export default AccountCard;