// Catálogo público (↔ backend: ProductsController y CategoriesController).
import { http } from '../api/http.ts'
import type { Category, Page, Product } from '../shared/types.ts'

export type CatalogQuery = {
  page: number
  pageSize: number
  categoryId?: string
}

export const catalogApi = {
  /** Solo productos activos (el filtro lo aplica el backend, D42). */
  listProducts: ({ page, pageSize, categoryId }: CatalogQuery) => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
    if (categoryId) params.set('categoryId', categoryId)
    return http.get<Page<Product>>(`/products?${params}`)
  },

  /** 404 si no existe o está desactivado. */
  getProduct: (id: string) => http.get<Product>(`/products/${id}`),

  listCategories: () => http.get<Category[]>('/categories'),
}
