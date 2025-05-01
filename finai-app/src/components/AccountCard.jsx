import React from 'react';
import { formatCurrency } from '../utils/formatters'; // Importa desde utils
import { getIconForAccountType } from '../utils/iconUtils'; // Importa desde utils

// El componente recibe la cuenta, el saldo calculado, y los manejadores como props
function AccountCard({ account, balance, onEdit, onDelete }) {
  const iconClass = getIconForAccountType(account.type);
  let typeText = (account.type || 'otro').replace(/_/g, ' ');
  typeText = typeText.charAt(0).toUpperCase() + typeText.slice(1);
  if (typeText === 'Tarjeta credito') typeText = 'Tarjeta de Crédito';
  

  // Determinar clase CSS para el saldo
  const balanceNumber = parseFloat(String(balance).replace(/[^0-9.,-]+/g,"").replace('.','').replace(',','.')); // Intenta obtener número del string formateado
  let balanceClass = 'neutral';
  if (!isNaN(balanceNumber)) {
      if (balanceNumber > 0) balanceClass = 'positive';
      else if (balanceNumber < 0) balanceClass = 'negative';
  } else if (balance === 'N/A' || balance === 'Error') {
      balanceClass = 'error-text'; // O una clase específica para error/NA
  }


  return (
    <div className="account-card" data-id={account.id} data-type={account.type}>
      <div className="card-header">
        <span className="account-icon"><i className={iconClass}></i></span>
        <h3 className="account-name">{account.name}{account.bank_name ? ` | ${account.bank_name}` : ''}</h3>
      </div>
      <div className="card-body">
        {/* Mostrar el saldo pasado como prop */}
        <p className={`account-balance ${balanceClass}`}>{balance}</p>
        <p className="account-type">Tipo: {typeText}</p>
      </div>
      <div className="card-actions">
        {/* Llamar a las funciones onEdit/onDelete pasadas como props */}
        <button onClick={() => onEdit(account)} className="btn-icon btn-edit" aria-label="Editar"><i className="fas fa-pencil-alt"></i></button>
        <button onClick={() => onDelete(account.id, account.name)} className="btn-icon btn-delete" aria-label="Eliminar"><i className="fas fa-trash-alt"></i></button>
      </div>
    </div>
  );
}

export default AccountCard;