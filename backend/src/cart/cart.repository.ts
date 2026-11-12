import type { Transaction } from '../shared/transaction.js';
import type { CartItem } from './cart.types.js';

/**
 * Contrato del repositorio del carrito. El carrito se identifica por el
 * usuario (uno por usuario): quien llama nunca maneja el id del carrito.
 */
export interface CartRepository {
  /** Vacío si el usuario aún no tiene carrito. */
  findItems(userId: string): Promise<CartItem[]>;
  /**
   * Suma `quantity` (crea el carrito y la línea si no existen), solo si el
   * resultado no supera `maxQuantity`. Devuelve false si lo superaría.
   */
  addItem(
    userId: string,
    productId: string,
    quantity: number,
    maxQuantity: number,
  ): Promise<boolean>;
  /** Fija la cantidad. Devuelve false si el producto no está en el carrito. */
  setQuantity(
    userId: string,
    productId: string,
    quantity: number,
  ): Promise<boolean>;
  /** Devuelve false si el producto no está en el carrito. */
  removeItem(userId: string, productId: string): Promise<boolean>;
  /**
   * Dentro de la transacción de confirmar: resta las unidades que entraron
   * en la orden; la línea se borra si no queda nada (§6, carrito tras confirmar).
   */
  subtractQuantities(
    tx: Transaction,
    userId: string,
    lines: CartItem[],
  ): Promise<void>;
}

/** Token de inyección: las interfaces no existen en tiempo de ejecución. */
export const CART_REPOSITORY = Symbol('CART_REPOSITORY');
