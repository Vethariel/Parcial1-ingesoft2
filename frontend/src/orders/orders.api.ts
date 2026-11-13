// Órdenes del cliente (↔ backend/src/orders/orders.controller.ts).
import { http } from '../api/http.ts'
import type { Order, Page } from '../shared/types.ts'

export const ordersApi = {
  /** Mis órdenes, de la más reciente a la más antigua. */
  list: (page: number, pageSize: number) =>
    http.get<Page<Order>>(`/orders?page=${page}&pageSize=${pageSize}`),

  /** 404 si no existe o es de otro cliente. */
  get: (id: string) => http.get<Order>(`/orders/${id}`),
}
