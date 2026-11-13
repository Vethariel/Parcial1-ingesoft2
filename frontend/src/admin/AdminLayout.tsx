import { NavLink, Outlet } from 'react-router'

/** Panel de administración: pestañas + la sección elegida. */
export function AdminLayout() {
  const tab = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-4 py-2 text-sm font-medium ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Administración</h1>
      <nav className="mb-6 flex gap-2 border-b border-slate-200 pb-3">
        <NavLink to="/admin/products" className={tab}>
          Productos
        </NavLink>
        <NavLink to="/admin/categories" className={tab}>
          Categorías
        </NavLink>
        <NavLink to="/admin/orders" className={tab}>
          Órdenes
        </NavLink>
      </nav>
      <Outlet />
    </div>
  )
}
