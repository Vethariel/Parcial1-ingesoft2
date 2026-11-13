import { useState } from 'react'

/**
 * Imagen del producto con respaldo: si la URL no carga (sin internet, enlace
 * roto), muestra un marcador con la inicial en lugar de una caja vacía.
 */
export function ProductImage({ src, name, dimmed = false, className = '' }: {
  src: string
  name: string
  dimmed?: boolean
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const base = `aspect-[4/3] w-full bg-slate-100 ${dimmed ? 'opacity-50 grayscale' : ''} ${className}`

  if (failed) {
    return (
      <div className={`${base} flex items-center justify-center bg-gradient-to-br from-indigo-100 to-slate-200`} role="img" aria-label={name}>
        <span className="text-5xl font-bold text-indigo-300">{name.charAt(0).toUpperCase()}</span>
      </div>
    )
  }
  return <img src={src} alt={name} loading="lazy" onError={() => setFailed(true)} className={`${base} object-cover`} />
}
