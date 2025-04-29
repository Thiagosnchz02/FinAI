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
// import './index.css'; // Eliminamos la importación del CSS por defecto de Vite
import { BrowserRouter } from 'react-router-dom'; // Importa el componente BrowserRouter para el enrutamiento

// Obtiene el elemento raíz del HTML (definido en index.html)
const rootElement = document.getElementById('root');

// Crea el root de React y renderiza la aplicación
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    {/* StrictMode ayuda a detectar problemas potenciales en la aplicación */}
    <BrowserRouter>
      {/* BrowserRouter habilita el enrutamiento basado en historial de navegación */}
      <App />
      {/* Renderiza el componente principal App */}
    </BrowserRouter>
  </React.StrictMode>,
);

