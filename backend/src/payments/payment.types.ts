// Tipos del dominio de pagos: cada fila es UN intento de cobro de una orden.

export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';

export type Payment = {
  id: string;
  orderId: string;
  /** 1..MAX_PAYMENT_ATTEMPTS. Junto con orderId forma la clave de idempotencia. */
  attempt: number;
  amount: string;
  /** Descripción sin datos sensibles, p. ej. "tarjeta ****4242". */
  method: string;
  /** PENDING = se llamó a la pasarela y aún no se sabe el resultado. */
  status: PaymentStatus;
  /** Id del cobro en la pasarela; necesario para reembolsar. */
  externalReference: string | null;
};

export type NewPayment = Pick<
  Payment,
  'orderId' | 'attempt' | 'amount' | 'method'
>;

export type PaymentResult = {
  status: Exclude<PaymentStatus, 'PENDING'>;
  externalReference?: string;
};
