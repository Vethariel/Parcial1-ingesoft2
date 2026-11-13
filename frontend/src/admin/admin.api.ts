// Endpoints de administración (↔ backend: Admin*Controller, todos bajo
// /admin con RolesGuard ADMIN en la clase, D47). Si un CUSTOMER llegara a
// llamarlos, el backend responde 403: aquí no se confía en la interfaz.
import { http } from '../api/http.ts'
import type { Category, Order, OrderStatus, Page, Product } from '../shared/types.ts'

export type ProductInput = {
  name: string
  description: string
  imageUrl: string
  /** Texto con hasta 2 decimales (D45). */
  price: string
  categoryId: string
}

export const adminApi = {
  // ─────────── Productos ───────────
  /** Incluye desactivados (D42). */
  listProducts: (page: number, pageSize: number, categoryId?: string) => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
    if (categoryId) params.set('categoryId', categoryId)
    return http.get<Page<Product>>(`/admin/products?${params}`)
  },
  /** El stock inicial se acepta al crear (D43). */
  createProduct: (input: ProductInput & { stock: number }) => http.post<Product>('/admin/products', input),
  /** No acepta stock: se ajusta con adjustStock (D40). Incluye activar/desactivar (D44). */
  updateProduct: (id: string, changes: Partial<ProductInput> & { active?: boolean }) =>
    http.patch<Product>(`/admin/products/${id}`, changes),
  /** Ajuste RELATIVO (+ llegó mercancía, − merma): no pisa compras simultáneas (D40). */
  adjustStock: (id: string, delta: number) => http.post<Product>(`/admin/products/${id}/stock`, { delta }),

  // ─────────── Categorías ───────────
  listCategories: () => http.get<Category[]>('/categories'),
  createCategory: (name: string) => http.post<Category>('/admin/categories', { name }),
  renameCategory: (id: string, name: string) => http.patch<Category>(`/admin/categories/${id}`, { name }),
  /** 409 si tiene productos (la FK de la BD lo impide, D46). */
  deleteCategory: (id: string) => http.delete<void>(`/admin/categories/${id}`),

  // ─────────── Órdenes ───────────
  listOrders: (page: number, pageSize: number, status?: OrderStatus) => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
    if (status) params.set('status', status)
    return http.get<Page<Order>>(`/admin/orders?${params}`)
  },
  getOrder: (id: string) => http.get<Order>(`/admin/orders/${id}`),
  /** PAID → SHIPPED. */
  shipOrder: (id: string) => http.patch<Order>(`/admin/orders/${id}/ship`, {}),
  /** PENDING → CANCELLED, o PAID → reembolso → CANCELLED (§6). */
  cancelOrder: (id: string) => http.post<Order>(`/admin/orders/${id}/cancel`),
}
