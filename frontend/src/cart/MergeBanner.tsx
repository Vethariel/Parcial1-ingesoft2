import { useState } from 'react'
import { Button } from '../shared/components/Form.tsx'
import { useCart } from './useCart.ts'

/**
 * SUPUESTOS §4: al iniciar sesión gana el carrito guardado, pero lo que había
 * en el carrito anónimo NO se pierde: se ofrece agregarlo. Se muestra en
 * cualquier página (va en el Layout).
 */
export function MergeBanner() {
  const { pendingMerge, acceptMerge, discardMerge, mergeFailures, dismissMergeFailures } = useCart()
  const [busy, setBusy] = useState(false)

  if (mergeFailures.length > 0) {
    return (
      <Banner tone="amber">
        <span>
          No se pudieron agregar a tu carrito: {mergeFailures.join(', ')} (ya no están disponibles o superan el máximo
          por producto).
        </span>
        <Button variant="secondary" onClick={dismissMergeFailures}>
          Entendido
        </Button>
      </Banner>
    )
  }
  if (!pendingMerge) return null

  const names = pendingMerge.view.items.map((l) => `${l.product.name} ×${l.quantity}`)
  return (
    <Banner tone="indigo">
      <span>
        Antes de iniciar sesión tenías en el carrito: <strong>{names.join(', ')}</strong>. ¿Quieres agregarlos a tu
        carrito guardado?
      </span>
      <div className="flex shrink-0 gap-2">
        <Button
          busy={busy}
          onClick={async () => {
            setBusy(true)
            await acceptMerge()
            setBusy(false)
          }}
        >
          Agregar
        </Button>
        <Button variant="secondary" disabled={busy} onClick={discardMerge}>
          Descartar
        </Button>
      </div>
    </Banner>
  )
}

function Banner({ tone, children }: { tone: 'indigo' | 'amber'; children: React.ReactNode }) {
  const colors = tone === 'indigo' ? 'border-indigo-200 bg-indigo-50 text-indigo-900' : 'border-amber-200 bg-amber-50 text-amber-900'
  return (
    <div className={`border-b ${colors}`} role="status">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">{children}</div>
    </div>
  )
}
