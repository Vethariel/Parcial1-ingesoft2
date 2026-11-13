// Muestra un precio que viene del backend como texto ("19990.50", D45).
// SOLO da formato para leerlo; nunca se suma ni multiplica en el frontend:
// los totales los calcula el backend (CLAUDE.md: sin lógica de negocio aquí).
import { formatPrice } from '../format.ts'

export function Price({ value, className }: { value: string; className?: string }) {
  return <span className={className}>{formatPrice(value)}</span>
}
