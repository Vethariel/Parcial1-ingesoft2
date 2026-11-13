import type { OrderStatus } from '../shared/types.ts'

/** Nombre y color de cada estado (lo usan el cliente y el admin). */
const STATUS: Record<OrderStatus, { label: string; className: string }> = {
  PENDING: { label: 'Pendiente de pago', className: 'bg-amber-100 text-amber-800' },
  PROCESSING: { label: 'Procesando pago', className: 'bg-sky-100 text-sky-800' },
  PAID: { label: 'Pagada', className: 'bg-emerald-100 text-emerald-800' },
  SHIPPED: { label: 'Enviada', className: 'bg-indigo-100 text-indigo-800' },
  CANCELLED: { label: 'Cancelada', className: 'bg-slate-200 text-slate-700' },
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { label, className } = STATUS[status]
  return <span className={`w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>{label}</span>
}
