import { Link } from 'react-router'
import { Price } from '../shared/components/Price.tsx'
import type { Product } from '../shared/types.ts'
import { ProductImage } from './ProductImage.tsx'
import { StockBadge } from './StockBadge.tsx'

/** Tarjeta de un producto en la cuadrícula del catálogo. */
export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      to={`/products/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
    >
      <div className="overflow-hidden">
        <ProductImage
          src={product.imageUrl}
          name={product.name}
          dimmed={product.stock === 0}
          className="transition group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className="text-xs font-medium uppercase tracking-wide text-indigo-600">{product.category.name}</span>
        <h3 className="font-semibold text-slate-900">{product.name}</h3>
        <div className="mt-auto flex items-center justify-between pt-2">
          <Price value={product.price} className="text-lg font-bold" />
          <StockBadge stock={product.stock} />
        </div>
      </div>
    </Link>
  )
}
