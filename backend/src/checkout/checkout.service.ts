import { Inject, Injectable } from '@nestjs/common';
import { CartService } from '../cart/cart.service.js';
import { MAX_PAYMENT_ATTEMPTS } from '../config/business-rules.js';
import { InvalidOrderStateError } from '../orders/order.errors.js';
import { OrderService } from '../orders/order.service.js';
import type { Order, OrderStatus } from '../orders/order.types.js';
import type { ChargeResult } from '../payments/payment-gateway.js';
import { PaymentsService } from '../payments/payments.service.js';
import type { Reservation } from '../products/product.types.js';
import { StockService } from '../products/stock.service.js';
import {
  TRANSACTION_RUNNER,
  type TransactionRunner,
} from '../shared/transaction.js';
import { UsersService } from '../users/users.service.js';
import {
  EmptyCartError,
  MissingAddressError,
  NothingAvailableError,
  OrderChangedError,
  PaymentGatewayUnavailableError,
  PaymentWindowClosedError,
  RefundFailedError,
} from './checkout.errors.js';
import type {
  ConfirmResult,
  ExcludedItem,
  PayResult,
} from './checkout.types.js';

/**
 * Coordinador de la compra (D6): confirmar, pagar y cancelar tocan carrito,
 * stock, órdenes y pagos; ninguno de esos módulos sabe de los demás.
 * Este service decide CUÁNDO pasa cada cosa; cada módulo sabe CÓMO (§8).
 */
@Injectable()
export class CheckoutService {
  constructor(
    @Inject(TRANSACTION_RUNNER)
    private readonly transactions: TransactionRunner,
    private readonly users: UsersService,
    private readonly cart: CartService,
    private readonly stock: StockService,
    private readonly orders: OrderService,
    private readonly payments: PaymentsService,
  ) {}

  // ───────────────────────── Confirmar (caso 7) ─────────────────────────

  /**
   * Reserva lo disponible y crea la orden PENDING, todo en UNA transacción
   * de milisegundos (§6, §7). Si algo falla, nada queda a medias.
   * @throws MissingAddressError | EmptyCartError | NothingAvailableError | OpenOrderExistsError
   */
  async confirm(userId: string): Promise<ConfirmResult> {
    const { address } = await this.users.getProfile(userId);
    if (!address) {
      throw new MissingAddressError();
    }
    const items = await this.cart.getItems(userId);
    if (items.length === 0) {
      throw new EmptyCartError();
    }

    return this.transactions.run(async (tx) => {
      // 1) Bloquear filas, decidir cuánto reservar y descontar (FOR UPDATE).
      const reservations = await this.stock.reserve(tx, items);
      const reserved = reservations.filter((r) => r.reserved > 0);
      const excluded = reservations
        .filter((r) => r.reserved < r.requested)
        .map(toExcluded);
      if (reserved.length === 0) {
        throw new NothingAvailableError(excluded); // → ROLLBACK
      }

      // 2) Crear la orden con el snapshot de nombre y precio. Si el usuario ya
      //    tiene una orden abierta, el índice de la BD la rechaza → ROLLBACK
      //    (y el stock descontado en el paso 1 vuelve solo).
      const order = await this.orders.create(tx, {
        userId,
        shippingAddress: address, // snapshot de la dirección
        items: reserved.map((r) => ({
          productId: r.productId,
          productName: r.productName,
          unitPrice: r.unitPrice,
          quantity: r.reserved,
        })),
      });

      // 3) Lo que entró en la orden sale del carrito; lo excluido se queda.
      await this.cart.removeOrdered(
        tx,
        userId,
        reserved.map((r) => ({ productId: r.productId, quantity: r.reserved })),
      );
      return { order, excluded };
    });
  }

  // ───────────────────────── Pagar (caso 8, §8) ─────────────────────────

