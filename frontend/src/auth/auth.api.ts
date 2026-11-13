// Llamadas HTTP de autenticación (↔ backend/src/auth/auth.controller.ts).
import { http } from '../api/http.ts'
import type { AuthResult } from '../shared/types.ts'

export const authApi = {
  register: (input: { name: string; email: string; password: string }) =>
    http.post<AuthResult>('/auth/register', input),

  login: (input: { email: string; password: string }) =>
    http.post<AuthResult>('/auth/login', input),

  /** 204 sin cuerpo. Exige la contraseña actual (D30). */
  changePassword: (input: { currentPassword: string; newPassword: string }) =>
    http.patch<void>('/auth/password', input),
}
