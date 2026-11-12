import type { Page } from '../shared/pagination.js';
import type { Transaction } from '../shared/transaction.js';
import type {
  NewOrder,
  Order,
  OrderFilter,
  OrderStatus,
} from './order.types.js';

/** Lo que se guarda: la orden con su total ya calculado. */
export type OrderToSave = NewOrder & { total: string };

/** Fila guardada, sin campos calculados (paymentDeadline, subtotales). */
export type StoredOrder = Omit<Order, 'paymentDeadline' | 'items'> & {
  items: Omit<Order['items'][number], 'subtotal'>[];
};

/**
 * Contrato del repositorio de órdenes. Los métodos que reciben `tx` participan
 * en la transacción de quien llama (checkout); sin `tx` usan su propia conexión.
 */
export interface OrderRepository {
  /** @throws OpenOrderExistsError si el usuario ya tiene una orden abierta. */
  create(tx: Transaction, data: OrderToSave): Promise<StoredOrder>;
  findById(id: string): Promise<StoredOrder | null>;
  findPage(filter: OrderFilter): Promise<Page<StoredOrder>>;
  /** Órdenes en `status` creadas antes de `before` (para el job de expiración). */
  findCreatedBefore(
    status: OrderStatus,
    before: Date,
    limit: number,
  ): Promise<StoredOrder[]>;
  /**
   * UPDATE orders SET status = to WHERE id = ? AND status = from.
   * Devuelve false si la orden no estaba en `from` (otro llegó primero).
   */
  transition(
    id: string,
    from: OrderStatus,
    to: OrderStatus,
    tx?: Transaction,
  ): Promise<boolean>;
}

/** Token de inyección: las interfaces no existen en tiempo de ejecución. */
export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');
