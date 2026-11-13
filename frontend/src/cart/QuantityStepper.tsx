import { MAX_QUANTITY } from './anonymous-cart.ts'

/** − cantidad + (de 1 al tope; para quitar se usa "Quitar"). */
export function QuantityStepper({ value, onChange, disabled }: {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}) {
  const button = 'h-8 w-8 rounded-lg border border-slate-300 bg-white text-lg leading-none disabled:opacity-40'
  return (
    <div className="flex items-center gap-2" aria-label="Cantidad">
      <button type="button" className={button} disabled={disabled || value <= 1} onClick={() => onChange(value - 1)} aria-label="Menos">
        −
      </button>
      <span className="w-8 text-center tabular-nums">{value}</span>
      <button type="button" className={button} disabled={disabled || value >= MAX_QUANTITY} onClick={() => onChange(value + 1)} aria-label="Más">
        +
      </button>
    </div>
  )
}
