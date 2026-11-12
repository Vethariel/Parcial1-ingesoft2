import { Inject, Injectable } from '@nestjs/common';
import { PAYMENT_WINDOW_MINUTES } from '../config/business-rules.js';
import { fromCents, toCents } from '../shared/money.js';
import type { Page } from '../shared/pagination.js';
import type { Transaction } from '../shared/transaction.js';
import { InvalidOrderStateError, OrderNotFoundError } from './order.errors.js';
import {
  ORDER_REPOSITORY,
  type OrderRepository,
  type StoredOrder,
} from './order.repository.js';
import type {
  NewOrder,
  Order,
  OrderFilter,
  OrderStatus,
} from './order.types.js';

/**
 * Máquina de estados de la orden (CLAUDE.md, SUPUESTOS §6), en UN solo lugar:
 * desde cada estado, a cuáles se puede pasar.
 *
 *   PENDING ⇄ PROCESSING → PAID → SHIPPED
 *      └──────────┴─────────┴──→ CANCELLED
 */
const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ['PROCESSING', 'CANCELLED'],
  // → PENDING: pago rechazado (se puede reintentar).
  // → CANCELLED: recuperación de una orden atascada cuyo cobro no se hizo.
  PROCESSING: ['PAID', 'PENDING', 'CANCELLED'],
  PAID: ['SHIPPED', 'CANCELLED'], // CANCELLED solo por el admin, con reembolso
  SHIPPED: [], // fuera de alcance: devoluciones (§11)
  CANCELLED: [],
};

/**
 * Dueño de las órdenes y de sus estados (§8): sabe CÓMO cambiar un estado.
 * CUÁNDO cambiarlo lo decide CheckoutService.
 */
@Injectable()
export class OrderService {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
  ) {}

  /**
   * Crea la orden PENDING dentro de la transacción de checkout, con el total
   * calculado aquí (nunca viene del cliente).
   * @throws OpenOrderExistsError
   */
  async create(tx: Transaction, data: NewOrder): Promise<Order> {
    const totalCents = data.items.reduce(
      (sum, item) => sum + toCents(item.unitPrice) * item.quantity,
      0,
    );
    const stored = await this.orders.create(tx, {
      ...data,
      total: fromCents(totalCents),
    });
    return toOrder(stored);
  }

  /** @throws OrderNotFoundError */
  async findById(id: string): Promise<Order> {
    const stored = await this.orders.findById(id);
    if (!stored) {
      throw new OrderNotFoundError(id);
    }
    return toOrder(stored);
  }

  /**
   * La orden de un cliente. Si es de otro, responde como si no existiera.
   * @throws OrderNotFoundError
   */
  async findForUser(userId: string, id: string): Promise<Order> {
    const order = await this.findById(id);
    if (order.userId !== userId) {
      throw new OrderNotFoundError(id);
    }
    return order;
  }

  /** Para el job de expiración: las más antiguas primero, en lotes. */
  async findCreatedBefore(
    status: OrderStatus,
    before: Date,
    limit: number,
  ): Promise<Order[]> {
    const stored = await this.orders.findCreatedBefore(status, before, limit);
    return stored.map(toOrder);
  }

  async findPage(filter: OrderFilter): Promise<Page<Order>> {
    const page = await this.orders.findPage(filter);
    return { ...page, items: page.items.map(toOrder) };
  }

  /**
   * Transición atómica `from → to`. Devuelve false si la orden ya no estaba
   * en `from` (otro proceso llegó primero): quien llama decide qué hacer.
   */
  transition(
    id: string,
    from: OrderStatus,
    to: OrderStatus,
    tx?: Transaction,
  ): Promise<boolean> {
    if (!TRANSITIONS[from].includes(to)) {
      // Error de programación, no del usuario: la tabla no lo permite.
      throw new Error(`Transición no permitida: ${from} → ${to}`);
    }
    return this.orders.transition(id, from, to, tx);
  }

  /**
   * Admin: PAID → SHIPPED.
   * @throws OrderNotFoundError | InvalidOrderStateError
   */
  async ship(id: string): Promise<Order> {
    if (!(await this.transition(id, 'PAID', 'SHIPPED'))) {
      const current = await this.findById(id); // lanza 404 si no existe
      throw new InvalidOrderStateError(id, current.status, 'enviar');
    }
    return this.findById(id);
  }
}

/** Agrega los campos calculados: subtotales y fecha límite de pago. */
function toOrder(stored: StoredOrder): Order {
  return {
    ...stored,
    paymentDeadline: new Date(
      stored.createdAt.getTime() + PAYMENT_WINDOW_MINUTES * 60_000,
    ),
    items: stored.items.map((item) => ({
      ...item,
      subtotal: fromCents(toCents(item.unitPrice) * item.quantity),
    })),
  };
}
