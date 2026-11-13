import type { CartWarning } from '../shared/types.ts'

/** Aviso preventivo del backend (D49): informa, no bloquea. */
export function WarningBadge({ warning, stock }: { warning: CartWarning; stock: number }) {
  const text =
    warning === 'UNAVAILABLE'
      ? 'Ya no está disponible'
      : stock === 0
        ? 'Sin stock por ahora'
        : `Solo hay ${stock} disponible${stock === 1 ? '' : 's'}`
  return <span className="w-fit rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">{text}</span>
}
