// Errores del proceso de compra. No conocen HTTP.
import type { ExcludedItem } from './checkout.types.js';

export class MissingAddressError extends Error {
  constructor() {
    super('Agrega una dirección de envío en tu perfil antes de comprar');
    this.name = 'MissingAddressError';
  }
}

export class EmptyCartError extends Error {
  constructor() {
    super('El carrito está vacío');
    this.name = 'EmptyCartError';
  }
}

/** Ningún producto del carrito tenía stock: no se crea la orden (§6). */
export class NothingAvailableError extends Error {
  constructor(readonly excluded: ExcludedItem[]) {
    super('No hay stock de ningún producto del carrito');
    this.name = 'NothingAvailableError';
  }
}

export class PaymentWindowClosedError extends Error {
  constructor(orderId: string) {
    super(`El tiempo para pagar la orden ${orderId} terminó`);
    this.name = 'PaymentWindowClosedError';
  }
}

/** La pasarela no respondió: la orden queda en PROCESSING y la verifica el job (D54). */
export class PaymentGatewayUnavailableError extends Error {
  constructor() {
    super(
      'No se pudo contactar la pasarela de pagos. Verificaremos el pago y actualizaremos tu orden en unos minutos',
    );
    this.name = 'PaymentGatewayUnavailableError';
  }
}

/** §6: si el reembolso falla, la orden NO se cancela. */
export class RefundFailedError extends Error {
  constructor(orderId: string) {
    super(`No se pudo reembolsar la orden ${orderId}; no se canceló`);
    this.name = 'RefundFailedError';
  }
}

/** Otro proceso cambió el estado de la orden mientras se cancelaba. */
export class OrderChangedError extends Error {
  constructor(orderId: string) {
    super(
      `La orden ${orderId} cambió de estado mientras se procesaba; vuelve a consultarla`,
    );
    this.name = 'OrderChangedError';
  }
}
