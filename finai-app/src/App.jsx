/*
Archivo: src/App.jsx
Propósito: Componente raíz de la aplicación. Su única función ahora es
          renderizar el componente que maneja las rutas (AppRouter).
*/
import React from 'react';
// Importamos nuestro componente que define las rutas
import AppRouter from './routes/AppRouter';
// Eliminamos la importación de App.css si no la vamos a usar globalmente aquí
// import './App.css';

function App() {
  // El componente App simplemente devuelve el AppRouter.
  // Toda la lógica de qué página mostrar según la URL está en AppRouter.
  return (
    <AppRouter />
  );
  // Nota: Si necesitas un contenedor general o layout que envuelva TODAS las páginas
  // (incluso el login, landing, etc.), podrías añadirlo aquí, fuera de AppRouter,
  // pero es más común manejar layouts dentro de las rutas o con rutas anidadas.
}

export default App;
