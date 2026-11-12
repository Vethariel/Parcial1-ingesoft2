import type { Order } from '../orders/order.types.js';

/**
 * Producto que no entró (o no entró completo) en la orden (§6, orden parcial).
 *   UNAVAILABLE  → el producto fue desactivado
 *   OUT_OF_STOCK → no había ninguna unidad
 *   PARTIAL      → entraron menos unidades de las pedidas
 * Lo que falta se queda en el carrito.
 */
export type ExcludedItem = {
  productId: string;
  productName: string;
  requested: number;
  reserved: number;
  reason: 'UNAVAILABLE' | 'OUT_OF_STOCK' | 'PARTIAL';
};

export type ConfirmResult = {
  order: Order;
  excluded: ExcludedItem[];
};

/**
 * Respuesta de pagar. El estado de la orden cuenta lo que pasó:
 *   PAID        → cobro aprobado
 *   PENDING     → rechazado; se puede reintentar (declineReason, attemptsLeft)
 *   CANCELLED   → rechazado por tercera vez; stock liberado
 *   PROCESSING  → otra petición está cobrando esta orden (doble clic)
 */
export type PayResult = {
  order: Order;
  declineReason?: string;
  attemptsLeft: number;
};
