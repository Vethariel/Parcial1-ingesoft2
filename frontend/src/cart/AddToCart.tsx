import { useState } from 'react'
import { Link } from 'react-router'
import { ErrorMessage } from '../shared/components/Feedback.tsx'
import { Button } from '../shared/components/Form.tsx'
import { useSubmit } from '../shared/useSubmit.ts'
import { QuantityStepper } from './QuantityStepper.tsx'
import { useCart } from './useCart.ts'

/**
 * Selector de cantidad + "Agregar al carrito" (caso 5). Se puede pedir más de
 * lo disponible: el carrito lo avisa y la confirmación reserva lo que haya (D49).
 */
export function AddToCart({ productId }: { productId: string }) {
  const { mode, add } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const submit = useSubmit(add)

  if (mode === 'admin') return null // el admin no compra (D50)

  return (
    <div className="space-y-3 border-t border-slate-200 pt-4">
      <div className="flex flex-wrap items-center gap-4">
        <QuantityStepper value={quantity} onChange={(q) => { setQuantity(q); setAdded(false) }} disabled={submit.busy} />
        <Button
          busy={submit.busy}
          disabled={mode === 'loading'}
          onClick={async () => {
            setAdded(false)
            if ((await submit.run(productId, quantity)).ok) setAdded(true)
          }}
        >
          Agregar al carrito
        </Button>
      </div>
      {added && (
        <p className="text-sm text-green-700" role="status">
          ✓ Agregado.{' '}
          <Link to="/cart" className="font-medium underline">
            Ver carrito
          </Link>
        </p>
      )}
      {submit.error && <ErrorMessage error={submit.error} />}
    </div>
  )
}
