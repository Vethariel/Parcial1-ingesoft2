/**
 * Disponibilidad mostrada al cliente. Solo informa: la reserva real ocurre al
 * confirmar la compra, de forma atómica en el backend (§6).
 */
export function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) {
    return <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">Agotado</span>
  }
  return (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
      {stock === 1 ? '¡Última unidad!' : `${stock} disponibles`}
    </span>
  )
}
