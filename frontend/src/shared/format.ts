// Formato de presentación (no es lógica de negocio: no suma ni calcula).

const withoutCents = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})
const withCents = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 2,
})

/** "35000.00" → "$ 35.000"; "159900.50" → "$ 159.900,50". */
export function formatPrice(value: string): string {
  const hasCents = !value.endsWith('.00') && value.includes('.')
  return (hasCents ? withCents : withoutCents).format(Number(value))
}

const dateTime = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' })

/** "2026-11-12T18:15:22.315Z" → "12 nov 2026, 1:15 p. m." (hora local). */
export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso))
}

/** Segundos → "4:05". */
export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** "...0001" corto para mostrar un id largo. */
export function shortId(id: string): string {
  return id.slice(0, 8)
}
