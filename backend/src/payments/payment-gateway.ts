// Contrato con la pasarela de pagos (SUPUESTOS §5 y §8). CheckoutService y
// PaymentsService dependen de esta interfaz, nunca de una pasarela concreta
// (D de SOLID): cambiar el mock por Stripe o PayU solo toca payments.

export type ChargeRequest = {
  /** orderId + intento (§8, capa 3). */
  idempotencyKey: string;
  /** Sale de la orden guardada, nunca del cliente. */
  amount: string;
  /** Solo viaja a la pasarela; nunca se guarda. */
  cardNumber: string;
};

export type ChargeResult =
  | { status: 'APPROVED'; reference: string }
  | { status: 'DECLINED'; reason: string };

/**
 * CONTRATO que toda implementación (mock o real) debe cumplir:
 * - charge es IDEMPOTENTE por idempotencyKey: la misma clave nunca cobra dos
 *   veces y devuelve siempre el mismo resultado.
 * - findCharge consulta un cobro por su clave sin crear nada: null si la
 *   pasarela nunca lo recibió (recuperación de órdenes atascadas, D54).
 * - refund es idempotente por referencia; lanza un error si no se pudo.
 */
export interface PaymentGateway {
  charge(request: ChargeRequest): Promise<ChargeResult>;
  findCharge(idempotencyKey: string): Promise<ChargeResult | null>;
  refund(reference: string): Promise<void>;
}

/** Token de inyección: las interfaces no existen en tiempo de ejecución. */
export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');
