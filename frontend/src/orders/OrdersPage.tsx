import { Link, useSearchParams } from 'react-router'
import { ErrorMessage, Spinner } from '../shared/components/Feedback.tsx'
import { Pagination } from '../shared/components/Pagination.tsx'
import { Price } from '../shared/components/Price.tsx'
import { formatDateTime, shortId } from '../shared/format.ts'
import { useApi } from '../shared/useApi.ts'
import { OrderStatusBadge } from './OrderStatusBadge.tsx'
import { ordersApi } from './orders.api.ts'

const PAGE_SIZE = 10

/** Mis órdenes (cliente). */
export function OrdersPage() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const { data, loading, error } = useApi(() => ordersApi.list(page, PAGE_SIZE), [page])

  if (loading) return <Spinner />
  if (error) return <ErrorMessage error={error} />
  if (!data) return null

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Mis órdenes</h1>
      {data.items.length === 0 ? (
        <p className="py-12 text-center text-slate-500">
          Aún no tienes órdenes.{' '}
          <Link to="/" className="text-indigo-600 hover:underline">
            Ver el catálogo
          </Link>
        </p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {data.items.map((order) => (
            <li key={order.id}>
              <Link to={`/orders/${order.id}`} className="flex flex-wrap items-center gap-4 p-4 hover:bg-slate-50">
                <div className="flex-1">
                  <div className="font-medium">Orden #{shortId(order.id)}</div>
                  <div className="text-sm text-slate-500">
                    {formatDateTime(order.createdAt)} · {order.items.length} producto{order.items.length === 1 ? '' : 's'}
                  </div>
                </div>
                <OrderStatusBadge status={order.status} />
                <Price value={order.total} className="w-28 text-right font-semibold" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onChange={(p) => setParams({ page: String(p) })} />
    </div>
  )
}
