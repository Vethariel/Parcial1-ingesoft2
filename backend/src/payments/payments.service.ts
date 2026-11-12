import { Inject, Injectable } from '@nestjs/common';
import {
  PAYMENT_GATEWAY,
  type ChargeResult,
  type PaymentGateway,
} from './payment-gateway.js';
import {
  PAYMENT_REPOSITORY,
  type PaymentRepository,
} from './payment.repository.js';

/** Clave de idempotencia (§8, capa 3): una por intento de cada orden. */
export function idempotencyKey(orderId: string, attempt: number): string {
  return `${orderId}:${attempt}`;
}

/**
 * Cobros y reembolsos: habla con la pasarela y deja registro de cada intento
 * en la tabla payments. NO cambia estados de la orden: eso lo decide
 * CheckoutService (§8, responsables).
 */
@Injectable()
export class PaymentsService {
  constructor(
    @Inject(PAYMENT_REPOSITORY) private readonly payments: PaymentRepository,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
  ) {}

  /** Intentos ya usados de la orden (para el máximo de 3, §6). */
  attemptsUsed(orderId: string): Promise<number> {
    return this.payments.countByOrder(orderId);
  }

  /**
   * Registra el intento en PENDING, cobra y guarda el resultado.
   * Si la pasarela no responde (error de red), el intento queda PENDING y el
   * error se propaga: la orden queda PROCESSING y la recupera el job (D54).
   */
  async charge(input: {
    orderId: string;
    attempt: number;
    amount: string;
    cardNumber: string;
  }): Promise<ChargeResult> {
    const payment = await this.payments.create({
      orderId: input.orderId,
      attempt: input.attempt,
      amount: input.amount,
      method: describeCard(input.cardNumber),
    });
    const result = await this.gateway.charge({
      idempotencyKey: idempotencyKey(input.orderId, input.attempt),
      amount: input.amount,
      cardNumber: input.cardNumber,
    });
    await this.saveResult(payment.id, result);
    return result;
  }

  /**
   * Reembolsa el cobro aprobado de la orden.
   * @throws Error si no hay cobro aprobado o si la pasarela falla.
   */
  async refund(orderId: string): Promise<void> {
    const payments = await this.payments.findByOrder(orderId);
    const succeeded = payments.find((p) => p.status === 'SUCCEEDED');
    if (!succeeded?.externalReference) {
      throw new Error(`La orden ${orderId} no tiene un cobro aprobado`);
    }
    await this.gateway.refund(succeeded.externalReference);
    await this.payments.saveResult(succeeded.id, {
      status: 'REFUNDED',
      externalReference: succeeded.externalReference,
    });
  }

  /**
   * Recuperación de una orden atascada (D54): consulta a la pasarela por la
   * clave del último intento sin resultado. null = la pasarela nunca recibió
   * el cobro (o no hay intento pendiente): es seguro cancelar.
   */
  async recover(orderId: string): Promise<ChargeResult | null> {
    const payments = await this.payments.findByOrder(orderId);
    const pending = payments.findLast((p) => p.status === 'PENDING');
    if (!pending) {
      return null;
    }
    const result = await this.gateway.findCharge(
      idempotencyKey(orderId, pending.attempt),
    );
    if (!result) {
      await this.payments.saveResult(pending.id, { status: 'FAILED' });
      return null;
    }
    await this.saveResult(pending.id, result);
    return result;
  }

  private saveResult(paymentId: string, result: ChargeResult): Promise<void> {
    return this.payments.saveResult(
      paymentId,
      result.status === 'APPROVED'
        ? { status: 'SUCCEEDED', externalReference: result.reference }
        : { status: 'FAILED' },
    );
  }
}

/** "4242424242424242" → "tarjeta ****4242". El número completo nunca se guarda. */
function describeCard(cardNumber: string): string {
  return `tarjeta ****${cardNumber.slice(-4)}`;
}
