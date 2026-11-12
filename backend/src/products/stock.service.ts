import { Inject, Injectable } from '@nestjs/common';
import {
  InsufficientStockError,
  ProductNotFoundError,
} from './product.errors.js';
import {
  PRODUCT_REPOSITORY,
  type ProductRepository,
} from './product.repository.js';
import type { Product } from './product.types.js';

/**
 * ÚNICO punto del sistema que modifica el stock (D5). Hoy: ajuste del admin
 * (D40). Con checkout se agregarán reservar y liberar.
 */
@Injectable()
export class StockService {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
  ) {}

  /**
   * Suma (delta > 0, p. ej. llegó mercancía) o resta (delta < 0, p. ej.
   * merma) unidades. Relativo y no absoluto: no pisa una compra simultánea.
   * @throws ProductNotFoundError | InsufficientStockError
   */
  async adjust(id: string, delta: number): Promise<Product> {
    const updated = await this.products.adjustStock(id, delta);
    if (updated) {
      return updated;
    }
    // No se aplicó. Esta lectura solo sirve para explicar POR QUÉ; la
    // decisión ya la tomó la BD en el UPDATE atómico.
    const current = await this.products.findById(id);
    if (!current) {
      throw new ProductNotFoundError(id);
    }
    throw new InsufficientStockError(id, current.stock, -delta);
  }
}
