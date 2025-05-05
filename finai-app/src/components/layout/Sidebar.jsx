import React from 'react';
import { NavLink } from 'react-router-dom'; // Usar NavLink para 'active' class
import finAiLogo from '../../assets/imagotipo.png'; // Ajusta la ruta a tu logo
import { useAuth } from '../../contexts/AuthContext';

// Recibe la función de logout y el estado de carga/guardado general
function Sidebar({ isProcessing }) {
    const { logout } = useAuth();
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src={finAiLogo} alt="FinAi Logo Small" />
      </div>
      <nav className="sidebar-nav">
         {/* Usar NavLink para que React Router maneje la clase 'active' */}
         {/* El 'end' prop asegura que solo la ruta exacta esté activa */}
        <NavLink to="/dashboard" className={({isActive}) => `nav-button ${isActive ? 'active' : ''}`} title="Dashboard" end> <i className="fas fa-home"></i> <span>Dashboard</span> </NavLink>
        <NavLink to="/accounts" className={({isActive}) => `nav-button ${isActive ? 'active' : ''}`} title="Cuentas"> <i className="fas fa-wallet"></i> <span>Cuentas</span> </NavLink>
        <NavLink to="/budgets" className={({isActive}) => `nav-button ${isActive ? 'active' : ''}`} title="Presupuestos"> <i className="fas fa-chart-pie"></i> <span>Presupuestos</span> </NavLink>
        <NavLink to="/categories" className={({isActive}) => `nav-button ${isActive ? 'active' : ''}`} title="Categorías"> <i className="fas fa-tags"></i> <span>Categorías</span> </NavLink>
        <NavLink to="/transactions" className={({isActive}) => `nav-button ${isActive ? 'active' : ''}`} title="Transacciones"> <i className="fas fa-exchange-alt"></i> <span>Transacciones</span> </NavLink>
        <NavLink to="/trips" className={({isActive}) => `nav-button ${isActive ? 'active' : ''}`} title="Viajes"> <i className="fas fa-suitcase-rolling"></i> <span>Viajes</span> </NavLink>
        <NavLink to="/fixed-expenses" className={({isActive}) => `nav-button ${isActive ? 'active' : ''}`} title="Gastos Fijos"> <i className="fas fa-receipt"></i> <span>G. Fijos</span> </NavLink>
        <NavLink to="/goals" className={({isActive}) => `nav-button ${isActive ? 'active' : ''}`} title="Metas"> <i className="fas fa-bullseye"></i> <span>Metas</span> </NavLink>
        <NavLink to="/debts" className={({isActive}) => `nav-button ${isActive ? 'active' : ''}`} title="Deudas"> <i className="fas fa-credit-card"></i> <span>Deudas</span> </NavLink>
        <NavLink to="/loans" className={({isActive}) => `nav-button ${isActive ? 'active' : ''}`} title="Préstamos"> <i className="fas fa-hand-holding-usd"></i> <span>Préstamos</span> </NavLink>
        <NavLink to="/investments" className={({isActive}) => `nav-button ${isActive ? 'active' : ''}`} title="Inversiones"> <i className="fa-solid fa-arrow-trend-up"></i> <span>Inversiones</span> </NavLink>
        <NavLink to="/evaluations" className={({isActive}) => `nav-button ${isActive ? 'active' : ''}`} title="Evaluación"> <i className="fas fa-balance-scale"></i> <span>Evaluación</span> </NavLink>
        <NavLink to="/reports" className={({isActive}) => `nav-button ${isActive ? 'active' : ''}`} title="Informes"> <i className="fas fa-chart-bar"></i> <span>Informes</span> </NavLink>
        <NavLink to="/profile" className={({isActive}) => `nav-button ${isActive ? 'active' : ''}`} title="Perfil"> <i className="fas fa-user-circle"></i> <span>Perfil</span> </NavLink>
        <NavLink to="/settings" className={({isActive}) => `nav-button ${isActive ? 'active' : ''}`} title="Configuración"> <i className="fas fa-cog"></i> <span>Ajustes</span> </NavLink>
      </nav>
      <button
        className="nav-button logout-button"
        onClick={logout}
        title="Cerrar Sesión"
        disabled={isProcessing} // Deshabilitar si algo se está procesando
      >
        {isProcessing ? <><i className="fas fa-spinner fa-spin"></i><span>...</span></> : <><i className="fas fa-sign-out-alt"></i> <span>Salir</span></>}
      </button>
    </aside>
  );
}

export default Sidebar;