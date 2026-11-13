import { useSearchParams } from 'react-router'

/**
 * A dónde volver después de entrar (?next=/carrito). Solo rutas internas:
 * un ?next=https://otro-sitio.com no debe sacar al usuario de la tienda.
 */
export function useNextPath(): string {
  const [params] = useSearchParams()
  const next = params.get('next') ?? '/'
  return next.startsWith('/') && !next.startsWith('//') ? next : '/'
}
