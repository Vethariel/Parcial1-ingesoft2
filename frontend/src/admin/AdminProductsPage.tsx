import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { ProductImage } from '../catalog/ProductImage.tsx'
import { ErrorMessage, Spinner } from '../shared/components/Feedback.tsx'
import { Button, Card, SuccessMessage } from '../shared/components/Form.tsx'
import { Pagination } from '../shared/components/Pagination.tsx'
import { Price } from '../shared/components/Price.tsx'
import type { Category, Product } from '../shared/types.ts'
import { useApi } from '../shared/useApi.ts'
import { useSubmit } from '../shared/useSubmit.ts'
import { adminApi } from './admin.api.ts'
import { ProductForm } from './ProductForm.tsx'
import { StockAdjuster } from './StockAdjuster.tsx'

const PAGE_SIZE = 20

/** Productos (caso 12): lista con desactivados, crear, editar, activar y stock. */
export function AdminProductsPage() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const categoryId = params.get('categoryId') ?? undefined
  const categories = useApi(() => adminApi.listCategories(), [])
  const products = useApi(() => adminApi.listProducts(page, PAGE_SIZE, categoryId), [page, categoryId])
  const [selected, setSelected] = useState<Product | 'new' | null>(null)

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      <div>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <select
            value={categoryId ?? ''}
            onChange={(e) => setParams(e.target.value ? { categoryId: e.target.value } : {})}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            aria-label="Filtrar por categoría"
          >
            <option value="">Todas las categorías</option>
            {categories.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Button className="ml-auto" onClick={() => setSelected('new')}>
            + Nuevo producto
          </Button>
        </div>

        {products.loading && !products.data && <Spinner />}
        {products.error && <ErrorMessage error={products.error} />}
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {products.data?.items.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => setSelected(product)}
                className={`flex w-full items-center gap-4 p-3 text-left hover:bg-slate-50 ${
                  selected !== 'new' && selected?.id === product.id ? 'bg-indigo-50' : ''
                }`}
              >
                <div className="w-16 shrink-0 overflow-hidden rounded">
                  <ProductImage src={product.imageUrl} name={product.name} dimmed={!product.active} />
                </div>
                <div className="flex-1">
                  <div className={`font-medium ${product.active ? '' : 'text-slate-400'}`}>{product.name}</div>
                  <div className="text-xs text-slate-500">{product.category.name}</div>
                </div>
                {!product.active && (
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">Desactivado</span>
                )}
                <span className="w-16 text-right text-sm tabular-nums text-slate-600">{product.stock} u.</span>
                <Price value={product.price} className="w-28 text-right text-sm font-semibold" />
              </button>
            </li>
          ))}
        </ul>
        {products.data && (
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={products.data.total}
            onChange={(p) => setParams({ ...(categoryId && { categoryId }), page: String(p) })}
          />
        )}
      </div>

      <aside>
        {selected === 'new' && categories.data && (
          <CreateProduct
            categories={categories.data}
            onCreated={(p) => {
              setSelected(p)
              products.reload()
            }}
          />
        )}
        {selected && selected !== 'new' && categories.data && (
          <EditProduct
            key={selected.id}
            product={selected}
            categories={categories.data}
            onChanged={(p) => {
              setSelected(p)
              products.reload()
            }}
          />
        )}
        {!selected && <p className="text-sm text-slate-500">Elige un producto para editarlo o crea uno nuevo.</p>}
      </aside>
    </div>
  )
}

function CreateProduct({ categories, onCreated }: { categories: Category[]; onCreated: (p: Product) => void }) {
  const create = useSubmit(adminApi.createProduct)
  return (
    <Card title="Nuevo producto">
      <ProductForm
        categories={categories}
        busy={create.busy}
        error={create.error}
        submitLabel="Crear producto"
        onSubmit={async (input) => {
          const result = await create.run({ ...input, stock: input.stock ?? 0 })
          if (result.ok) onCreated(result.value)
        }}
      />
    </Card>
  )
}

function EditProduct({ product, categories, onChanged }: {
  product: Product
  categories: Category[]
  onChanged: (p: Product) => void
}) {
  const update = useSubmit(adminApi.updateProduct)
  const toggle = useSubmit(adminApi.updateProduct)
  const [saved, setSaved] = useState(false)

  return (
    <div className="space-y-6">
      <Card title="Editar producto">
        <ProductForm
          product={product}
          categories={categories}
          busy={update.busy}
          error={update.error}
          submitLabel="Guardar cambios"
          onSubmit={async (input) => {
            setSaved(false)
            const result = await update.run(product.id, input)
            if (result.ok) {
              setSaved(true)
              onChanged(result.value)
            }
          }}
        />
        {saved && (
          <div className="mt-3">
            <SuccessMessage>Cambios guardados. Las órdenes ya creadas conservan su precio (snapshot).</SuccessMessage>
          </div>
        )}
      </Card>

      <Card title="Stock">
        <StockAdjuster product={product} onAdjusted={onChanged} />
      </Card>

      <Card title="Visibilidad">
        <p className="mb-3 text-sm text-slate-600">
          {product.active
            ? 'Visible en el catálogo. Al desactivarlo deja de verse y no se puede comprar, pero las órdenes pasadas se conservan (soft delete).'
            : 'Desactivado: no aparece en el catálogo.'}
        </p>
        <Button
          variant={product.active ? 'danger' : 'primary'}
          busy={toggle.busy}
          onClick={async () => {
            const result = await toggle.run(product.id, { active: !product.active })
            if (result.ok) onChanged(result.value)
          }}
        >
          {product.active ? 'Desactivar' : 'Reactivar'}
        </Button>
        {toggle.error && (
          <div className="mt-3">
            <ErrorMessage error={toggle.error} />
          </div>
        )}
      </Card>
    </div>
  )
}
