import { Inject, Injectable } from '@nestjs/common';
import type { Page, Pagination } from '../shared/pagination.js';
import { ProductNotFoundError } from './product.errors.js';
import {
  PRODUCT_REPOSITORY,
  type ProductRepository,
} from './product.repository.js';
import type { NewProduct, Product, ProductChanges } from './product.types.js';

export type CatalogQuery = Pagination & { categoryId?: string };

/**
 * Casos de uso de productos: catálogo público (caso 1) y CRUD del admin
 * (caso 12). La regla "el público no ve productos desactivados" vive aquí.
 * El stock no se modifica en este service (D5, D40).
 */
@Injectable()
export class ProductsService {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
  ) {}

  /** Catálogo público: solo productos activos. */
  findCatalogPage(query: CatalogQuery): Promise<Page<Product>> {
    return this.products.findPage({ ...query, onlyActive: true });
  }

  /**
   * Detalle público. Un producto desactivado responde igual que uno que no
   * existe: el visitante no tiene por qué saber que existió.
   * @throws ProductNotFoundError
   */
  async findActiveById(id: string): Promise<Product> {
    const product = await this.products.findById(id);
    if (!product || !product.active) {
      throw new ProductNotFoundError(id);
    }
    return product;
  }

  /**
   * Para otros módulos (cart): varios productos, incluidos los desactivados,
   * porque quien llama decide cómo mostrarlos.
   */
  findByIds(ids: string[]): Promise<Product[]> {
    return ids.length === 0
      ? Promise.resolve([])
      : this.products.findByIds(ids);
  }

  /** Listado del admin: incluye desactivados (D42). */
  findAdminPage(query: CatalogQuery): Promise<Page<Product>> {
    return this.products.findPage({ ...query, onlyActive: false });
  }

  /** @throws InvalidCategoryError */
  create(data: NewProduct): Promise<Product> {
    return this.products.create(data);
  }

  /** Incluye desactivar y reactivar con `active` (D44). @throws ProductNotFoundError | InvalidCategoryError */
  update(id: string, changes: ProductChanges): Promise<Product> {
    return this.products.update(id, changes);
  }
}
