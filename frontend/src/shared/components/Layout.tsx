import type { ReactNode } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import { MergeBanner } from '../../cart/MergeBanner.tsx'
import { useCart } from '../../cart/useCart.ts'

/** Estructura común de todas las páginas: barra superior + contenido. */
export function Layout() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <nav className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:gap-6">
          <NavLink to="/" className="text-lg font-bold text-indigo-600">
            Tienda
          </NavLink>
          <NavItem to="/">Catálogo</NavItem>
          <div className="ml-auto flex items-center gap-4">
            <CartLink />
            <SessionMenu />
          </div>
        </nav>
      </header>
      <MergeBanner />
      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Outlet: aquí se dibuja la página que corresponde a la URL. */}
        <Outlet />
      </main>
    </div>
  )
}

/** Carrito con el número de productos distintos (no se ocultan cuentas: lo informa el backend). */
function CartLink() {
  const { mode, view } = useCart()
  if (mode === 'admin') return null // el admin no compra (D50)
  const count = view?.items.length ?? 0
  return (
    <NavItem to="/cart">
      Carrito
      {count > 0 && (
        <span className="ml-1 rounded-full bg-indigo-600 px-1.5 py-0.5 text-xs font-semibold text-white">{count}</span>
      )}
    </NavItem>
  )
}

/** Lado derecho de la barra: depende de si hay sesión y del rol. */
function SessionMenu() {
  const { user, restoring, logout } = useAuth()
  const navigate = useNavigate()

  if (restoring) return null
  if (!user) {
    return (
      <>
        <NavItem to="/login">Iniciar sesión</NavItem>
        <NavLink
          to="/register"
          className="whitespace-nowrap rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Registrarse
        </NavLink>
      </>
    )
  }
  return (
    <>
      {/* Solo visual: los endpoints /admin los protege RolesGuard (D47). */}
      {user.role === 'ADMIN' && <NavItem to="/admin">Admin</NavItem>}
      {user.role === 'CUSTOMER' && <NavItem to="/orders">Mis órdenes</NavItem>}
      <NavItem to="/profile">{user.name}</NavItem>
      <button
        type="button"
        onClick={() => {
          logout()
          navigate('/')
        }}
        className="text-sm text-slate-500 hover:text-slate-900"
      >
        Salir
      </button>
    </>
  )
}

export function NavItem({ to, children }: { to: string; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `whitespace-nowrap text-sm ${isActive ? 'font-semibold text-indigo-600' : 'text-slate-600 hover:text-slate-900'}`
      }
    >
      {children}
    </NavLink>
  )
}
