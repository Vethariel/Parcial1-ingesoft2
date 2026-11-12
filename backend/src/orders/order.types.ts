// Tipos del dominio de órdenes.

export type OrderStatus =
  'PENDING' | 'PROCESSING' | 'PAID' | 'SHIPPED' | 'CANCELLED';

/** Línea de la orden: snapshot del producto al confirmar (no cambia después). */
export type OrderItem = {
  productId: string;
  productName: string;
  unitPrice: string;
  quantity: number;
  subtotal: string;
};

export type Order = {
  id: string;
  userId: string;
  status: OrderStatus;
  /** Snapshot: calculado una vez al crear la orden. */
  total: string;
  shippingAddress: string;
  createdAt: Date;
  /** Hasta cuándo se puede pagar (createdAt + ventana de pago, §6). */
  paymentDeadline: Date;
  items: OrderItem[];
};

/** Lo que necesita OrderService.create; el total lo calcula el service. */
export type NewOrder = {
  userId: string;
  shippingAddress: string;
  items: Omit<OrderItem, 'subtotal'>[];
};

export type OrderFilter = {
  userId?: string;
  status?: OrderStatus;
  page: number;
  pageSize: number;
};
