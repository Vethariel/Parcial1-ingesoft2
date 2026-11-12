// Punto de entrada (como main.ts en el backend): monta la app en el <div id="root">.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* BrowserRouter: hace que la URL del navegador decida qué página se ve. */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
