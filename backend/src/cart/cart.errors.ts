// Errores del dominio del carrito. No conocen HTTP.

export class CartItemNotFoundError extends Error {
  constructor(productId: string) {
    super(`El producto ${productId} no está en el carrito`);
    this.name = 'CartItemNotFoundError';
  }
}

/** Sumar la cantidad superaría el máximo por producto (CART_MAX_QUANTITY_PER_ITEM). */
export class CartQuantityLimitError extends Error {
  constructor(max: number) {
    super(`No se pueden tener más de ${max} unidades de un mismo producto`);
    this.name = 'CartQuantityLimitError';
  }
}
