// Reglas de negocio configurables, en un solo lugar (decisión D23).
// Son iguales en todos los entornos: cambiarlas pasa por un commit.
// Origen de cada regla: docs/SUPUESTOS.md.

/** §6: minutos que tiene el cliente para pagar desde que confirma la compra. */
export const PAYMENT_WINDOW_MINUTES = 5;

/** §6/§8: margen para que un pago iniciado a tiempo termine antes de liberar el stock. */
export const PAYMENT_GRACE_MINUTES = 5;

/** §6: minutos tras los cuales una orden sin pagar se cancela y libera su stock. */
export const RESERVATION_RELEASE_MINUTES =
  PAYMENT_WINDOW_MINUTES + PAYMENT_GRACE_MINUTES;

/** §6: intentos de pago por orden (protección contra card testing). */
export const MAX_PAYMENT_ATTEMPTS = 3;

/** D11: cada cuántos segundos revisa el job de expiración. */
export const EXPIRATION_JOB_INTERVAL_SECONDS = 60;

// Nota: "máximo 1 orden abierta por usuario" NO está aquí a propósito.
// La garantiza un índice único parcial en la BD (D19); una constante daría la
// falsa impresión de que se puede cambiar sin una migración.
