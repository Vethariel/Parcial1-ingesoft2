// Cliente HTTP ÚNICO de la app (como PrismaService en el backend: una sola
// puerta hacia afuera). Las páginas nunca llaman a fetch directamente: usan
// los módulos *.api.ts de cada dominio, que usan este archivo.

/** Error de la API con el código HTTP y el mensaje del backend (en español, D39). */
export class ApiError extends Error {
  readonly status: number
  /** Cuerpo completo (p. ej. `excluded` en el 409 de confirmar compra). */
  readonly body: unknown

  constructor(status: number, message: string, body: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

// ─────────────── Token (D60: localStorage, sobrevive a recargar) ───────────────

const TOKEN_KEY = 'accessToken'

/** localStorage puede fallar (modo privado, bloqueado): nunca rompe la app. */
export const tokenStorage = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token)
    } catch {
      /* sin almacenamiento: la sesión dura hasta recargar */
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* nada que limpiar */
    }
  },
}

/**
 * Qué hacer si el backend responde 401 a una petición CON token (expiró,
 * D31). AuthContext lo registra para cerrar la sesión.
 */
let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler
}

// ─────────────────────────────── Peticiones ───────────────────────────────

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE'

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const token = tokenStorage.get()
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}` // D31

  // /api/... → el proxy de Vite lo reenvía al backend (vite.config.ts).
  const response = await fetch(`/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (response.status === 204) {
    return undefined as T // sin cuerpo (p. ej. DELETE)
  }
  const data: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    if (response.status === 401 && token) {
      onUnauthorized?.()
    }
    throw new ApiError(response.status, messageOf(data, response.status), data)
  }
  return data as T
}

/**
 * Nest responde { message: string | string[] }. Zod puede dar varios mensajes
 * (uno por campo): se unen en uno solo para mostrarlo.
 */
function messageOf(data: unknown, status: number): string {
  const message = (data as { message?: unknown } | null)?.message
  if (Array.isArray(message)) return message.join('. ')
  if (typeof message === 'string') return message
  return status >= 500
    ? 'El servidor no está disponible. Intenta de nuevo en un momento.'
    : `Error ${status}`
}

export const http = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
}
