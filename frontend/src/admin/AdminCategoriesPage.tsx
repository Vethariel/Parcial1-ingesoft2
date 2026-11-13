import { useState, type FormEvent } from 'react'
import { ErrorMessage, Spinner } from '../shared/components/Feedback.tsx'
import { Button, Card, TextField } from '../shared/components/Form.tsx'
import type { Category } from '../shared/types.ts'
import { useApi } from '../shared/useApi.ts'
import { useSubmit } from '../shared/useSubmit.ts'
import { adminApi } from './admin.api.ts'

/** Categorías (caso 11): crear, renombrar, eliminar. */
export function AdminCategoriesPage() {
  const { data, loading, error, reload } = useApi(() => adminApi.listCategories(), [])
  const create = useSubmit(adminApi.createCategory)

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    if ((await create.run(String(new FormData(form).get('name')))).ok) {
      form.reset()
      reload()
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card title="Categorías">
        {loading && !data && <Spinner />}
        {error && <ErrorMessage error={error} />}
        <ul className="divide-y divide-slate-100">
          {data?.map((category) => (
            <CategoryRow key={category.id} category={category} onChanged={reload} />
          ))}
        </ul>
      </Card>
      <Card title="Nueva categoría">
        <form onSubmit={onCreate} className="space-y-4">
          <TextField label="Nombre" name="name" required />
          {/* "Ya existe una categoría llamada…": lo decide el UNIQUE de la BD. */}
          {create.error && <ErrorMessage error={create.error} />}
          <Button type="submit" busy={create.busy}>
            Crear
          </Button>
        </form>
      </Card>
    </div>
  )
}

function CategoryRow({ category, onChanged }: { category: Category; onChanged: () => void }) {
  const [editing, setEditing] = useState(false)
  const rename = useSubmit(adminApi.renameCategory)
  const remove = useSubmit(adminApi.deleteCategory)

  return (
    <li className="py-3">
      {editing ? (
        <form
          className="flex items-end gap-2"
          onSubmit={async (event) => {
            event.preventDefault()
            if ((await rename.run(category.id, String(new FormData(event.currentTarget).get('name')))).ok) {
              setEditing(false)
              onChanged()
            }
          }}
        >
          <div className="flex-1">
            <TextField label="Nuevo nombre" name="name" defaultValue={category.name} required autoFocus />
          </div>
          <Button type="submit" busy={rename.busy}>
            Guardar
          </Button>
          <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
        </form>
      ) : (
        <div className="flex items-center gap-3">
          <span className="flex-1 font-medium">{category.name}</span>
          <button type="button" className="text-sm text-indigo-600 hover:underline" onClick={() => setEditing(true)}>
            Renombrar
          </button>
          <button
            type="button"
            className="text-sm text-red-600 hover:underline disabled:opacity-50"
            disabled={remove.busy}
            onClick={async () => {
              if ((await remove.run(category.id)).ok) onChanged()
            }}
          >
            Eliminar
          </button>
        </div>
      )}
      {/* "Tiene productos; reasígnalos antes de eliminarla" (409, D46). */}
      {(rename.error || remove.error) && (
        <div className="mt-2">
          <ErrorMessage error={(rename.error ?? remove.error)!} />
        </div>
      )}
    </li>
  )
}
