// Rutas de la app (como app.module.ts en el backend): qué página corresponde
// a cada URL. Cada dominio agrega aquí sus páginas.
import { Route, Routes } from 'react-router'
import { Layout } from './shared/components/Layout.tsx'
import { HealthPage } from './shared/HealthPage.tsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HealthPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

function NotFound() {
  return <p className="text-slate-500">Esta página no existe.</p>
}
