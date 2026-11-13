import type { FormEvent } from 'react'
import { ErrorMessage } from '../shared/components/Feedback.tsx'
import { Button, TextField } from '../shared/components/Form.tsx'
import type { Category, Product } from '../shared/types.ts'
import type { ProductInput } from './admin.api.ts'

/**
 * Formulario de producto para crear o editar. El stock solo se pide al crear
 * (D43); después se ajusta con un delta (D40). Las validaciones (precio > 0,
 * máximo 2 decimales, URL http(s)…) las hace el backend y aquí se muestran.
 */
export function ProductForm({ product, categories, busy, error, submitLabel, onSubmit }: {
  product?: Product
  categories: Category[]
  busy: boolean
  error: Error | null
  submitLabel: string
  onSubmit: (input: ProductInput & { stock?: number }) => void
}) {
  function handle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const value = (name: string) => String(form.get(name) ?? '').trim()
    onSubmit({
      name: value('name'),
      description: value('description'),
      imageUrl: value('imageUrl'),
      price: value('price'),
      categoryId: value('categoryId'),
      ...(!product && { stock: Number(value('stock')) }),
    })
  }

  return (
    <form onSubmit={handle} className="space-y-4">
      <TextField label="Nombre" name="name" defaultValue={product?.name} required />
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Descripción</span>
        <textarea
          name="description"
          defaultValue={product?.description}
          required
          rows={3}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
      </label>
      <TextField label="URL de la imagen" name="imageUrl" type="url" defaultValue={product?.imageUrl} required />
      <div className="grid grid-cols-2 gap-4">
        <TextField label="Precio" name="price" inputMode="decimal" placeholder="19990.50" defaultValue={product?.price} required />
        {!product && <TextField label="Stock inicial" name="stock" type="number" min={0} defaultValue={0} required />}
      </div>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Categoría</span>
        <select
          name="categoryId"
          defaultValue={product?.category.id ?? ''}
          required
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
        >
          <option value="" disabled>
            Elige una categoría
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      {error && <ErrorMessage error={error} />}
      <Button type="submit" busy={busy}>
        {submitLabel}
      </Button>
    </form>
  )
}
