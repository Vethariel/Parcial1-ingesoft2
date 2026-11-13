import { useState, type FormEvent } from 'react'
import { ErrorMessage } from '../shared/components/Feedback.tsx'
import { Button, Card, TextField } from '../shared/components/Form.tsx'
import { Price } from '../shared/components/Price.tsx'
import { formatCountdown } from '../shared/format.ts'
import type { Order, PayResult } from '../shared/types.ts'
import { useNow } from '../shared/useNow.ts'
import { useSubmit } from '../shared/useSubmit.ts'
import { checkoutApi } from './checkout.api.ts'

/**
 * Pago de una orden PENDING (caso 8). La cuenta regresiva usa la fecha límite
 * que calculó el backend; quien decide si aún se puede pagar es el backend.
 */
export function PaymentPanel({ order, onPaid, onCancelled }: {
  order: Order
  onPaid: (result: PayResult) => void
  onCancelled: () => void
}) {
  const now = useNow()
  const secondsLeft = (new Date(order.paymentDeadline).getTime() - now) / 1000
  const expired = secondsLeft <= 0
  const pay = useSubmit(checkoutApi.pay)
  const cancel = useSubmit(checkoutApi.cancel)
  const [confirmingCancel, setConfirmingCancel] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cardNumber = String(new FormData(event.currentTarget).get('cardNumber'))
    const result = await pay.run(order.id, cardNumber)
    if (result.ok) onPaid(result.value)
  }

  return (
    <Card title="Pagar">
      <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${expired ? 'bg-slate-100 text-slate-700' : 'bg-amber-50 text-amber-900'}`}>
        {expired ? (
          <>Se acabó el tiempo para pagar. La orden se cancelará en unos minutos y los productos volverán al stock.</>
        ) : (
          <>
            Tus productos están reservados. Tienes <strong className="tabular-nums">{formatCountdown(secondsLeft)}</strong>{' '}
            para pagar <Price value={order.total} className="font-semibold" />.
          </>
        )}
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <TextField
          label="Número de tarjeta"
          name="cardNumber"
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="4242 4242 4242 4242"
          required
          disabled={expired}
        />
        <p className="text-xs text-slate-500">
          Pasarela de prueba: <code>4242 4242 4242 4242</code> se aprueba;{' '}
          <code>4000 0000 0000 0002</code> se rechaza. El número no se guarda.
        </p>
        {pay.error && <ErrorMessage error={pay.error} />}
        <div className="flex flex-wrap gap-3">
          {/* busy: deshabilita el botón mientras se cobra. La protección real
              contra el doble clic es la del backend (PENDING → PROCESSING, §8). */}
          <Button type="submit" busy={pay.busy} disabled={expired || cancel.busy}>
            Pagar <Price value={order.total} />
          </Button>
          {!confirmingCancel ? (
            <Button type="button" variant="secondary" disabled={pay.busy} onClick={() => setConfirmingCancel(true)}>
              Cancelar orden
            </Button>
          ) : (
            <Button
              type="button"
              variant="danger"
              busy={cancel.busy}
              onClick={async () => {
                if ((await cancel.run(order.id)).ok) onCancelled()
              }}
            >
              Sí, cancelar y liberar los productos
            </Button>
          )}
        </div>
        {cancel.error && <ErrorMessage error={cancel.error} />}
      </form>
    </Card>
  )
}
