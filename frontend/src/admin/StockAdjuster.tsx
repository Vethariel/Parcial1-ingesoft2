import { useState } from 'react'
import { ErrorMessage } from '../shared/components/Feedback.tsx'
import { Button } from '../shared/components/Form.tsx'
import type { Product } from '../shared/types.ts'
import { useSubmit } from '../shared/useSubmit.ts'
import { adminApi } from './admin.api.ts'

/**
 * Ajuste RELATIVO de stock (D40): "llegaron 40" (+40) o "se dañaron 2" (−2).
 * No se escribe el valor final: así un ajuste y una compra simultánea no se
 * pisan (la suma es conmutativa). Restar más de lo que hay → 409 del backend.
 */
export function StockAdjuster({ product, onAdjusted }: { product: Product; onAdjusted: (p: Product) => void }) {
  const [amount, setAmount] = useState('')
  const adjust = useSubmit(adminApi.adjustStock)
  const units = Number(amount)
  const valid = Number.isInteger(units) && units > 0

  async function apply(sign: 1 | -1) {
    const result = await adjust.run(product.id, sign * units)
    if (result.ok) {
      setAmount('')
      onAdjusted(result.value)
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-600">
        Stock actual: <strong className="tabular-nums">{product.stock}</strong>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Unidades"
          aria-label="Unidades a ajustar"
          className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <Button busy={adjust.busy} disabled={!valid} onClick={() => apply(1)}>
          + Sumar
        </Button>
        <Button variant="secondary" disabled={!valid || adjust.busy} onClick={() => apply(-1)}>
          − Restar
        </Button>
      </div>
      {adjust.error && <ErrorMessage error={adjust.error} />}
    </div>
  )
}
