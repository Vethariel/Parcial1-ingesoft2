import { Link, useSearchParams } from 'react-router'
import { OrderStatusBadge } from '../orders/OrderStatusBadge.tsx'
import { ErrorMessage, Spinner } from '../shared/components/Feedback.tsx'
import { Pagination } from '../shared/components/Pagination.tsx'
import { Price } from '../shared/components/Price.tsx'
import { formatDateTime, shortId } from '../shared/format.ts'
import type { OrderStatus } from '../shared/types.ts'
import { useApi } from '../shared/useApi.ts'
import { adminApi } from './admin.api.ts'

const PAGE_SIZE = 20
const FILTERS: { value?: OrderStatus; label: string }[] = [
  { label: 'Todas' },
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'PROCESSING', label: 'Procesando' },
  { value: 'PAID', label: 'Pagadas' },
  { value: 'SHIPPED', label: 'Enviadas' },
  { value: 'CANCELLED', label: 'Canceladas' },
]

/** Todas las órdenes (caso 13), con filtro por estado. */
export function AdminOrdersPage() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const status = (params.get('status') as OrderStatus | null) ?? undefined
  const { data, loading, error } = useApi(() => adminApi.listOrders(page, PAGE_SIZE, status), [page, status])

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            type="button"
            onClick={() => setParams(f.value ? { status: f.value } : {})}
            className={`rounded-full px-3 py-1 text-sm ${
              status === f.value ? 'bg-indigo-600 text-white' : 'border border-slate-300 bg-white text-slate-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {loading && !data && <Spinner />}
      {error && <ErrorMessage error={error} />}
      {data && data.items.length === 0 && <p className="py-8 text-center text-slate-500">No hay órdenes.</p>}
      <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {data?.items.map((order) => (
          <li key={order.id}>
            <Link to={`/admin/orders/${order.id}`} className="flex flex-wrap items-center gap-4 p-4 hover:bg-slate-50">
              <div className="flex-1">
                <div className="font-medium">Orden #{shortId(order.id)}</div>
                <div className="text-sm text-slate-500">
                  {formatDateTime(order.createdAt)} · cliente #{shortId(order.userId)}
                </div>
              </div>
              <OrderStatusBadge status={order.status} />
              <Price value={order.total} className="w-28 text-right font-semibold" />
            </Link>
          </li>
        ))}
      </ul>
      {data && (
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={data.total}
          onChange={(p) => setParams({ ...(status && { status }), page: String(p) })}
        />
      )}
    </div>
  )
}
