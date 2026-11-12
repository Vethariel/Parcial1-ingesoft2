// Tipos del dominio de productos, independientes de Prisma.

export type Product = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  /** Texto con 2 decimales ("19990.00"), nunca number (D45). */
  price: string;
  stock: number;
  /** Soft delete: false = no aparece en el catálogo público. */
  active: boolean;
  category: { id: string; name: string };
};

/** Datos para crear. El stock inicial se acepta aquí (D43). */
export type NewProduct = {
  name: string;
  description: string;
  imageUrl: string;
  price: string;
  stock: number;
  categoryId: string;
};

/**
 * Lo que el admin puede editar. El stock NO está: solo cambia a través de
 * StockService (D5, D40).
 */
export type ProductChanges = {
  name?: string;
  description?: string;
  imageUrl?: string;
  price?: string;
  categoryId?: string;
  active?: boolean;
};

/** Fila bloqueada con FOR UPDATE durante la reserva (solo lo que se necesita). */
export type LockedProduct = {
  id: string;
  name: string;
  price: string;
  stock: number;
  active: boolean;
};

/** Unidades de un producto (lo que se pide reservar o liberar). */
export type StockLine = {
  productId: string;
  quantity: number;
};

/** Resultado de reservar un producto (§6, orden parcial). */
export type Reservation = {
  productId: string;
  productName: string;
  /** Precio del momento: será el snapshot de la orden. */
  unitPrice: string;
  requested: number;
  /** min(stock, pedido); 0 si no hay stock o el producto está desactivado. */
  reserved: number;
  active: boolean;
};

export type ProductFilter = {
  categoryId?: string;
  /** true en el catálogo público; false en el listado del admin. */
  onlyActive: boolean;
  page: number;
  pageSize: number;
};
