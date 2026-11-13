import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { OrderStatusBadge } from '../orders/OrderStatusBadge.tsx'
import { ErrorMessage, Spinner } from '../shared/components/Feedback.tsx'
import { Button, Card, SuccessMessage } from '../shared/components/Form.tsx'
import { Price } from '../shared/components/Price.tsx'
import { formatDateTime, shortId } from '../shared/format.ts'
import { useApi } from '../shared/useApi.ts'
import { useSubmit } from '../shared/useSubmit.ts'
import { adminApi } from './admin.api.ts'

/**
 * Detalle de una orden para el admin, con sus acciones. Los botones se
 * muestran según el estado, pero quien decide si la transición es válida es
 * la máquina de estados del backend (D52): si no aplica, responde 409.
 */
export function AdminOrderDetailPage() {
  const { id = '' } = useParams()
  const { data: order, loading, error, reload } = useApi(() => adminApi.getOrder(id), [id])
  const ship = useSubmit(adminApi.shipOrder)
  const cancel = useSubmit(adminApi.cancelOrder)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [done, setDone] = useState<string | null>(null)

  if (loading && !order) return <Spinner />
  if (error) return <ErrorMessage error={error} />
  if (!order) return null

  const canShip = order.status === 'PAID'
  const canCancel = order.status === 'PENDING' || order.status === 'PAID'

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <Link to="/admin/orders" className="text-sm text-indigo-600 hover:underline">
        ← Órdenes
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold">Orden #{shortId(order.id)}</h2>
        <OrderStatusBadge status={order.status} />
      </div>
      {done && <SuccessMessage>{done}</SuccessMessage>}

      {(canShip || canCancel) && (
        <Card title="Acciones">
          <div className="flex flex-wrap gap-3">
            {canShip && (
              <Button
                busy={ship.busy}
                onClick={async () => {
                  if ((await ship.run(order.id)).ok) {
                    setDone('Orden marcada como enviada.')
                    reload()
                  }
                }}
              >
                Marcar como enviada
              </Button>
            )}
            {canCancel && !confirmingCancel && (
              <Button variant="secondary" onClick={() => setConfirmingCancel(true)}>
                Cancelar orden
              </Button>
            )}
            {canCancel && confirmingCancel && (
              <Button
                variant="danger"
                busy={cancel.busy}
                onClick={async () => {
                  if ((await cancel.run(order.id)).ok) {
                    setDone(
                      order.status === 'PAID'
                        ? 'Orden cancelada: se reembolsó el pago y el stock volvió al inventario.'
                        : 'Orden cancelada: el stock volvió al inventario.',
                    )
                    setConfirmingCancel(false)
                    reload()
                  }
                }}
              >
                {order.status === 'PAID' ? 'Sí, reembolsar y cancelar' : 'Sí, cancelar'}
              </Button>
            )}
          </div>
          {/* 409 (estado cambió), 502 (reembolso falló: la orden NO se cancela, §6). */}
          {(ship.error || cancel.error) && (
            <div className="mt-3">
              <ErrorMessage error={(ship.error ?? cancel.error)!} />
            </div>
          )}
        </Card>
      )}

      <Card title="Detalle">
        <ul className="divide-y divide-slate-100">
          {order.items.map((item) => (
            <li key={item.productId} className="flex justify-between gap-4 py-2 text-sm">
              <span>
                {item.productName} <span className="text-slate-500">× {item.quantity}</span>
              </span>
              <Price value={item.subtotal} className="font-medium" />
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
          <span className="font-semibold">Total</span>
          <Price value={order.total} className="text-xl font-bold" />
        </div>
        <dl className="mt-4 grid gap-1 text-sm text-slate-600">
          <div>
            <dt className="inline font-medium">Cliente: </dt>
            <dd className="inline">#{shortId(order.userId)}</dd>
          </div>
          <div>
            <dt className="inline font-medium">Enviar a: </dt>
            <dd className="inline">{order.shippingAddress}</dd>
          </div>
          <div>
            <dt className="inline font-medium">Creada: </dt>
            <dd className="inline">{formatDateTime(order.createdAt)}</dd>
          </div>
        </dl>
      </Card>
    </div>
  )
}
