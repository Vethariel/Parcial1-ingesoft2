// Página TEMPORAL del paso F1: comprueba que front → proxy → backend funciona.
// La reemplaza el catálogo en el paso F3.
import { http } from '../api/http.ts'
import { ErrorMessage, Spinner } from './components/Feedback.tsx'
import type { Page } from './types.ts'
import { useApi } from './useApi.ts'

export function HealthPage() {
  const { data, loading, error } = useApi(
    () => http.get<Page<unknown>>('/products?pageSize=1'),
    [],
  )
  if (loading) return <Spinner />
  if (error) return <ErrorMessage error={error} />
  return (
    <p className="text-slate-600">
      Conectado con el backend: {data?.total} productos en el catálogo.
    </p>
  )
}
