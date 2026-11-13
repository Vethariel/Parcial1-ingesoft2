import type { ReactNode } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'

/** Estructura común de todas las páginas: barra superior + contenido. */
export function Layout() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <nav className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
          <NavLink to="/" className="text-lg font-bold text-indigo-600">
            Tienda
          </NavLink>
          <NavItem to="/">Catálogo</NavItem>
          <div className="ml-auto flex items-center gap-4">
            <SessionMenu />
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Outlet: aquí se dibuja la página que corresponde a la URL. */}
        <Outlet />
      </main>
    </div>
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
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
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
        `text-sm ${isActive ? 'font-semibold text-indigo-600' : 'text-slate-600 hover:text-slate-900'}`
      }
    >
      {children}
    </NavLink>
  )
}
