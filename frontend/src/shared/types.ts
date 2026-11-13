// Forma de las respuestas del backend (D63: el frontend no comparte código
// con el backend; estos tipos describen lo que la API devuelve).
// Se agregan aquí a medida que cada pantalla los necesita.

/** Respuesta paginada (backend/src/shared/pagination.ts). */
export type Page<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export type Role = 'CUSTOMER' | 'ADMIN'

/** Usuario público (backend/src/users/public-user.ts): nunca trae el hash. */
export type User = {
  id: string
  name: string
  email: string
  address: string | null
  role: Role
}

/** Respuesta de registro y login (backend/src/auth/auth.types.ts). */
export type AuthResult = {
  accessToken: string
  user: User
}

export type Category = {
  id: string
  name: string
}

/** Producto (backend/src/products/product.types.ts). */
export type Product = {
  id: string
  name: string
  description: string
  imageUrl: string
  /** Texto con 2 decimales (D45): se muestra con <Price>, nunca se opera. */
  price: string
  stock: number
  active: boolean
  category: Category
}

/** Línea guardada: lo que el carrito anónimo tiene en localStorage. */
export type CartItem = {
  productId: string
  quantity: number
}

/** Aviso preventivo calculado por el backend (D49). */
export type CartWarning = 'UNAVAILABLE' | 'INSUFFICIENT_STOCK'

export type CartLine = {
  product: Pick<Product, 'id' | 'name' | 'imageUrl' | 'price' | 'stock' | 'active'>
  quantity: number
  subtotal: string
  warning: CartWarning | null
}

/** Vista del carrito (backend/src/cart/cart.types.ts): totales calculados por el servidor. */
export type CartView = {
  items: CartLine[]
  total: string
  hasWarnings: boolean
}

export type OrderStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'SHIPPED' | 'CANCELLED'

/** Línea de la orden: snapshot de nombre y precio al confirmar (no cambia después). */
export type OrderItem = {
  productId: string
  productName: string
  unitPrice: string
  quantity: number
  subtotal: string
}

/** Orden (backend/src/orders/order.types.ts). Las fechas llegan como texto ISO. */
export type Order = {
  id: string
  userId: string
  status: OrderStatus
  total: string
  shippingAddress: string
  createdAt: string
  /** Hasta cuándo se puede pagar (createdAt + 5 min, calculado por el backend). */
  paymentDeadline: string
  items: OrderItem[]
}

/** Producto que no entró (completo) en la orden: se queda en el carrito (§6). */
export type ExcludedItem = {
  productId: string
  productName: string
  requested: number
  reserved: number
  reason: 'UNAVAILABLE' | 'OUT_OF_STOCK' | 'PARTIAL'
}

export type ConfirmResult = {
  order: Order
  excluded: ExcludedItem[]
}

/** Respuesta de pagar (D59): el estado de la orden cuenta lo que pasó. */
export type PayResult = {
  order: Order
  declineReason?: string
  attemptsLeft: number
}
