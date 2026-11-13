// Rutas de la app (como app.module.ts en el backend): qué página corresponde
// a cada URL. Cada dominio agrega aquí sus páginas.
import { Navigate, Route, Routes } from 'react-router'
import { AdminCategoriesPage } from './admin/AdminCategoriesPage.tsx'
import { AdminLayout } from './admin/AdminLayout.tsx'
import { AdminOrderDetailPage } from './admin/AdminOrderDetailPage.tsx'
import { AdminOrdersPage } from './admin/AdminOrdersPage.tsx'
import { AdminProductsPage } from './admin/AdminProductsPage.tsx'
import { LoginPage } from './auth/LoginPage.tsx'
import { RegisterPage } from './auth/RegisterPage.tsx'
import { RequireAuth } from './auth/RequireAuth.tsx'
import { CartPage } from './cart/CartPage.tsx'
import { OrderDetailPage } from './orders/OrderDetailPage.tsx'
import { OrdersPage } from './orders/OrdersPage.tsx'
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

        <Route
          path="orders"
          element={
            <RequireAuth role="CUSTOMER">
              <OrdersPage />
            </RequireAuth>
          }
        />
        <Route
          path="orders/:id"
          element={
            <RequireAuth role="CUSTOMER">
              <OrderDetailPage />
            </RequireAuth>
          }
        />

        {/* Administración: solo ADMIN (los endpoints /admin los protege RolesGuard, D47). */}
        <Route
          path="admin"
          element={
            <RequireAuth role="ADMIN">
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="products" replace />} />
          <Route path="products" element={<AdminProductsPage />} />
          <Route path="categories" element={<AdminCategoriesPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="orders/:id" element={<AdminOrderDetailPage />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

function NotFound() {
  return <p className="text-slate-500">Esta página no existe.</p>
}
