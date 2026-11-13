// Carrito (↔ backend: CartController y CartQuoteController).
// Todas las respuestas son el carrito completo, calculado por el servidor.
import { http } from '../api/http.ts'
import type { CartItem, CartView } from '../shared/types.ts'

export const cartApi = {
  /** Carrito guardado del cliente (requiere sesión de CUSTOMER, D50). */
  get: () => http.get<CartView>('/cart'),

  /** Suma la cantidad si el producto ya estaba. */
  add: (productId: string, quantity: number) =>
    http.post<CartView>('/cart/items', { productId, quantity }),

  setQuantity: (productId: string, quantity: number) =>
    http.patch<CartView>(`/cart/items/${productId}`, { quantity }),

  remove: (productId: string) => http.delete<CartView>(`/cart/items/${productId}`),

  /** Cotiza el carrito anónimo sin guardarlo (D68): el servidor calcula el total. */
  quote: (items: CartItem[]) => http.post<CartView>('/cart/quote', { items }),
}
