// Piezas de formulario reutilizadas por todas las pantallas.
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string }

/** Campo con etiqueta. La validación real la hace el backend (D63). */
export function TextField({ label, id, ...input }: FieldProps) {
  const inputId = id ?? input.name
  return (
    <label htmlFor={inputId} className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
        id={inputId}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        {...input}
      />
    </label>
  )
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger'
  busy?: boolean
}

const variants = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
  secondary: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
  danger: 'bg-red-600 text-white hover:bg-red-700',
}

/** `busy`: deshabilitado mientras espera al backend (evita dobles envíos en la UI). */
export function Button({ variant = 'primary', busy, disabled, className = '', children, ...rest }: ButtonProps) {
  return (
    <button
      className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      disabled={disabled || busy}
      {...rest}
    >
      {busy ? 'Procesando…' : children}
    </button>
  )
}

/** Tarjeta blanca con título, para agrupar formularios y secciones. */
export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      {title && <h2 className="mb-4 text-lg font-semibold">{title}</h2>}
      {children}
    </section>
  )
}

/** Mensaje de éxito breve. */
export function SuccessMessage({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700" role="status">
      {children}
    </p>
  )
}
