import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { setUnauthorizedHandler, tokenStorage } from '../api/http.ts'
import { profileApi } from '../profile/profile.api.ts'
import type { AuthResult, User } from '../shared/types.ts'
import { AuthContext, type AuthState } from './auth-context.ts'

/**
 * Dueño de la sesión en el frontend (la "pulsera" del backend, D31):
 * guarda el token y el usuario, y los pone a disposición de toda la app.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  // Si hay un token guardado, al arrancar hay que confirmar que sigue vigente.
  const [restoring, setRestoring] = useState(() => tokenStorage.get() !== null)

  const logout = useCallback(() => {
    tokenStorage.clear()
    setUser(null)
  }, [])

  const startSession = useCallback((result: AuthResult) => {
    tokenStorage.set(result.accessToken)
    setUser(result.user)
  }, [])

  // Token vencido (401 en cualquier petición con token) → se cierra la sesión.
  useEffect(() => {
    setUnauthorizedHandler(logout)
    return () => setUnauthorizedHandler(null)
  }, [logout])

  // Al recargar la página: el token está en localStorage pero el usuario no.
  // GET /users/me lo recupera y, de paso, comprueba que el token es válido.
  useEffect(() => {
    if (!restoring) return
    profileApi
      .getMe()
      .then(setUser)
      .catch(() => logout())
      .finally(() => setRestoring(false))
  }, [restoring, logout])

  const value = useMemo<AuthState>(
    () => ({ user, restoring, startSession, setUser, logout }),
    [user, restoring, startSession, logout],
  )
  return <AuthContext value={value}>{children}</AuthContext>
}