  /**
   * Cobra la orden con las capas de protección de §8. Pedirlo N veces
   * produce UN solo cobro y responde el estado actual (idempotencia).
   * @throws OrderNotFoundError | InvalidOrderStateError | PaymentWindowClosedError | PaymentGatewayUnavailableError
   */
  async pay(
    userId: string,
    orderId: string,
    cardNumber: string,
  ): Promise<PayResult> {
    // Capa 1: validar ANTES de cobrar. El monto sale de la orden guardada.
    const order = await this.orders.findForUser(userId, orderId);
    if (order.status === 'CANCELLED') {
      throw new InvalidOrderStateError(orderId, order.status, 'pagar');
    }
    if (order.status !== 'PENDING') {
      return this.payResult(order); // ya PAID/SHIPPED o en proceso: mismo resultado
    }
    if (Date.now() > order.paymentDeadline.getTime()) {
      throw new PaymentWindowClosedError(orderId);
    }

    // Capa 2: tomar la orden (PENDING → PROCESSING atómico). Con doble clic,
    // solo una petición gana; la otra responde el estado actual sin cobrar.
    if (!(await this.orders.transition(orderId, 'PENDING', 'PROCESSING'))) {
      return this.payResult(await this.orders.findById(orderId));
    }

    // El número de intento se cuenta DESPUÉS de tomar la orden: nadie más
    // puede estar cobrándola ahora, así que el conteo es exacto.
    const attempt = (await this.payments.attemptsUsed(orderId)) + 1;

    // Capa 3: cobrar con clave orderId + intento.
    let result: ChargeResult;
    try {
      result = await this.payments.charge({
        orderId,
        attempt,
        amount: order.total,
        cardNumber,
      });
    } catch {
      // Sin respuesta de la pasarela: no se sabe si cobró. La orden queda en
      // PROCESSING y el job la verifica con la clave del intento (D54).
      throw new PaymentGatewayUnavailableError();
    }

    if (result.status === 'APPROVED') {
      return this.payResult(await this.markPaid(orderId));
    }

    // Rechazado: vuelve a PENDING para reintentar dentro de la misma ventana.
    await this.orders.transition(orderId, 'PROCESSING', 'PENDING');
    if (attempt >= MAX_PAYMENT_ATTEMPTS) {
      // Tercer rechazo: se cancela YA y se libera el stock (card testing, §6).
      await this.cancel(await this.orders.findById(orderId), ['PENDING']);
    }
    return this.payResult(await this.orders.findById(orderId), result.reason);
  }

  /**
   * Capa 5: PROCESSING → PAID. Si no se aplica, alguien más resolvió la orden
   * mientras se cobraba (el job de recuperación, D54). Si ese alguien ya la
   * marcó PAID, no hay nada que hacer; si la canceló, se reembolsa el cobro.
   */
  private async markPaid(orderId: string): Promise<Order> {
    if (!(await this.orders.transition(orderId, 'PROCESSING', 'PAID'))) {
      const current = await this.orders.findById(orderId);
      if (current.status === 'CANCELLED') {
        await this.payments.refund(orderId);
      }
      return current;
    }
    return this.orders.findById(orderId);
  }

  private async payResult(
    order: Order,
    declineReason?: string,
  ): Promise<PayResult> {
    const used = await this.payments.attemptsUsed(order.id);
    return {
      order,
      declineReason,
      attemptsLeft: Math.max(0, MAX_PAYMENT_ATTEMPTS - used),
    };
  }

  // ───────────────────── Cancelar (casos 9 y 15, §5) ─────────────────────

  /** El cliente cancela su orden mientras está PENDING (p. ej. tras una orden parcial). */
  async cancelByCustomer(userId: string, orderId: string): Promise<Order> {
    const order = await this.orders.findForUser(userId, orderId);
    return this.cancel(order, ['PENDING']);
  }

  /** El admin cancela una orden PENDING o PAID (esta última con reembolso). */
  async cancelByAdmin(orderId: string): Promise<Order> {
    const order = await this.orders.findById(orderId);
    return this.cancel(order, ['PENDING', 'PAID']);
  }

  /**
   * UNA sola operación de cancelar para todos los disparadores (§5).
   * @throws InvalidOrderStateError | RefundFailedError | OrderChangedError
   */
  private async cancel(order: Order, allowed: OrderStatus[]): Promise<Order> {
    if (!allowed.includes(order.status)) {
      throw new InvalidOrderStateError(order.id, order.status, 'cancelar');
    }
    if (order.status === 'PAID') {
      // Primero el dinero: si el reembolso falla, la orden NO se cancela (§6).
      try {
        await this.payments.refund(order.id);
      } catch {
        throw new RefundFailedError(order.id);
      }
    }
    await this.transactions.run(async (tx) => {
      // Atómico: si otro proceso cambió el estado (p. ej. el cliente empezó a
      // pagar), no se aplica y se deshace todo, incluida la liberación.
      if (
        !(await this.orders.transition(order.id, order.status, 'CANCELLED', tx))
      ) {
        throw new OrderChangedError(order.id);
      }
      await this.stock.release(tx, order.items);
    });
    return this.orders.findById(order.id);
  }
}

function toExcluded(r: Reservation): ExcludedItem {
  return {
    productId: r.productId,
    productName: r.productName,
    requested: r.requested,
    reserved: r.reserved,
    reason: !r.active
      ? 'UNAVAILABLE'
      : r.reserved === 0
        ? 'OUT_OF_STOCK'
        : 'PARTIAL',
  };
}
