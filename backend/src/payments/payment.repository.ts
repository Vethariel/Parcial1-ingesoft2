import type { NewPayment, Payment, PaymentResult } from './payment.types.js';

/** Contrato del repositorio de intentos de pago. */
export interface PaymentRepository {
  countByOrder(orderId: string): Promise<number>;
  /** Intentos de la orden, del primero al último. */
  findByOrder(orderId: string): Promise<Payment[]>;
  /** Crea el intento en PENDING (UNIQUE orderId + attempt). */
  create(data: NewPayment): Promise<Payment>;
  saveResult(id: string, result: PaymentResult): Promise<void>;
}

/** Token de inyección: las interfaces no existen en tiempo de ejecución. */
export const PAYMENT_REPOSITORY = Symbol('PAYMENT_REPOSITORY');
