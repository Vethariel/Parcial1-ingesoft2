// Muestra un precio que viene del backend como texto ("19990.50", D45).
// SOLO da formato para leerlo; nunca se suma ni multiplica en el frontend:
// los totales los calcula el backend (CLAUDE.md: sin lógica de negocio aquí).

const format = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

export function Price({ value, className }: { value: string; className?: string }) {
  return <span className={className}>{format.format(Number(value))}</span>
}
