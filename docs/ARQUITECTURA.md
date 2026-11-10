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
| **prisma** *(infra, global)* | Conexión única a la BD y transacciones | `PrismaService`, `PrismaTransactionRunner` (implementa `TransactionRunner`) | — |
| **config** *(infra)* | Reglas de negocio y variables de entorno, cada una en un solo lugar | `business-rules.ts`: ventana de pago (5 min), gracia (5 min), liberación (= ventana + gracia), máx. intentos (3), frecuencia del cron (60 s). `env.ts`: `DATABASE_URL`, `PORT` | — |
| **shared** | Contratos transversales | `transaction.ts`: tipo `Transaction` y la interfaz `TransactionRunner` | — |

La regla "máximo 1 orden abierta por usuario" no es una constante: la garantiza un índice en la BD (D19).

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

| D13 | **Transacción explícita como parámetro**: `TransactionRunner.run(tx => ...)` y un tipo propio opaco `Transaction` (`src/shared/transaction.ts`) que los services pasan sin abrir. Solo los repositorios Prisma la "abren" con `asPrismaTransaction(tx)` | Se ve en el código qué está dentro de la transacción; si falta `tx`, no compila. El contrato de los repositorios no menciona Prisma: solo la implementación sabe qué hay dentro de `Transaccion` | Transacción "ambiental" (`nestjs-cls` + `@Transactional`): firmas más limpias, pero es una caja negra y falla en silencio |
| D14 | **PostgreSQL en contenedor** (`docker-compose`) | La configuración de la BD (versión, credenciales, puerto) queda versionada en el proyecto y cualquiera la levanta igual con un comando | `dnf` (configuración solo en el equipo local) o nube (dependencia de internet en la sustentación) |
| D15 | **NestJS 12 con Vitest** (ESM) | Versión actual del framework; la plantilla oficial trae Vitest, el linter oxlint y TypeScript estricto | NestJS 11 con Jest: más documentación disponible, pero es la versión anterior |
| D16 | **Prisma 7.10.1** (última estable) | La etiqueta `latest` de npm apuntaba a una versión candidata (8.0 RC); no se construye sobre algo que aún puede cambiar | Prisma 8 RC |
| D17 | **Identificadores UUID** | No revelan el volumen del negocio ni se pueden adivinar | Autoincrementales: más legibles, pero exponen información (la seguridad de acceso igual la da la capa 1) |
| D18 | **Montos como `Decimal(12,2)`** | Exactitud sin convertir unidades; se lee igual en la BD y en la interfaz | Enteros en centavos: operaciones más simples, pero hay que convertir al mostrar |
| D19 | **Máximo 1 orden abierta por usuario con un índice único parcial** (`WHERE status IN ('PENDING','PROCESSING')`) | La regla vive en la BD: dos confirmaciones simultáneas no pueden crear dos órdenes abiertas (misma condición de carrera que el stock). Ningún código tiene que acordarse de verificarlo | Bloquear la fila del usuario con `FOR UPDATE`: depende de que todo código que cree órdenes lo haga |
| D20 | **Reglas de la BD escritas a mano en la migración**: `CHECK` (stock ≥ 0, cantidades > 0, montos ≥ 0) e índice parcial | `schema.prisma` no puede expresarlas. Son la última defensa ante bugs del código | Validar solo en los services |
| D21 | **El cobro se registra (`PENDING`) antes de llamar a la pasarela** | `UNIQUE(orderId, attempt)` aparta el número de intento, y queda el rastro para recuperar órdenes atascadas en `PROCESSING` | Registrar el cobro solo después de la respuesta de la pasarela |
| D22 | **El cliente generado de Prisma no se versiona** | Se regenera desde el schema (`npx prisma generate`): una sola fuente de verdad | Versionar `src/generated/` |
| D23 | **Reglas de negocio como constantes en código** (`src/config/business-rules.ts`); el `.env` solo para lo que depende del entorno | Las reglas son iguales en todos los entornos; cambiarlas pasa por un commit y una revisión. Las relaciones entre reglas quedan escritas (`RELEASE = WINDOW + GRACE`) | Reglas en el `.env`: cada entorno podría tener reglas distintas sin que nadie lo note |
| D24 | **`PrismaModule` global** (`@Global()`) | DRY: se registra una vez en `AppModule`. La dependencia sigue visible en el constructor de cada repositorio | Importación explícita en cada módulo |
| D25 | **Fallo rápido al arrancar**: `env.ts` exige las variables obligatorias y `PrismaService` hace `SELECT 1` al iniciar | Un error de configuración o de BD se detecta al arrancar, no en la primera petición de un cliente. (Con el adaptador `pg`, `$connect()` no abre una conexión real) | Confiar en `$connect()` |
| D26 | **Identificadores de código en inglés, comentarios y documentación en español** | Consistencia con los modelos, módulos y librerías (todo en inglés); las explicaciones en el idioma del equipo | Todo en español |
| D27 | **Tipos propios del dominio** en los contratos (`users/user.types.ts`, etc.); el repositorio Prisma traduce con `toDomain()` | Coherente con D13: Prisma no aparece en interfaces ni services. El tipo describe lo que el negocio necesita, no cómo se guarda (p. ej. sin `updatedAt`) | Usar los tipos generados por Prisma: una sola definición, pero acopla los contratos a Prisma |
| D28 | **Errores del dominio** (`EmailAlreadyRegisteredError`, etc.); el repositorio traduce los errores de Prisma y el controller los traduce a HTTP | Cada capa habla su idioma: el service no conoce códigos de Prisma (`P2002`) ni de HTTP (`409`) | Lanzar excepciones HTTP desde services o repositorios |
| D29 | **Cada módulo exporta solo su service**, nunca su repositorio | El repositorio es un detalle interno; los demás módulos piden lo que necesitan al service (encapsulamiento) | Exportar el repositorio para que otros módulos lo usen directamente |

---

## 7. Pendiente de decidir

_Nada por ahora._
