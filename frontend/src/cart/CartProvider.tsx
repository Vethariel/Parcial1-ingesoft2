import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/useAuth.ts'
import type { CartItem, CartView } from '../shared/types.ts'
import { anonymousCart } from './anonymous-cart.ts'
import { cartApi } from './cart.api.ts'
import { CartContext, type CartMode, type CartState, type PendingMerge } from './cart-context.ts'

const EMPTY: CartView = { items: [], total: '0.00', hasWarnings: false }

/**
 * Un solo carrito para las páginas, venga de donde venga:
 *   - sin sesión: localStorage + cotización del backend (D68)
 *   - CUSTOMER: el carrito guardado en el servidor
 * Al iniciar sesión aplica la regla de SUPUESTOS §4 (ver mergeOnLogin).
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const { user, restoring } = useAuth()
  const mode: CartMode = restoring ? 'loading' : !user ? 'anonymous' : user.role === 'ADMIN' ? 'admin' : 'customer'

  const [view, setView] = useState<CartView | null>(null)
  const [error, setError] = useState<Error | null>(null)
  // La oferta pendiente recuerda para QUÉ usuario se creó; solo se expone si
  // coincide con el usuario actual (al salir deja de verse sin limpiar nada).
  const [pending, setPending] = useState<{ userId: string; merge: PendingMerge } | null>(null)
  const pendingMerge = pending && mode === 'customer' && pending.userId === user?.id ? pending.merge : null
  const [mergeFailures, setMergeFailures] = useState<string[]>([])
  // Usuario para el que ya se aplicó la fusión. StrictMode ejecuta los
  // efectos dos veces en desarrollo: sin esta marca se agregaría todo doble.
  const mergedFor = useRef<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const next = mode === 'customer' ? await cartApi.get() : mode === 'anonymous' ? await quoteAnonymous() : null
      setView(next)
      setError(null) // se limpia al llegar la respuesta, no antes (sin render extra)
    } catch (err) {
      setError(err as Error)
    }
  }, [mode])

  /** Pasa líneas del carrito anónimo al guardado, una por una (POST /cart/items). */
  const addAll = useCallback(async (items: CartItem[], names: Map<string, string>) => {
    const failures: string[] = []
    for (const item of items) {
      try {
        await cartApi.add(item.productId, item.quantity)
      } catch {
        failures.push(names.get(item.productId) ?? 'Un producto')
      }
    }
    setMergeFailures(failures)
  }, [])

  /**
   * SUPUESTOS §4 — al iniciar sesión con productos en el carrito anónimo:
   *   - si el carrito guardado está vacío → se pasan solos (no hay conflicto);
   *   - si no → gana el guardado y se OFRECE agregar los anónimos.
   */
  const mergeOnLogin = useCallback(
    async (userId: string) => {
      const anonymous = anonymousCart.read()
      if (anonymous.length === 0 || mergedFor.current === userId) return
      mergedFor.current = userId
      const [saved, quote] = await Promise.all([cartApi.get(), cartApi.quote(anonymous)])
      if (saved.items.length === 0) {
        anonymousCart.clear() // primero se vacía: si algo se repite, no hay nada que duplicar
        await addAll(anonymous, namesOf(quote))
      } else {
        setPending({ userId, merge: { view: quote } }) // queda en localStorage hasta que el cliente decida
      }
    },
    [addAll],
  )

  useEffect(() => {
    if (mode === 'loading') return
    if (mode !== 'customer') mergedFor.current = null
    // Falso positivo del linter: mergeOnLogin solo cambia estado DESPUÉS de un
    // await (no de forma síncrona). Este efecto sincroniza con sistemas
    // externos (backend y localStorage), que es el uso correcto de un efecto.
    // eslint-disable-next-line react/set-state-in-effect
    const work = mode === 'customer' && user ? mergeOnLogin(user.id) : Promise.resolve()
    work.then(refresh).catch((err: unknown) => setError(err as Error))
  }, [mode, user, mergeOnLogin, refresh])

  const add = useCallback(
    async (productId: string, quantity: number) => {
      if (mode === 'customer') {
        setView(await cartApi.add(productId, quantity))
      } else if (mode === 'anonymous') {
        anonymousCart.add(productId, quantity)
        setView(await quoteAnonymous())
      }
    },
    [mode],
  )

  const setQuantity = useCallback(
    async (productId: string, quantity: number) => {
      if (mode === 'customer') {
        setView(await cartApi.setQuantity(productId, quantity))
      } else if (mode === 'anonymous') {
        anonymousCart.setQuantity(productId, quantity)
        setView(await quoteAnonymous())
      }
    },
    [mode],
  )

  const remove = useCallback(
    async (productId: string) => {
      if (mode === 'customer') {
        setView(await cartApi.remove(productId))
      } else if (mode === 'anonymous') {
        anonymousCart.remove(productId)
        setView(await quoteAnonymous())
      }
    },
    [mode],
  )

  const acceptMerge = useCallback(async () => {
    if (!pendingMerge) return
    const items = anonymousCart.read()
    anonymousCart.clear()
    setPending(null)
    await addAll(items, namesOf(pendingMerge.view))
    await refresh()
  }, [pendingMerge, addAll, refresh])

  const discardMerge = useCallback(() => {
    anonymousCart.clear()
    setPending(null)
  }, [])

  const value = useMemo<CartState>(
    () => ({
      mode,
      view,
      error,
      add,
      setQuantity,
      remove,
      refresh,
      pendingMerge,
      acceptMerge,
      discardMerge,
      mergeFailures,
      dismissMergeFailures: () => setMergeFailures([]),
    }),
    [mode, view, error, add, setQuantity, remove, refresh, pendingMerge, acceptMerge, discardMerge, mergeFailures],
  )
  return <CartContext value={value}>{children}</CartContext>
}

/** Cotiza el carrito anónimo en el backend (sin pedir nada si está vacío). */
async function quoteAnonymous(): Promise<CartView> {
  const items = anonymousCart.read()
  return items.length === 0 ? EMPTY : cartApi.quote(items)
}

function namesOf(view: CartView): Map<string, string> {
  return new Map(view.items.map((line) => [line.product.id, line.product.name]))
}
