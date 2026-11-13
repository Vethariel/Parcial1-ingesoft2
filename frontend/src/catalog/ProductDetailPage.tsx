import { Link, useParams } from 'react-router'
import { ApiError } from '../api/http.ts'
import { ErrorMessage, Spinner } from '../shared/components/Feedback.tsx'
import { Price } from '../shared/components/Price.tsx'
import { useApi } from '../shared/useApi.ts'
import { catalogApi } from './catalog.api.ts'
import { ProductImage } from './ProductImage.tsx'
import { StockBadge } from './StockBadge.tsx'

/** Detalle de un producto (caso 1). */
export function ProductDetailPage() {
  const { id = '' } = useParams()
  const { data: product, loading, error } = useApi(() => catalogApi.getProduct(id), [id])

  if (loading) return <Spinner />
  if (error) {
    // 404: no existe o fue desactivado (el backend responde igual en ambos casos).
    const notFound = error instanceof ApiError && (error.status === 404 || error.status === 400)
    return (
      <div className="space-y-4">
        <ErrorMessage error={notFound ? 'Este producto no está disponible.' : error} />
        <BackLink />
      </div>
    )
  }
  if (!product) return null

  return (
    <div className="space-y-6">
      <BackLink />
      <div className="grid gap-8 md:grid-cols-2">
        <ProductImage src={product.imageUrl} name={product.name} className="rounded-xl border border-slate-200" />
        <div className="flex flex-col gap-4">
          <span className="text-sm font-medium uppercase tracking-wide text-indigo-600">{product.category.name}</span>
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <Price value={product.price} className="text-2xl font-bold text-slate-900" />
          <div>
            <StockBadge stock={product.stock} />
          </div>
          <p className="leading-relaxed text-slate-600">{product.description}</p>
          {/* Paso F4: selector de cantidad y "Agregar al carrito". */}
        </div>
      </div>
    </div>
  )
}

function BackLink() {
  return (
    <Link to="/" className="text-sm text-indigo-600 hover:underline">
      ← Volver al catálogo
    </Link>
  )
}
