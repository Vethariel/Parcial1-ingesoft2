import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { ErrorMessage, Spinner } from '../shared/components/Feedback.tsx'
import type { Role } from '../shared/types.ts'
import { useAuth } from './useAuth.ts'

/**
 * "Portero" VISUAL de una página (↔ JwtGuard + RolesGuard). Solo evita
 * mostrar pantallas que no sirven: la seguridad real la aplica el backend,
 * que rechaza la petición aunque alguien llegue a la URL.
 */
export function RequireAuth({ role, children }: { role?: Role; children: ReactNode }) {
  const { user, restoring } = useAuth()
  const location = useLocation()

  if (restoring) return <Spinner />
  if (!user) {
    // Al iniciar sesión vuelve a la página que quería ver.
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }
  if (role && user.role !== role) {
    return <ErrorMessage error="No tienes permiso para ver esta página." />
  }
  return children
}
