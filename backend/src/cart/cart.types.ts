// Tipos del dominio del carrito.

/** Lo que guarda la BD por cada producto del carrito: solo id y cantidad. */
export type CartItem = {
  productId: string;
  quantity: number;
};

/**
 * Aviso preventivo (SUPUESTOS §6). Solo informa: la verificación real es
 * atómica y ocurre al confirmar la compra.
 *   UNAVAILABLE        → el producto fue desactivado
 *   INSUFFICIENT_STOCK → hay menos stock que la cantidad pedida (o 0)
 */
export type CartWarning = 'UNAVAILABLE' | 'INSUFFICIENT_STOCK';

export type CartLine = {
  product: {
    id: string;
    name: string;
    imageUrl: string;
    /** Precio ACTUAL: el carrito no guarda precio (el snapshot se toma al confirmar). */
    price: string;
    stock: number;
    active: boolean;
  };
  quantity: number;
  subtotal: string;
  warning: CartWarning | null;
};

/** Lo que ve el cliente. */
export type CartView = {
  items: CartLine[];
  /** Estimado con precios actuales, sin productos no disponibles. El real se calcula al confirmar. */
  total: string;
  hasWarnings: boolean;
};
