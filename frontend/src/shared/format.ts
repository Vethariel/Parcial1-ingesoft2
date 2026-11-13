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
