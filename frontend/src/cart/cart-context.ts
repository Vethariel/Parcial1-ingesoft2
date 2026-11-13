// Contrato del carrito para las páginas. El estado vive en CartProvider.
import { createContext } from 'react'
import type { CartView } from '../shared/types.ts'

/**
 * anonymous → visitante: carrito en localStorage, cotizado por el backend
 * customer  → cliente: carrito guardado en el servidor
 * admin     → el admin no compra (D50): no hay carrito
 * loading   → recuperando la sesión
 */
export type CartMode = 'anonymous' | 'customer' | 'admin' | 'loading'

/** Productos del carrito anónimo que esperan la decisión del cliente al iniciar sesión (§4). */
export type PendingMerge = {
  /** Cotización para mostrar nombres y cantidades. */
  view: CartView
}

export type CartState = {
  mode: CartMode
  view: CartView | null
  error: Error | null
  add: (productId: string, quantity: number) => Promise<void>
  setQuantity: (productId: string, quantity: number) => Promise<void>
  remove: (productId: string) => Promise<void>
  /** Vuelve a pedir el carrito (p. ej. después de confirmar una compra). */
  refresh: () => Promise<void>
  pendingMerge: PendingMerge | null
  acceptMerge: () => Promise<void>
  discardMerge: () => void
  /** Productos que no se pudieron pasar al carrito guardado (desactivados, tope). */
  mergeFailures: string[]
  dismissMergeFailures: () => void
}

export const CartContext = createContext<CartState | null>(null)
