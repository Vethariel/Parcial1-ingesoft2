import { useContext } from 'react'
import { AuthContext, type AuthState } from './auth-context.ts'

/** La sesión actual. Solo funciona dentro de <AuthProvider>. */
export function useAuth(): AuthState {
  const auth = useContext(AuthContext)
  if (!auth) {
    throw new Error('useAuth requiere <AuthProvider> en main.tsx')
  }
  return auth
}
