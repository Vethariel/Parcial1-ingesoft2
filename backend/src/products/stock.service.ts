import { Inject, Injectable } from '@nestjs/common';
import {
  InsufficientStockError,
  ProductNotFoundError,
} from './product.errors.js';
import {
  PRODUCT_REPOSITORY,
  type ProductRepository,
} from './product.repository.js';
import type { Transaction } from '../shared/transaction.js';
import type { Product, Reservation, StockLine } from './product.types.js';

/**
 * ÚNICO punto del sistema que modifica el stock (D5): ajuste del admin (D40),
 * reserva al confirmar y liberación al cancelar (§6, §7).
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

  /**
   * Reserva lo disponible (orden parcial, §6) DENTRO de la transacción de
   * confirmar. Por cada producto: lee y bloquea la fila (FOR UPDATE), decide
   * reservado = min(stock, pedido) y descuenta. Quien llega después espera el
   * COMMIT y lee el stock ya actualizado (§7).
   */
  async reserve(tx: Transaction, lines: StockLine[]): Promise<Reservation[]> {
    const locked = await this.products.lockForUpdate(
      tx,
      lines.map((line) => line.productId),
    );
    const requested = new Map(lines.map((l) => [l.productId, l.quantity]));

    const reservations: Reservation[] = [];
    for (const product of locked) {
      const wanted = requested.get(product.id) ?? 0;
      // Un producto desactivado no se vende (SUPUESTOS §9).
      const reserved = product.active ? Math.min(product.stock, wanted) : 0;
      if (reserved > 0) {
        await this.products.incrementStock(tx, product.id, -reserved);
      }
      reservations.push({
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        requested: wanted,
        reserved,
        active: product.active,
      });
    }
    return reservations;
  }

  /**
   * Devuelve al stock las unidades de una orden cancelada, dentro de la
   * transacción de cancelar. En orden de id, como la reserva (sin deadlocks).
   */
  async release(tx: Transaction, lines: StockLine[]): Promise<void> {
    // Comparación simple de texto (no localeCompare, que aplica reglas de
    // idioma): coincide con el ORDER BY id de PostgreSQL para UUID.
    const sorted = [...lines].sort((a, b) =>
      a.productId < b.productId ? -1 : a.productId > b.productId ? 1 : 0,
    );
    for (const line of sorted) {
      await this.products.incrementStock(tx, line.productId, line.quantity);
    }
  }
}
