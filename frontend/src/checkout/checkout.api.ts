// Proceso de compra (↔ backend/src/checkout/checkout.controller.ts).
import { http } from '../api/http.ts'
import type { ConfirmResult, Order, PayResult } from '../shared/types.ts'

export const checkoutApi = {
  /** Reserva lo disponible y crea la orden PENDING (201). */
  confirm: () => http.post<ConfirmResult>('/checkout/confirm'),

  /**
   * Cobra la orden. Idempotente en el backend: pedirlo dos veces no cobra
   * dos veces (§8). El número de tarjeta solo viaja a la pasarela.
   */
  pay: (orderId: string, cardNumber: string) =>
    http.post<PayResult>(`/checkout/orders/${orderId}/pay`, { cardNumber }),

  /** Solo órdenes PENDING; libera el stock reservado. */
  cancel: (orderId: string) => http.post<Order>(`/checkout/orders/${orderId}/cancel`),
}
