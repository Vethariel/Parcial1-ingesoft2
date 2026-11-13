import { useContext } from 'react'
import { CartContext, type CartState } from './cart-context.ts'

/** El carrito actual. Solo funciona dentro de <CartProvider>. */
export function useCart(): CartState {
  const cart = useContext(CartContext)
  if (!cart) {
    throw new Error('useCart requiere <CartProvider> en main.tsx')
  }
  return cart
}
