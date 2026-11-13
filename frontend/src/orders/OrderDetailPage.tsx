import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { ApiError } from '../api/http.ts'
import { useCart } from '../cart/useCart.ts'
import { PaymentPanel } from '../checkout/PaymentPanel.tsx'
import { ErrorMessage, Spinner } from '../shared/components/Feedback.tsx'
import { Card, SuccessMessage } from '../shared/components/Form.tsx'
import { Price } from '../shared/components/Price.tsx'
import { formatDateTime, shortId } from '../shared/format.ts'
import type { ExcludedItem, Order, PayResult } from '../shared/types.ts'
import { useApi } from '../shared/useApi.ts'
import { OrderStatusBadge } from './OrderStatusBadge.tsx'
import { ordersApi } from './orders.api.ts'

/**
 * Una orden del cliente. Si está PENDING, muestra el pago con cuenta
 * regresiva; si no, su resumen. Lo que llegó al confirmar (productos
 * excluidos) viene en el estado de la navegación.
 */
export function OrderDetailPage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const excluded = (location.state as { excluded?: ExcludedItem[] } | null)?.excluded ?? []
  const { data, loading, error, reload } = useApi(() => ordersApi.get(id), [id])
  const { refresh: refreshCart } = useCart()
  const [lastPay, setLastPay] = useState<PayResult | null>(null)
  const [cancelled, setCancelled] = useState(false)

  if (loading && !data) return <Spinner />
  if (error) {
    const notFound = error instanceof ApiError && (error.status === 404 || error.status === 400)
    return <ErrorMessage error={notFound ? 'Esta orden no existe.' : error} />
  }
  if (!data) return null
  // Mientras se recarga tras pagar, se muestra la orden que devolvió el pago
  // (ya actualizada); al terminar, manda la recién leída del backend.
  const order: Order = loading && lastPay ? lastPay.order : data

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <Link to="/orders" className="text-sm text-indigo-600 hover:underline">
        ← Mis órdenes
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Orden #{shortId(order.id)}</h1>
        <OrderStatusBadge status={order.status} />
      </div>

      {excluded.length > 0 && order.status === 'PENDING' && <ExcludedNotice items={excluded} />}
      <PayOutcome result={lastPay} cancelled={cancelled} />

      {order.status === 'PENDING' && (
        <PaymentPanel
          order={order}
          onPaid={(result) => {
            setLastPay(result)
            reload()
          }}
          onCancelled={() => {
            setCancelled(true)
            reload()
            void refreshCart()
          }}
        />
      )}
      {order.status === 'PROCESSING' && (
        <p className="rounded-lg bg-sky-50 px-4 py-3 text-sm text-sky-900">
          Estamos procesando el pago de esta orden. Actualiza la página en unos segundos.
        </p>
      )}

      <Card title="Detalle">
        <ul className="divide-y divide-slate-100">
          {order.items.map((item) => (
            <li key={item.productId} className="flex items-center justify-between gap-4 py-2 text-sm">
              <span>
                {item.productName} <span className="text-slate-500">× {item.quantity}</span>
              </span>
              <span className="text-slate-500">
                <Price value={item.unitPrice} /> c/u
              </span>
              <Price value={item.subtotal} className="w-28 text-right font-medium" />
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
          <span className="font-semibold">Total</span>
          <Price value={order.total} className="text-xl font-bold" />
        </div>
        <dl className="mt-4 grid gap-1 text-sm text-slate-600">
          <div>
            <dt className="inline font-medium">Enviar a: </dt>
            <dd className="inline">{order.shippingAddress}</dd>
          </div>
          <div>
            <dt className="inline font-medium">Creada: </dt>
            <dd className="inline">{formatDateTime(order.createdAt)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-slate-400">
          Precios del momento de la compra: no cambian aunque el producto cambie de precio después.
        </p>
      </Card>
    </div>
  )
}

/** Orden parcial (§6): lo que no entró se quedó en el carrito. */
function ExcludedNotice({ items }: { items: ExcludedItem[] }) {
  const reasons = { UNAVAILABLE: 'ya no está disponible', OUT_OF_STOCK: 'sin stock', PARTIAL: 'stock parcial' }
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p className="mb-1 font-medium">Algunos productos no entraron completos en la orden:</p>
      <ul className="list-inside list-disc">
        {items.map((e) => (
          <li key={e.productId}>
            {e.productName}: pediste {e.requested}, se reservaron {e.reserved} ({reasons[e.reason]})
          </li>
        ))}
      </ul>
      <p className="mt-1">
        Estos productos se mantienen en tu carrito. Revisa su disponibilidad más adelante. Si prefieres no comprar lo
        reservado, puedes cancelar la orden.
      </p>
    </div>
  )
}

/** Resultado del último intento de pago o de la cancelación. */
function PayOutcome({ result, cancelled }: { result: PayResult | null; cancelled: boolean }) {
  if (cancelled) return <SuccessMessage>Orden cancelada. Los productos volvieron al stock.</SuccessMessage>
  if (!result) return null
  const { order, declineReason, attemptsLeft } = result
  if (order.status === 'PAID') return <SuccessMessage>¡Pago aprobado! Gracias por tu compra.</SuccessMessage>
  if (order.status === 'CANCELLED') {
    return <ErrorMessage error={`${declineReason ?? 'Pago rechazado'}. Se agotaron los intentos: la orden se canceló y los productos volvieron al stock.`} />
  }
  if (declineReason) {
    return <ErrorMessage error={`${declineReason}. Te quedan ${attemptsLeft} intento${attemptsLeft === 1 ? '' : 's'}.`} />
  }
  return null
}
