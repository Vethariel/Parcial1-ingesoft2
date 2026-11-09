# Arquitectura

Documento vivo. Los supuestos del negocio que justifican estas decisiones están en [SUPUESTOS.md](SUPUESTOS.md).

_Última actualización: 2026-11-09. Estado: diseño, sin código aún._

---

## 1. Piezas básicas

| Pieza | Analogía | Responsabilidad | Prohibido |
|---|---|---|---|
| **Punto de entrada** (controller, job programado) | El mesero | Recibe el estímulo (petición HTTP o reloj), valida la forma de los datos y delega | Contener reglas de negocio |
| **Service** | El cocinero | Reglas del negocio | Conocer HTTP (status codes, headers) o escribir consultas a la BD |
| **Repositorio** (interfaz + implementación con Prisma) | El despensero | Traducir "qué necesito" (`descontarStock`) en consultas concretas | Decidir reglas de negocio |
| **Base de datos** (PostgreSQL) | La despensa | Guardar y leer; garantizar integridad | Decidir |
| **Módulo** | Una estación de la cocina | Agrupa los puntos de entrada y servicios de **un tema** del negocio | Mezclar temas |

**Regla:** los puntos de entrada no tienen lógica de negocio. Un controller y un job programado son equivalentes: ambos solo disparan una operación de un service.

**Principio general: explícito sobre implícito.** Se prefieren soluciones que se puedan leer y explicar línea por línea, aunque cuesten un poco más de código, frente a mecanismos "mágicos" (decoradores con contexto oculto, librerías que actúan de forma invisible). **Justificación:** el sistema debe poder entenderse, explicarse y modificarse en vivo, y los errores deben ser visibles.

---

## 2. Método: del negocio a los módulos

1. **Listar los casos de uso** (*actor + verbo + cosa*), a partir de SUPUESTOS.md.
2. **Identificar la entidad que cada caso modifica** (o lee, si no modifica nada).
3. **Agrupar los casos por entidad dueña** → módulos candidatos.
4. **Las entidades que no tienen sentido solas van con su padre** (ItemCarrito → Carrito).
5. **Los casos que modifican entidades de varios grupos** no le pertenecen a ninguno → **coordinador**.
6. **Lo externo** (pasarela de pago) → detrás de una **interfaz**, en su propio módulo.
7. **El actor no es un módulo**: "solo admin" es un **permiso** (guard) sobre el caso de uso.

---

## 3. Casos de uso

| # | Actor | Caso de uso | Entidades que modifica (lee) | Módulo |
|---|---|---|---|---|
| 1 | Visitante | Ver catálogo y detalle de un producto | (Producto, Categoría) | products |
| 2 | Visitante | Registrarse | Usuario | auth → users |
| 3 | Visitante | Iniciar sesión | (Usuario) | auth |
| 4 | Cliente | Editar perfil (nombre, dirección, contraseña) | Usuario | users |
| 5 | Cliente | Agregar, quitar o cambiar cantidad en el carrito | Carrito, ItemCarrito (Producto) | cart |
| 6 | Cliente | Ver carrito con aviso preventivo de stock | (Carrito, Producto) | cart |
| 7 | Cliente | **Confirmar compra** | Producto, Orden, DetalleOrden, Carrito | **checkout** |
| 8 | Cliente | **Pagar** | Cobro, Orden | **checkout** |
| 9 | Cliente | **Cancelar orden PENDING** | Orden, Producto | **checkout** |
| 10 | Cliente | Ver mis órdenes | (Orden, DetalleOrden) | orders |
| 11 | Admin | CRUD de categorías (no borra si tiene productos) | Categoría (Producto) | categories |
| 12 | Admin | CRUD de productos (soft delete) | Producto (Categoría) | products |
| 13 | Admin | Ver órdenes y marcarlas como enviadas | Orden | orders |
| 14 | Sistema | **Expirar órdenes vencidas** | Orden, Producto | **expirations → checkout** |
| 15 | Admin | **Cancelar orden (incluso `PAID`, con reembolso)** | Orden, Producto, Cobro | **checkout** |

Los casos en **negrita** tocan varios grupos (paso 5 del método), y por eso los resuelve un coordinador.

---

## 4. Mapa de módulos

