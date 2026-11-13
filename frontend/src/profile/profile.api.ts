// Llamadas HTTP del perfil (↔ backend/src/users/users.controller.ts).
// El usuario sale del token: no hay id en la URL (D37).
import { http } from '../api/http.ts'
import type { User } from '../shared/types.ts'

export const profileApi = {
  getMe: () => http.get<User>('/users/me'),

  updateMe: (changes: { name?: string; address?: string }) =>
    http.patch<User>('/users/me', changes),
}
