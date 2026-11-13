import { useSearchParams } from 'react-router'
import { ErrorMessage, Spinner } from '../shared/components/Feedback.tsx'
import { Pagination } from '../shared/components/Pagination.tsx'
import { useApi } from '../shared/useApi.ts'
import { catalogApi } from './catalog.api.ts'
import { ProductCard } from './ProductCard.tsx'

/** Productos por página en la cuadrícula (presentación; el máximo lo fija el backend). */
const PAGE_SIZE = 12

/**
 * Catálogo público (caso 1). El filtro y la página viven en la URL
 * (?categoryId=...&page=2): el botón Atrás funciona y el enlace se comparte.
 */
export function CatalogPage() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const categoryId = params.get('categoryId') ?? undefined

  const categories = useApi(() => catalogApi.listCategories(), [])
  const products = useApi(
    () => catalogApi.listProducts({ page, pageSize: PAGE_SIZE, categoryId }),
    [page, categoryId],
  )

  function selectCategory(id?: string) {
    // Al cambiar de categoría se vuelve a la página 1.
    setParams(id ? { categoryId: id } : {})
  }

  function goToPage(next: number) {
    setParams({ ...(categoryId && { categoryId }), page: String(next) })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Catálogo</h1>

      <div className="mb-6 flex flex-wrap gap-2">
        <FilterChip active={!categoryId} onClick={() => selectCategory()}>
          Todas
        </FilterChip>
        {categories.data?.map((category) => (
          <FilterChip key={category.id} active={categoryId === category.id} onClick={() => selectCategory(category.id)}>
            {category.name}
          </FilterChip>
        ))}
      </div>

      {products.loading && <Spinner />}
      {products.error && <ErrorMessage error={products.error} />}
      {products.data && (
        <>
          {products.data.items.length === 0 ? (
            <p className="py-12 text-center text-slate-500">No hay productos en esta categoría.</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.data.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
          <Pagination page={page} pageSize={PAGE_SIZE} total={products.data.total} onChange={goToPage} />
        </>
      )}
    </div>
  )
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
        active ? 'bg-indigo-600 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  )
}