| Módulo | Responsabilidad | Piezas principales (planeadas) | Depende de |
|---|---|---|---|
| **auth** | Registro, login, emisión de tokens, guards de autenticación y rol | `AuthController`, `AuthService`, `JwtGuard`, `RolesGuard` | users |
| **users** | Datos del usuario y perfil | `UsersController`, `UsersService`, `UserRepository` | — |
| **categories** | CRUD de categorías | `CategoriesController`, `CategoriesService`, `CategoryRepository` | — |
| **products** | Catálogo público, CRUD de admin, soft delete, **stock** | `ProductsController`, `ProductsService`, `StockService`, `ProductRepository` | categories |
| **cart** | Carrito persistido y aviso preventivo | `CartController`, `CartService`, `CartRepository` | products |
| **orders** | Órdenes, detalle, **estados y transiciones** | `OrdersController`, `OrderService`, `OrderRepository` | — |
| **payments** | Cobros y reembolsos; interfaz hacia la pasarela | `PaymentGateway` (interfaz), `MockPaymentGateway`, `PaymentRepository` | — |
| **checkout** | **Coordina** confirmar, pagar y cancelar | `CheckoutController`, `CheckoutService` | cart, products, orders, payments |
| **expirations** | Dispara la expiración periódica de órdenes | `ExpirationJob` (cron) | checkout |
| **prisma** *(infra)* | Conexión a la BD | `PrismaService` | — |
| **config** *(infra)* | Constantes de negocio en un solo lugar | Ventana de pago (5 min), liberación (10 min), máx. intentos (3), máx. órdenes pendientes (1), frecuencia del cron (1 min) | — |

Cada `XRepository` es una **interfaz** con una implementación `PrismaXRepository`. Los services dependen de la interfaz, nunca de Prisma.

### Dependencias

```
expirations
     │
     ▼
  checkout ───────────┬──────────┬──────────┐
     │                │          │          │
     ▼                ▼          ▼          ▼
   cart ──────▶  products     orders    payments
                     │
                     ▼
                categories

auth ──▶ users          (los guards de auth los usan todos los módulos)
```

- Las flechas van en una sola dirección y **no hay ciclos**.
- Nadie depende de `checkout` salvo `expirations`.
- Cambiar la pasarela de pago solo afecta a `payments`.

---

## 5. Flujo de una compra (diseño preliminar)

### Confirmar compra: `POST /checkout/confirm`

```
JwtGuard (¿quién es?) → RolesGuard (¿es CUSTOMER?)
→ CheckoutController.confirm
→ CheckoutService.confirm(usuario)
   ├─ validar: dirección en el perfil, sin otra orden PENDING
   ├─ CartService: obtener items (rechazar productos inactivos)
   └─ TRANSACCIÓN (milisegundos)
        ├─ StockService.reservar(items)       SELECT ... FOR UPDATE, reserva min(stock, pedido)
        ├─ si nada se reservó → rollback → 409 "sin stock"
        ├─ OrderService.crear(...)            PENDING, snapshot de precio/nombre/total/dirección
        └─ CartService.quitar(reservados)     lo excluido se queda en el carrito
→ respuesta: orden + productos excluidos
```

### Pagar: `POST /checkout/orders/:id/pay`

```
JwtGuard → RolesGuard
→ CheckoutController.pay
→ CheckoutService.pay(usuario, orderId)
   ├─ capa 1: ¿es suya?, ¿PENDING?, ¿dentro de los 5 min?, ¿intentos < 3?   (si no, no cobra)
   ├─ capa 2: OrderService: PENDING → PROCESSING atómico   (0 filas → responder estado actual)
   ├─ capa 3: PaymentGateway.charge(orderId + intento, total de la orden)
   ├─ OK      → OrderService: PROCESSING → PAID   (capa 5: 0 filas → reembolso)
   └─ rechazo → OrderService: PROCESSING → PENDING; si es el 3er intento → cancelarOrden()
→ respuesta: estado de la orden
```

### Cancelar: una sola operación, cuatro disparadores

```
Cliente: orden PENDING (POST /checkout/orders/:id/cancel) ──┐
3er intento de pago fallido ────────────────────────────────┤
ExpirationJob (reloj, cada minuto) ─────────────────────────┼──▶ CheckoutService.cancelarOrden(orderId)
Admin: orden PENDING o PAID (POST /admin/orders/:id/cancel) ┘
        │
        ├─ ¿SHIPPED? → rechazar (sería una devolución, fuera de alcance)
        ├─ ¿PAID?    → PaymentGateway.refund(referencia del cobro)
        │                 └─ si falla → NO se cancela, se informa el error
        ├─ OrderService: → CANCELLED (atómico)
        └─ StockService.liberar(detalle)
```

