// Hook para acciones que MODIFICAN algo (formularios, botones): complementa
// a useApi, que es para leer. Maneja "enviando" y el error del backend.
import { useState } from 'react'

/** Resultado explícito: distingue un éxito sin cuerpo (204) de un fallo. */
export type SubmitResult<T> = { ok: true; value: T } | { ok: false }

export function useSubmit<A extends unknown[], T>(action: (...args: A) => Promise<T>) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  async function run(...args: A): Promise<SubmitResult<T>> {
    setBusy(true)
    setError(null)
    try {
      return { ok: true, value: await action(...args) }
    } catch (err) {
      setError(err as Error) // se muestra con <ErrorMessage error={...} />
      return { ok: false }
    } finally {
      setBusy(false)
    }
  }

  return { run, busy, error }
}
