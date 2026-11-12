// Hook propio para pedir datos al backend (D64: sin librería, explícito).
// Devuelve el estado que toda pantalla necesita: cargando, datos o error.
import { useCallback, useEffect, useState } from 'react'

export type ApiState<T> = {
  data: T | null
  error: Error | null
  loading: boolean
  /** Vuelve a pedir los datos (p. ej. después de modificar algo). */
  reload: () => void
}

/**
 * Ejecuta `load` al montar la pantalla y cada vez que cambie algo de `deps`.
 *
 *   const { data, loading, error } = useApi(() => catalogApi.list(page), [page])
 */
export function useApi<T>(load: () => Promise<T>, deps: unknown[]): ApiState<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    // Si la pantalla cambia antes de que llegue la respuesta (p. ej. el usuario
    // pasa a la página 3 mientras cargaba la 2), la respuesta vieja se ignora.
    let current = true
    setLoading(true)
    setError(null)
    load()
      .then((result) => current && setData(result))
      .catch((err: unknown) => current && setError(err as Error))
      .finally(() => current && setLoading(false))
    return () => {
      current = false
    }
    // `deps` lo decide quien llama; `load` cambia en cada render a propósito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])
  return { data, error, loading, reload }
}
