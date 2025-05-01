/*
Archivo: src/main.jsx
Propósito: Punto de entrada principal de la aplicación React.
          Renderiza el componente raíz (App), importa estilos globales
          y configura el enrutador.
*/
import React from 'react'; // Importa React (aunque no siempre es estrictamente necesario en archivos JSX modernos, es buena práctica)
import ReactDOM from 'react-dom/client'; // Importa la librería para interactuar con el DOM
import App from './App.jsx'; // Importa el componente principal de la aplicación
import './styles/global.scss'; // Importa nuestros estilos SCSS globales
import { BrowserRouter } from 'react-router-dom'; // Importa el componente BrowserRouter para el enrutamiento
import { AuthProvider } from './contexts/AuthContext.jsx';

// Obtiene el elemento raíz del HTML (definido en index.html)
const rootElement = document.getElementById('root');

// Crea el root de React y renderiza la aplicación
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    {/* 1. BrowserRouter maneja las rutas */}
    <BrowserRouter>
      {/* 2. AuthProvider gestiona y provee el estado de autenticación */}
      <AuthProvider>
        {/* 3. App contiene el AppRouter que muestra las páginas */}
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

