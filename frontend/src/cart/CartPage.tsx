import { useState } from 'react'
import { Link } from 'react-router'
import { ProductImage } from '../catalog/ProductImage.tsx'
import { ErrorMessage, Spinner } from '../shared/components/Feedback.tsx'
import { Button, Card } from '../shared/components/Form.tsx'
import { Price } from '../shared/components/Price.tsx'
import type { CartLine } from '../shared/types.ts'
import { QuantityStepper } from './QuantityStepper.tsx'
import { useCart } from './useCart.ts'
import { WarningBadge } from './WarningBadge.tsx'

/** Carrito (casos 5 y 6). Muestra lo que calculó el backend; aquí no se suma nada. */
export function CartPage() {
  const { mode, view, error } = useCart()

  if (mode === 'admin') {
    return <p className="text-slate-600">Los administradores no tienen carrito.</p>
  }
  if (error) return <ErrorMessage error={error} />
  if (mode === 'loading' || !view) return <Spinner />

  if (view.items.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-slate-600">Tu carrito está vacío.</p>
        <Link to="/" className="text-indigo-600 hover:underline">
          Ver el catálogo
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div>
        <h1 className="mb-6 text-2xl font-bold">Carrito</h1>
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {view.items.map((line) => (
            <CartRow key={line.product.id} line={line} />
          ))}
        </ul>
      </div>

      <aside>
        <Card title="Resumen">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-slate-600">Total estimado</span>
            <Price value={view.total} className="text-xl font-bold" />
          </div>
          <p className="mb-4 text-xs text-slate-500">
            Con precios actuales y sin productos no disponibles. El total definitivo se calcula al confirmar la compra.
          </p>
          {view.hasWarnings && (
            <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Algunos productos no tienen stock suficiente. Al confirmar se reservará lo disponible y el resto se
              quedará en tu carrito.
            </p>
          )}
          {mode === 'anonymous' ? (
            <Link
              to="/login?next=%2Fcart"
              className="block rounded-lg bg-indigo-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-indigo-700"
            >
              Inicia sesión para comprar
            </Link>
          ) : (
            // Paso F5: confirmar la compra (POST /checkout/confirm).
            <Button className="w-full" disabled>
              Confirmar compra (próximamente)
            </Button>
          )}
        </Card>
      </aside>
    </div>
  )
}

function CartRow({ line }: { line: CartLine }) {
  const { setQuantity, remove } = useCart()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const unavailable = line.warning === 'UNAVAILABLE'

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(err as Error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="flex gap-4 p-4">
      <Link to={`/products/${line.product.id}`} className="w-24 shrink-0 overflow-hidden rounded-lg">
        <ProductImage src={line.product.imageUrl} name={line.product.name} dimmed={unavailable} />
      </Link>
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <span className={`font-medium ${unavailable ? 'text-slate-400 line-through' : ''}`}>{line.product.name}</span>
          <Price value={line.subtotal} className="font-semibold" />
        </div>
        <div className="text-sm text-slate-500">
          <Price value={line.product.price} /> c/u
        </div>
        {line.warning && <WarningBadge warning={line.warning} stock={line.product.stock} />}
        <div className="flex items-center gap-3">
          <QuantityStepper
            value={line.quantity}
            disabled={busy || unavailable}
            onChange={(q) => run(() => setQuantity(line.product.id, q))}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => remove(line.product.id))}
            className="text-sm text-red-600 hover:underline disabled:opacity-50"
          >
            Quitar
          </button>
        </div>
        {error && <ErrorMessage error={error} />}
      </div>
    </li>
  )
}
