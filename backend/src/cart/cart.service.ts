import { Inject, Injectable } from '@nestjs/common';
import { CART_MAX_QUANTITY_PER_ITEM } from '../config/business-rules.js';
import type { Product } from '../products/product.types.js';
import { ProductsService } from '../products/products.service.js';
import { fromCents, toCents } from '../shared/money.js';
import {
  CartItemNotFoundError,
  CartQuantityLimitError,
} from './cart.errors.js';
import { CART_REPOSITORY, type CartRepository } from './cart.repository.js';
import type { Transaction } from '../shared/transaction.js';
import type {
  CartItem,
  CartLine,
  CartView,
  CartWarning,
} from './cart.types.js';

/**
 * Carrito persistido del cliente (casos 5 y 6). NO reserva stock (§4):
 * se puede pedir más de lo que hay; la vista lo marca con un aviso (D49).
 * Cada operación devuelve el carrito completo.
 */
@Injectable()
export class CartService {
  constructor(
    @Inject(CART_REPOSITORY) private readonly cart: CartRepository,
    // Lee productos a través de su service, nunca de su repositorio (D29).
    private readonly products: ProductsService,
  ) {}

  async getCart(userId: string): Promise<CartView> {
    const items = await this.cart.findItems(userId);
    const products = await this.products.findByIds(
      items.map((item) => item.productId),
    );
    const byId = new Map(products.map((p) => [p.id, p]));

    const lines = items
      .flatMap((item) => {
        const product = byId.get(item.productId);
        // Siempre existe (FK Restrict y soft delete); el filtro es por seguridad.
        return product ? [toLine(product, item.quantity)] : [];
      })
      .sort((a, b) => a.product.name.localeCompare(b.product.name));

    const totalCents = lines
      .filter((line) => line.warning !== 'UNAVAILABLE')
      .reduce((sum, line) => sum + toCents(line.subtotal), 0);

    return {
      items: lines,
      total: fromCents(totalCents),
      hasWarnings: lines.some((line) => line.warning !== null),
    };
  }

  /**
   * Suma la cantidad si el producto ya estaba.
   * @throws ProductNotFoundError si no existe o está desactivado.
   * @throws CartQuantityLimitError si superaría el máximo por producto.
   */
  async addItem(
    userId: string,
    productId: string,
    quantity: number,
  ): Promise<CartView> {
    await this.products.findActiveById(productId);
    const added = await this.cart.addItem(
      userId,
      productId,
      quantity,
      CART_MAX_QUANTITY_PER_ITEM,
    );
    if (!added) {
      throw new CartQuantityLimitError(CART_MAX_QUANTITY_PER_ITEM);
    }
    return this.getCart(userId);
  }

  /** @throws CartItemNotFoundError */
  async setQuantity(
    userId: string,
    productId: string,
    quantity: number,
  ): Promise<CartView> {
    if (!(await this.cart.setQuantity(userId, productId, quantity))) {
      throw new CartItemNotFoundError(productId);
    }
    return this.getCart(userId);
  }

  /** Para checkout: lo que hay en el carrito (id y cantidad), sin armar la vista. */
  getItems(userId: string): Promise<CartItem[]> {
    return this.cart.findItems(userId);
  }

  /** Para checkout, dentro de su transacción: saca del carrito lo que entró en la orden. */
  removeOrdered(
    tx: Transaction,
    userId: string,
    ordered: CartItem[],
  ): Promise<void> {
    return this.cart.subtractQuantities(tx, userId, ordered);
  }

  /** @throws CartItemNotFoundError */
  async removeItem(userId: string, productId: string): Promise<CartView> {
    if (!(await this.cart.removeItem(userId, productId))) {
      throw new CartItemNotFoundError(productId);
    }
    return this.getCart(userId);
  }
}

function toLine(product: Product, quantity: number): CartLine {
  return {
    product: {
      id: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      price: product.price,
      stock: product.stock,
      active: product.active,
    },
    quantity,
    subtotal: fromCents(toCents(product.price) * quantity),
    warning: warningFor(product, quantity),
  };
}

function warningFor(product: Product, quantity: number): CartWarning | null {
  if (!product.active) return 'UNAVAILABLE';
  if (product.stock < quantity) return 'INSUFFICIENT_STOCK';
  return null;
}
