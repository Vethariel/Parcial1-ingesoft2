// Rutas de la app (como app.module.ts en el backend): qué página corresponde
// a cada URL. Cada dominio agrega aquí sus páginas.
import { Route, Routes } from 'react-router'
import { LoginPage } from './auth/LoginPage.tsx'
import { RegisterPage } from './auth/RegisterPage.tsx'
import { RequireAuth } from './auth/RequireAuth.tsx'
import { CartPage } from './cart/CartPage.tsx'
import { CatalogPage } from './catalog/CatalogPage.tsx'
import { ProductDetailPage } from './catalog/ProductDetailPage.tsx'
import { ProfilePage } from './profile/ProfilePage.tsx'
import { Layout } from './shared/components/Layout.tsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Públicas */}
        <Route index element={<CatalogPage />} />
        <Route path="products/:id" element={<ProductDetailPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        {/* Público: el carrito anónimo funciona sin sesión (§4). */}
        <Route path="cart" element={<CartPage />} />

        {/* Con sesión */}
        <Route
          path="profile"
          element={
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

function NotFound() {
  return <p className="text-slate-500">Esta página no existe.</p>
}
