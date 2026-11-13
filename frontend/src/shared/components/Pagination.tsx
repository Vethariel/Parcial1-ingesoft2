/** Controles "Anterior / Siguiente" para respuestas Page<T> del backend (D41). */
export function Pagination({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number
  pageSize: number
  total: number
  onChange: (page: number) => void
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (pages === 1) return null
  const button = 'rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm disabled:opacity-40'
  return (
    <nav className="mt-8 flex items-center justify-center gap-4" aria-label="Paginación">
      <button type="button" className={button} disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ← Anterior
      </button>
      <span className="text-sm text-slate-600">
        Página {page} de {pages}
      </span>
      <button type="button" className={button} disabled={page >= pages} onClick={() => onChange(page + 1)}>
        Siguiente →
      </button>
    </nav>
  )
}
