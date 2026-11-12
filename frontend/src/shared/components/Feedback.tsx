// Piezas visuales comunes para los estados de carga y error.

export function Spinner() {
  return (
    <div className="flex justify-center py-12" role="status" aria-label="Cargando">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-indigo-600" />
    </div>
  )
}

/** Muestra el mensaje que envió el backend (ya en español). */
export function ErrorMessage({ error }: { error: Error | string }) {
  const message = typeof error === 'string' ? error : error.message
  return (
    <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
      {message}
    </p>
  )
}
