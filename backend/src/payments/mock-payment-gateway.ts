import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type {
  ChargeRequest,
  ChargeResult,
  PaymentGateway,
} from './payment-gateway.js';

/** Tarjetas de prueba (D53): las que terminan así son rechazadas. */
const DECLINED_CARD_SUFFIX = '0002';

/**
 * Demora simulada de la red. Hace visibles en una demo los dobles clics y
 * las peticiones simultáneas (capa 2 de §8).
 */
const SIMULATED_LATENCY_MS = 500;

/**
 * Pasarela simulada. Cumple el contrato de PaymentGateway guardando los
 * cobros en memoria por clave de idempotencia.
 * Limitación (D54): al reiniciar el servidor olvida las claves; una pasarela
 * real las conserva.
 */
@Injectable()
export class MockPaymentGateway implements PaymentGateway {
  private readonly charges = new Map<string, ChargeResult>();
  private readonly refunded = new Set<string>();

  async charge(request: ChargeRequest): Promise<ChargeResult> {
    await delay(SIMULATED_LATENCY_MS);
    // Idempotencia: la misma clave devuelve el mismo resultado, sin cobrar otra vez.
    const previous = this.charges.get(request.idempotencyKey);
    if (previous) {
      return previous;
    }
    const result: ChargeResult = request.cardNumber.endsWith(
      DECLINED_CARD_SUFFIX,
    )
      ? { status: 'DECLINED', reason: 'Tarjeta rechazada por el banco' }
      : { status: 'APPROVED', reference: `mock_ch_${randomUUID()}` };
    this.charges.set(request.idempotencyKey, result);
    return result;
  }

  findCharge(idempotencyKey: string): Promise<ChargeResult | null> {
    return Promise.resolve(this.charges.get(idempotencyKey) ?? null);
  }

  async refund(reference: string): Promise<void> {
    await delay(SIMULATED_LATENCY_MS);
    const exists = [...this.charges.values()].some(
      (c) => c.status === 'APPROVED' && c.reference === reference,
    );
    if (!exists) {
      throw new Error(`La pasarela no conoce el cobro ${reference}`);
    }
    this.refunded.add(reference); // idempotente: reembolsar dos veces no hace nada más
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
