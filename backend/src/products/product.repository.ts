import type { Page } from '../shared/pagination.js';
import type {
  NewProduct,
  Product,
  ProductChanges,
  ProductFilter,
} from './product.types.js';

/**
 * Contrato del repositorio de productos: QUÉ se puede pedir, en lenguaje del
 * negocio. La implementación (PrismaProductRepository) decide CÓMO.
 */
export interface ProductRepository {
  findPage(filter: ProductFilter): Promise<Page<Product>>;
  /** Devuelve también los desactivados: el service decide quién puede verlos. */
  findById(id: string): Promise<Product | null>;
  /** @throws InvalidCategoryError si la categoría no existe. */
  create(data: NewProduct): Promise<Product>;
  /**
   * @throws ProductNotFoundError si el producto no existe.
   * @throws InvalidCategoryError si la nueva categoría no existe.
   */
  update(id: string, changes: ProductChanges): Promise<Product>;
  /**
   * Suma `delta` al stock en UNA operación atómica, solo si el resultado no
   * queda negativo. Devuelve el producto actualizado, o null si no se aplicó
   * (no existe o no alcanza). Solo la usa StockService (D5, D40).
   */
  adjustStock(id: string, delta: number): Promise<Product | null>;
}

/** Token de inyección: las interfaces no existen en tiempo de ejecución. */
export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');
