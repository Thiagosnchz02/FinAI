/*
Archivo: src/routes/AppRouter.jsx
Propósito: Define todas las rutas principales de la aplicación FinAI
          y mapea cada ruta a su componente de página correspondiente.
*/
import React from 'react';
import { Routes, Route, Link } from 'react-router-dom'; // Añadido Link para NotFound

// Importar todos los componentes de página creados
// **Asegúrate de incluir la extensión .jsx en cada importación**
import Landing from '../pages/Landing.jsx';
import Login from '../pages/Login.jsx';
import ResetPasswordEmail from '../pages/ResetPasswordEmail.jsx';
import ResetPassword from '../pages/ResetPassword.jsx';
import Dashboard from '../pages/Dashboard.jsx';
import Accounts from '../pages/Accounts.jsx';
import Budgets from '../pages/Budgets.jsx';
import Categories from '../pages/Categories.jsx';
import ChangePassword from '../pages/ChangePassword.jsx';
import Debts from '../pages/Debts.jsx';
import Evaluations from '../pages/Evaluations.jsx';
import FixedExpenses from '../pages/FixedExpenses.jsx'; // <-- Añadido .jsx
import Goals from '../pages/Goals.jsx';
import Investments from '../pages/Investments.jsx';
import Loans from '../pages/Loans.jsx';
import Profile from '../pages/Profile.jsx';
import Reports from '../pages/Reports.jsx';
import Settings from '../pages/Settings.jsx';
import Transactions from '../pages/Transactions.jsx';
import Trips from '../pages/Trips.jsx';

// Componente simple para página no encontrada
const NotFound = () => (
  <div style={{ textAlign: 'center', marginTop: '50px' }}>
    <h1>404 - Página no encontrada</h1>
    <p>La página que buscas no existe.</p>
    {/* Usar Link para navegación interna */}
    <Link to="/">Volver al inicio</Link>
  </div>
);

const AppRouter = () => {
  return (
    <Routes>
      {/* Rutas Públicas (accesibles sin iniciar sesión) */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password-email" element={<ResetPasswordEmail />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Rutas Privadas (requerirán autenticación más adelante) */}
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/accounts" element={<Accounts />} />
      <Route path="/budgets" element={<Budgets />} />
      <Route path="/categories" element={<Categories />} />
      <Route path="/change-password" element={<ChangePassword />} />
      <Route path="/debts" element={<Debts />} />
      <Route path="/evaluations" element={<Evaluations />} />
      <Route path="/fixed-expenses" element={<FixedExpenses />} />
      <Route path="/goals" element={<Goals />} />
      <Route path="/investments" element={<Investments />} />
      <Route path="/loans" element={<Loans />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/transactions" element={<Transactions />} />
      <Route path="/trips" element={<Trips />} />

      {/* Ruta Comodín para páginas no encontradas */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRouter;

