/*
Archivo: src/main.jsx
Propósito: Punto de entrada principal de la aplicación React.
           Renderiza el componente raíz (App), importa estilos globales
           y configura el enrutador.
*/
import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './styles/global.scss';
import App from './App.jsx';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { Toaster } from 'react-hot-toast'; // <-- Importa Toaster

const rootElement = document.getElementById('root');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        {/* --- Coloca <Toaster /> aquí --- */}
        <Toaster
          position="top-center"
          reverseOrder={false}
          toastOptions={{
            duration: 4000,
            success: { duration: 3000 },
            error: { duration: 5000 },
          }}
        />
        {/* ------------------------------- */}
        <App /> {/* App sigue conteniendo el AppRouter */}
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

