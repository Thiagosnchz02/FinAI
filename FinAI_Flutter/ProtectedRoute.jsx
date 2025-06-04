import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Spinner from './common/Spinner';
// Opcional: Importa un componente Spinner si tienes uno
// import Spinner from './Spinner';

function ProtectedRoute() {
  const { user, loading } = useAuth();

  // 1. Mientras se verifica la sesión inicial, muestra un loader
  if (loading) {
    // Puedes poner un spinner más elaborado aquí
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spinner size="60px" />
      </div>
    );
  }

  // 2. Si la carga terminó y NO hay usuario, redirige a /login
  if (!user) {
    // `replace` evita que la ruta protegida quede en el historial
    return <Navigate to="/login" replace />;
  }

  // 3. Si la carga terminó y SÍ hay usuario, renderiza el componente hijo
  // <Outlet /> renderizará el componente definido en la ruta anidada (<Dashboard />, <Accounts />, etc.)
  return <Outlet />;
}

export default ProtectedRoute;