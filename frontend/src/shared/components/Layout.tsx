import { NavLink, Outlet } from 'react-router'

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
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Outlet: aquí se dibuja la página que corresponde a la URL. */}
        <Outlet />
      </main>
    </div>
  )
}

export function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
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
