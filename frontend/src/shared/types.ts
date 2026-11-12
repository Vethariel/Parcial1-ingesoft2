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
