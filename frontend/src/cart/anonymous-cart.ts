// Carrito del visitante SIN sesión (SUPUESTOS §4): vive en localStorage.
// Solo guarda ids y cantidades; precios, totales y avisos los calcula el
// backend con POST /cart/quote (D68).
import type { CartItem } from '../shared/types.ts'

const KEY = 'anonymousCart'

/**
 * Tope de unidades por producto, igual al del backend
 * (CART_MAX_QUANTITY_PER_ITEM). Aquí solo evita armar un carrito que la
 * cotización rechazaría; quien valida de verdad es el backend.
 */
export const MAX_QUANTITY = 99

export const anonymousCart = {
  read(): CartItem[] {
    try {
      const raw = localStorage.getItem(KEY)
      const items: unknown = raw ? JSON.parse(raw) : []
      return Array.isArray(items) ? (items as CartItem[]) : []
    } catch {
      return [] // localStorage bloqueado o contenido corrupto
    }
  },

  write(items: CartItem[]): void {
    try {
      if (items.length === 0) localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, JSON.stringify(items))
    } catch {
      /* sin almacenamiento: el carrito no persiste */
    }
  },

  /** Suma la cantidad si el producto ya estaba (mismo comportamiento que el backend). */
  add(productId: string, quantity: number): void {
    const items = anonymousCart.read()
    const line = items.find((i) => i.productId === productId)
    if (line) line.quantity = Math.min(MAX_QUANTITY, line.quantity + quantity)
    else items.push({ productId, quantity: Math.min(MAX_QUANTITY, quantity) })
    anonymousCart.write(items)
  },

  setQuantity(productId: string, quantity: number): void {
    anonymousCart.write(
      anonymousCart.read().map((i) => (i.productId === productId ? { ...i, quantity } : i)),
    )
  },

  remove(productId: string): void {
    anonymousCart.write(anonymousCart.read().filter((i) => i.productId !== productId))
  },

  clear(): void {
    anonymousCart.write([])
  },
}
