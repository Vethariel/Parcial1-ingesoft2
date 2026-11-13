// Contrato de la sesión: lo que cualquier página puede saber o hacer.
// El estado vive en AuthProvider; las páginas lo leen con useAuth().
import { createContext } from 'react'
import type { AuthResult, User } from '../shared/types.ts'

export type AuthState = {
  /** null = sin sesión. */
  user: User | null
  /** true mientras se recupera la sesión al recargar la página. */
  restoring: boolean
  /** Guarda el token y el usuario que devolvió login o registro. */
  startSession: (result: AuthResult) => void
  /** Actualiza el usuario en pantalla (p. ej. tras editar el perfil). */
  setUser: (user: User) => void
  logout: () => void
}

export const AuthContext = createContext<AuthState | null>(null)