---

## 6. Registro de decisiones

| # | Decisión | Justificación | Alternativa descartada |
|---|---|---|---|
| D1 | **PostgreSQL** | Dominio relacional; las reglas dependen de transacciones ACID, bloqueo de filas (`FOR UPDATE`) y restricciones de integridad (FK, `UNIQUE`, `CHECK`) | MongoDB: técnicamente posible, pero el dominio no tiene estructura flexible que lo justifique. Archivos JSON: sin control de concurrencia |
| D2 | **Módulos por dominio**, no por actor | Cohesión: cada módulo cambia por una sola razón (S de SOLID). Evita duplicar lógica de productos entre "catálogo" y "admin" (DRY) | Módulos por actor (`admin`, `compra`...) |
| D3 | **Sin módulo `admin`**: el rol se controla con guards | El actor es un permiso sobre un caso de uso, no un tema del negocio | Módulo `admin` |
| D4 | **`auth` separado de `users`** | La autenticación es transversal (todos los módulos usan sus guards) y no modifica entidades | Todo dentro de `users` |
| D5 | **`StockService` dentro de `products`** | Su única entidad es Producto (columna `stock`) | Módulo `inventory` propio |
| D6 | **`checkout` como coordinador** | Confirmar, pagar y cancelar tocan entidades de varios módulos; ninguno debería saber de los demás | Meter la lógica en `orders` (acoplaría órdenes con stock y carrito) |
| D7 | **Una sola operación `cancelarOrden`** con tres disparadores | DRY: cancelar por el cliente, por intentos agotados o por expiración hacen lo mismo | Lógica de cancelación repetida en cada disparador |
| D8 | **Módulo `expirations` separado** | Claridad: el trabajo programado queda visible. Si aparecen nuevas reglas temporales, tienen un lugar natural para crecer | Job dentro de `checkout` (más cohesión, pero menos visible) |
| D9 | **DDD ligero** | Se adoptan el lenguaje ubicuo, contextos delimitados (módulos), servicio de aplicación (`checkout`) y puertos (`PaymentGateway`). Se evita la ceremonia de DDD completo (capas dominio/aplicación/infra, agregados, eventos), desproporcionada para el tamaño del proyecto | DDD completo |

---

| D10 | **Capa de repositorios** (interfaz + implementación Prisma) | El service depende de una abstracción (D de SOLID, coherente con `PaymentGateway`); las reglas quedan separadas de las consultas; las pruebas unitarias usan repositorios falsos | Prisma directo en los services: menos archivos, pero las pruebas son más difíciles y se mezclan reglas con consultas |
| D11 | **Expiración por cron cada minuto** | Libera stock aunque nadie consulte la orden; una orden abandonada queda reservada como máximo ~11 min | Verificación perezosa: el stock quedaría bloqueado hasta que alguien consulte |
| D12 | **El admin puede cancelar órdenes `PAID`** con reembolso. `SHIPPED` no es cancelable. Si el reembolso falla, la orden **no** se cancela | No se marca como cancelado algo cuyo dinero no se devolvió. Cancelar algo ya enviado es una devolución, que es otro proceso | Cancelar sin reembolso, o permitir cancelar `SHIPPED` |

| D13 | **Transacción explícita como parámetro**: `TransactionRunner.ejecutar(tx => ...)` y un tipo propio opaco `Transaccion` que los services pasan sin abrir | Se ve en el código qué está dentro de la transacción; si falta `tx`, no compila. El contrato de los repositorios no menciona Prisma: solo la implementación sabe qué hay dentro de `Transaccion` | Transacción "ambiental" (`nestjs-cls` + `@Transactional`): firmas más limpias, pero es una caja negra y falla en silencio |
| D14 | **PostgreSQL en contenedor** (`docker-compose`) | La configuración de la BD (versión, credenciales, puerto) queda versionada en el proyecto y cualquiera la levanta igual con un comando | `dnf` (configuración solo en el equipo local) o nube (dependencia de internet en la sustentación) |

---

## 7. Pendiente de decidir

_Nada por ahora._
