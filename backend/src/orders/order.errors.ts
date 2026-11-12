// Errores del dominio de órdenes. No conocen HTTP.
import type { OrderStatus } from './order.types.js';

/** No existe, o no es del usuario que la pide: se responde igual (no se revela). */
export class OrderNotFoundError extends Error {
  constructor(id: string) {
    super(`No existe la orden ${id}`);
    this.name = 'OrderNotFoundError';
  }
}

/** El índice único parcial de la BD rechazó una segunda orden abierta (D19). */
export class OpenOrderExistsError extends Error {
  constructor() {
    super(
      'Tienes un pago pendiente: págalo o cancélalo antes de confirmar otra compra',
    );
    this.name = 'OpenOrderExistsError';
  }
}

/** La transición no aplica al estado actual (p. ej. enviar una orden sin pagar). */
export class InvalidOrderStateError extends Error {
  constructor(
    id: string,
    readonly current: OrderStatus,
    action: string,
  ) {
    super(`No se puede ${action} la orden ${id}: está en estado ${current}`);
    this.name = 'InvalidOrderStateError';
  }
}
