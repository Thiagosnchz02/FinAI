/*
Archivo: src/routes/AppRouter.jsx
Propósito: Define todas las rutas principales de la aplicación FinAI,
           utilizando Rutas Protegidas para manejar la autenticación.
*/
import React from 'react';
// Importa Navigate para redirecciones
import { Routes, Route, Link, Navigate } from 'react-router-dom';

// Importa el componente de Ruta Protegida
import ProtectedRoute from '../components/ProtectedRoute.jsx'; // Ajusta la ruta si es necesario

// Importar todos los componentes de página creados
// import Landing from '../pages/Landing.jsx'; // <--- ELIMINAR esta importación
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
import FixedExpenses from '../pages/FixedExpenses.jsx';
import Goals from '../pages/Goals.jsx';
import Investments from '../pages/Investments.jsx';
import Loans from '../pages/Loans.jsx';
import Profile from '../pages/Profile.jsx';
import Reports from '../pages/Reports.jsx';
import Settings from '../pages/Settings.jsx';
import Transactions from '../pages/Transactions.jsx';
import Trips from '../pages/Trips.jsx';

// Componente simple para página no encontrada (sin cambios)
const NotFound = () => (
  <div style={{ textAlign: 'center', marginTop: '50px' }}>
    <h1>404 - Página no encontrada</h1>
    <p>La página que buscas no existe.</p>
    {/* Corregido: Usar /dashboard si el usuario está logueado, o /login si no?
        Por simplicidad, lo dejamos apuntando a /login por ahora si llega aquí.
        Idealmente, el ProtectedRoute ya habría redirigido si intenta acceder
        a una ruta protegida inexistente sin login. */}
    <Link to="/login">Volver al login</Link>
  </div>
);

const AppRouter = () => {
  return (
    <Routes>
      {/* Rutas Públicas (Fuera del ProtectedRoute) */}
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password-email" element={<ResetPasswordEmail />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      {/* ELIMINADA: <Route path="/" element={<Landing />} /> */}


      {/* Rutas Privadas (Envueltas por ProtectedRoute) */}
      <Route element={<ProtectedRoute />}>
        {/* Todo lo que esté aquí dentro requiere autenticación */}
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

        {/* Ruta Raíz para usuarios autenticados */}
        {/* Redirige automáticamente de '/' a '/dashboard' si el usuario está logueado */}
        <Route index element={<Navigate to="/dashboard" replace />} />
        {/* Opcionalmente, si quieres que '/' también muestre el dashboard directamente: */}
        {/* <Route path="/" element={<Dashboard />} /> */}

      </Route> {/* Fin de Rutas Protegidas */}


      {/* Ruta Comodín (Catch-all) para páginas no encontradas */}
      {/* Esta ruta capturará cualquier URL que no coincida con las anteriores */}
      <Route path="*" element={<NotFound />} />

    </Routes>
  );
};

export default AppRouter;

