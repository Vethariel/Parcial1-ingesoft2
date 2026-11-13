// Forma de las respuestas del backend (D63: el frontend no comparte código
// con el backend; estos tipos describen lo que la API devuelve).
// Se agregan aquí a medida que cada pantalla los necesita.

/** Respuesta paginada (backend/src/shared/pagination.ts). */
export type Page<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export type Role = 'CUSTOMER' | 'ADMIN'

/** Usuario público (backend/src/users/public-user.ts): nunca trae el hash. */
export type User = {
  id: string
  name: string
  email: string
  address: string | null
  role: Role
}

/** Respuesta de registro y login (backend/src/auth/auth.types.ts). */
export type AuthResult = {
  accessToken: string
  user: User
}
