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
| 4 | Cliente | Editar perfil (nombre, dirección) | Usuario | users |
| 4b | Cliente | Cambiar contraseña (exige la actual) | Usuario | auth → users |
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
| **auth** | **Credenciales**: registro, login, cambio de contraseña, hash, emisión de tokens | `AuthController`, `AuthService`, `PasswordHasher` (interfaz) + `BcryptPasswordHasher` | users, security |
| **security** | **Control de acceso** ("el portero"): configuración del JWT, verificación de tokens y roles. No conoce la base de usuarios | `SecurityModule`, `JwtGuard`, `RolesGuard`, `@Roles`, `@CurrentUser` | — |
| **users** | **Datos de la persona**: guardar y leer usuarios, perfil (nombre, dirección). No conoce bcrypt | `UsersController`, `UsersService`, `UserRepository` | — |
| **categories** | CRUD de categorías | `CategoriesController` (público), `AdminCategoriesController`, `CategoriesService`, `CategoryRepository` | — |
| **products** | Catálogo público, CRUD de admin, soft delete, **stock** | `ProductsController` (público), `AdminProductsController`, `ProductsService`, `StockService`, `ProductRepository` | — (la categoría la valida la FK, D48) |
| **cart** | Carrito persistido (solo CUSTOMER) y aviso preventivo | `CartController`, `CartService`, `CartRepository` | products (lee productos vía `ProductsService.findByIds`), security |
| **orders** | Órdenes, detalle, **estados y transiciones** (máquina de estados en `OrderService`). El cliente ve las suyas; el admin lista y envía | `OrdersController`, `AdminOrdersController`, `OrderService`, `OrderRepository` | security |
| **payments** | Cobros, reembolsos y registro de cada intento; interfaz hacia la pasarela. No cambia estados de la orden | `PaymentsService`, `PaymentGateway` (interfaz), `MockPaymentGateway`, `PaymentRepository` | — |
| **checkout** | **Coordina** confirmar, pagar y cancelar (cliente y admin) | `CheckoutController`, `AdminCheckoutController`, `CheckoutService` | users, cart, products (`StockService`), orders, payments, security |
| **expirations** | Dispara la expiración periódica de órdenes | `ExpirationJob` (cron) | checkout |
| **prisma** *(infra, global)* | Conexión única a la BD y transacciones | `PrismaService`, `PrismaTransactionRunner` (implementa `TransactionRunner`) | — |
| **config** *(infra)* | Reglas de negocio y variables de entorno, cada una en un solo lugar | `business-rules.ts`: ventana de pago (5 min), gracia (5 min), liberación (= ventana + gracia), máx. intentos (3), frecuencia del cron (60 s), tamaño de página (20, máx. 100), unidades máximas por producto en el carrito (99). `env.ts`: `DATABASE_URL`, `PORT` | — |
| **shared** | Contratos transversales | `transaction.ts`: tipo `Transaction` y la interfaz `TransactionRunner`. `id.schema.ts`: ids de la URL como UUID. `pagination.ts`: esquema `?page&pageSize` y tipo `Page<T>`. `money.ts`: dinero en centavos enteros | — |

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

   categories   (nadie depende de él: products valida la categoría con la FK, D48)

auth ──▶ users
  │        │
  ▼        ▼
 security  ◀── categories, products, cart, orders, checkout   (todo módulo con endpoints protegidos)
```

- Las flechas van en una sola dirección y **no hay ciclos**.
- Nadie depende de `checkout` salvo `expirations`.
- Cambiar la pasarela de pago solo afecta a `payments`.

---

## 5. Flujo de una compra

Código: `src/checkout/checkout.service.ts`. `CheckoutService` decide **cuándo** pasa cada cosa; cada módulo sabe **cómo** (§8 de SUPUESTOS).

### Confirmar compra: `POST /checkout/confirm` → 201 `{ order, excluded }`

```
JwtGuard (¿quién es?) → RolesGuard (¿es CUSTOMER?)
→ CheckoutController.confirm
→ CheckoutService.confirm(userId)
   ├─ UsersService.getProfile        sin dirección → 400
   ├─ CartService.getItems           carrito vacío → 400
   └─ TRANSACCIÓN (TransactionRunner.run, milisegundos)
        ├─ StockService.reserve(tx, items)
        │    └─ SELECT ... WHERE id = ANY(...) ORDER BY id FOR UPDATE   (bloquea en orden de id, D57)
        │       reservado = min(stock, pedido), 0 si está desactivado; UPDATE stock = stock - reservado
        ├─ nada reservado → error → ROLLBACK → 409 con `excluded`
        ├─ OrderService.create(tx, ...)  PENDING, snapshot de nombre/precio/dirección, total en el servidor
        │    └─ ya tiene una orden abierta → el índice parcial la rechaza → ROLLBACK (el stock vuelve) → 409
        └─ CartService.removeOrdered(tx, ...)   lo reservado sale del carrito; lo excluido se queda
```

### Pagar: `POST /checkout/orders/:id/pay { cardNumber }` → 200 `{ order, declineReason?, attemptsLeft }`

```
JwtGuard → RolesGuard → CheckoutController.pay → CheckoutService.pay
   ├─ capa 1: OrderService.findForUser (ajena → 404)
   │          CANCELLED → 409 · PAID/SHIPPED/PROCESSING → responde el estado actual, sin cobrar
   │          fuera de la ventana de 5 min → 409
   ├─ capa 2: OrderService.transition(PENDING → PROCESSING)   0 filas (doble clic) → estado actual, sin cobrar
   ├─ intento = PaymentsService.attemptsUsed + 1               (contado DESPUÉS de tomar la orden)
   ├─ capa 3: PaymentsService.charge (fila PENDING → PaymentGateway.charge con clave orderId:intento)
   │          sin respuesta → 503; la orden queda PROCESSING y la verifica el job (D54)
   ├─ aprobado → capa 5: transition(PROCESSING → PAID)
   │             0 filas → otro la resolvió: si quedó CANCELLED → reembolso; si quedó PAID → nada (D58)
   └─ rechazado → transition(PROCESSING → PENDING); si fue el 3er intento → cancelar ya
```

### Cancelar: una sola operación (`CheckoutService.cancel`), varios disparadores

```
Cliente: orden PENDING   (POST /checkout/orders/:id/cancel) ──┐
3er intento de pago rechazado ───────────────────────────────┤
ExpirationJob (paso 5d) ──────────────────────────────────────┼──▶ cancel(order, estadosPermitidos)
Admin: orden PENDING o PAID (POST /admin/orders/:id/cancel) ──┘
        │
        ├─ estado no permitido (SHIPPED, PROCESSING, CANCELLED) → 409
        ├─ ¿PAID? → PaymentsService.refund   falla → 502 y la orden NO se cancela
        └─ TRANSACCIÓN
             ├─ OrderService.transition(estado → CANCELLED, tx)   0 filas → 409 (otro cambió el estado)
             └─ StockService.release(tx, items)                    en orden de id
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
| D30 | **`auth` es dueño de las credenciales**; `users`, de los datos de la persona. Cambiar la contraseña es `PATCH /auth/password` y **exige la contraseña actual** | Evita la dependencia circular `auth ⇄ users` y separa seguridad de datos personales (S de SOLID). Exigir la actual impide que alguien con la sesión abierta se apropie de la cuenta | `users` dueño del hash (users conocería bcrypt) |
| D31 | **JWT** firmado con `JWT_SECRET`, vida de **1 hora**, enviado en el header `Authorization: Bearer`. Payload: `{ sub, role }` | Sin estado ni tablas: verificar es comprobar la firma. No hay requisito de revocación inmediata; la vida corta limita el daño de un token filtrado | Sesiones en BD (revocables, pero con una consulta por petición); cookie `httpOnly` (requiere protección CSRF) |
| D32 | **Guards propios** (`JwtGuard`, `RolesGuard`) con `@nestjs/jwt`, sin Passport | Unas 30 líneas legibles cada uno, sin la capa de "estrategias" de Passport (explícito sobre implícito) | Passport (`@nestjs/passport`) |
| D33 | **Validación de forma con Zod** (`*.schemas.ts` + `StandardSchemaValidationPipe` global); las reglas de negocio quedan en los services | El tipo se deriva del esquema (una sola definición); permite transformar (normalizar el correo) y podría compartirse con el frontend | `class-validator` + `class-transformer` |
| D34 | **Login sin pistas para atacantes**: el mismo mensaje y el mismo tiempo de respuesta si el correo no existe o si la contraseña es incorrecta | No revelar qué correos están registrados, ni por el mensaje ni midiendo tiempos | Mensajes distintos ("correo no existe" / "contraseña incorrecta") |
| D35 | **El registro público siempre crea `CUSTOMER`**; los admin se crean con un **seed** | Si el registro aceptara un rol, cualquiera podría hacerse admin. El seed además deja lista la demo | Promover admins con SQL manual |
| D36 | **Módulo `security` separado de `auth`**: guards, decoradores y configuración del JWT | El control de acceso no necesita la base de usuarios. Separado, cualquier módulo (incluido `users`) puede usar los guards sin crear el ciclo `auth ⇄ users` (S de SOLID aplicada a módulos) | Perfil en `auth` (mezcla datos personales con credenciales); `forwardRef()` (tolera el ciclo en lugar de resolverlo) |
| D37 | **Endpoints `/users/me`**: el id del usuario sale siempre del token (`@CurrentUser`), nunca de la URL ni del cuerpo. El perfil se edita con PATCH parcial (al menos un campo); la dirección se puede cambiar pero no borrar | Nadie puede leer ni editar el perfil de otro, porque no hay forma de indicar "otro". La dirección es obligatoria para comprar (§6) | `/users/:id` con verificación de que `:id` sea el del token (más superficie de error) |
| D38 | **Seed (`npm run seed`) que reutiliza las piezas de la app**: arma el contenedor de DI sin servidor HTTP y usa `registerSchema`, `PasswordHasher` y `UsersService`. Es idempotente: si el admin existe, no lo modifica. También crea un **catálogo de demo** (3 categorías, 8 productos, uno desactivado y uno con stock 1) con `CategoriesService`, `ProductsService` y `createProductSchema`, solo si no hay categorías | DRY: el admin queda con la misma validación, normalización y costo de hash que cualquier usuario. Ejecutarlo dos veces no duplica nada | Script con `bcrypt` y Prisma directos (duplicaría reglas) |
| D39 | **Mensajes de validación de Zod en español** (`src/config/zod.ts`) | Los mensajes de la API llegan al usuario a través del frontend; así no se mezclan idiomas | Mensajes en inglés (por defecto) |
| D40 | **El admin ajusta el stock con un delta relativo** (`POST /products/:id/stock { delta }`) a través de `StockService`: `UPDATE stock = stock + delta` (si el delta es negativo, `WHERE stock >= \|delta\|`) | La suma es conmutativa: un ajuste del admin y el descuento de una compra simultánea dan el mismo resultado en cualquier orden. Fijar un valor absoluto (`stock = 50`) pisaría una reserva hecha entre la lectura del admin y su escritura (actualización perdida) | Fijar el valor con `PATCH`; fijarlo con control optimista (`expectedStock`, 409 si cambió) |
| D41 | **Catálogo paginado** (`?page&pageSize`, máximo en `business-rules.ts`) con filtro `?categoryId` | Escala con el catálogo; el filtro justifica la tabla de categorías (SUPUESTOS §9) | Devolver todos los productos |
| D42 | **El admin lista productos (incluidos inactivos) en `GET /admin/products`**, protegido con `@Roles(['ADMIN'])` dentro del módulo `products` | Explícito: cada endpoint tiene un solo comportamiento y reutiliza los guards existentes | Un solo `GET /products?includeInactive` con un guard "opcional" que cambia la respuesta según quién pregunta |
| D43 | **`POST /products` acepta el stock inicial** | Crear no es modificar: nadie puede comprar un producto que aún no existe, así que no hay carrera. Los cambios posteriores pasan por `StockService` (D5, D40) | Crear con stock 0 y ajustar después (dos llamadas) |
| D44 | **Desactivar y reactivar con `PATCH /products/:id { active }`** | `active` es un atributo más del producto; un solo endpoint, simétrico | `DELETE` que no borra (confuso); acciones `/activate` y `/deactivate` (dos endpoints) |
| D45 | **Precios como texto en JSON** (`"19990.00"`), validados positivos y con máximo 2 decimales | Los `number` de JavaScript son binarios (`0.1 + 0.2 ≠ 0.3`); la BD usa `Decimal(12,2)` | Precios como `number` |
| D46 | **Categorías: "nombre único" y "no borrar con productos" las garantiza la BD** (`UNIQUE` y FK `Restrict`); el repositorio traduce P2002/P2003/P2025 a errores del dominio (409/409/404). Los ids de la URL se validan como UUID con `idSchema` compartido (400) | Sin hueco entre "¿tiene productos?" y borrar. Mismo patrón que el correo duplicado y la orden abierta única (D19, D28) | Consultar antes de escribir en el service |
| D47 | **Todo endpoint de administración vive bajo `/admin/...`, en un controller propio** (`AdminCategoriesController`, `AdminProductsController`) con `@UseGuards(JwtGuard, RolesGuard)` y `@Roles(['ADMIN'])` **en la clase**. Los públicos quedan en el recurso (`/categories`, `/products`) | La URL dice quién puede usarla. Un endpoint nuevo de admin queda protegido aunque se olvide marcarlo. El controller público y el de admin cambian por razones distintas (S) | Rutas por recurso con `@Roles` en cada método (depende de no olvidarlo; el listado de admin quedaría como excepción) |
| D48 | **`products` no depende de `categories`**: al crear o editar un producto, la FK de `categoryId` rechaza una categoría inexistente (P2003) y el repositorio lo traduce a `InvalidCategoryError` (**400**: un dato del cuerpo es inválido, no el recurso de la URL) | Una sola consulta y sin hueco entre "¿existe la categoría?" y el insert (un admin podría borrarla en medio). Un módulo menos acoplado | Consultar antes a `CategoriesService.findById` (dependencia entre módulos y la FK igual sería necesaria) |
| D49 | **El carrito acepta más cantidad que el stock** y lo marca con un aviso (`INSUFFICIENT_STOCK`, o `UNAVAILABLE` si el producto se desactivó). Agregar un producto inactivo responde 404. Sumar cantidades usa un `UPDATE` condicional (máximo 99 por producto) | El carrito no reserva (§4) y lo excluido al confirmar se queda en él (§6): de todas formas debe tolerar el exceso. Una sola fuente de verdad: la confirmación atómica | Rechazar con 409 al agregar (no garantiza nada: el stock cambia un segundo después) |
| D50 | **Solo `CUSTOMER` tiene carrito** (`@Roles(['CUSTOMER'])` en `CartController`); el usuario sale del token | El admin gestiona, no compra. Nadie puede tocar el carrito de otro | Cualquier usuario autenticado (el admin podría crear órdenes) |
| D51 | **Dinero en centavos enteros** con un helper propio (`shared/money.ts`): `"19990.50"` → `1999050`, se opera con enteros y se vuelve a texto. Los totales del carrito son **estimados** con precios actuales y sin productos no disponibles | Exacto y explícito (~20 líneas, sin caja negra). `checkout` lo reutilizará para el total de la orden | `number` con decimales (`0.1 + 0.2 ≠ 0.3`); `Prisma.Decimal` (acopla los services a Prisma) |
| D52 | **Máquina de estados explícita** en `OrderService` (tabla `TRANSITIONS`: desde cada estado, a cuáles se puede pasar). Cada transición es un `UPDATE ... WHERE id = ? AND status = desde` que devuelve si se aplicó; una transición fuera de la tabla es un error de programación. La orden de otro cliente responde 404 | Las reglas de estado están en un solo lugar y se leen de un vistazo. La condición sobre el estado hace atómicas las transiciones: con doble clic o dos procesos, solo uno gana (capa 2 de §8). 404 en vez de 403 para no revelar que la orden existe | `if` repartidos en cada caso de uso; leer el estado y luego escribir (hueco entre ambos) |
| D53 | **El mock de pagos usa tarjetas de prueba**: `POST /checkout/orders/:id/pay { cardNumber }`; una tarjeta terminada en `0002` es rechazada, las demás aprobadas. El número nunca se guarda (solo `"tarjeta ****1234"`) | Como las pasarelas reales: el rechazo se puede demostrar a voluntad, en vivo | Rechazo aleatorio (no se controla en una demo) |
| D54 | **Recuperación de órdenes atascadas en `PROCESSING`** (el servidor cayó entre tomar la orden y cobrar): el job de expiración **consulta a la pasarela por la clave del intento** (`PaymentGateway.findCharge`), sin cobrar nada. Aprobado → `PAID`; rechazado o nunca recibido → `CANCELLED` + stock liberado. Se consulta en lugar de repetir el cobro porque el número de tarjeta no se guarda | Sin esto, la orden quedaría abierta para siempre y el cliente no podría volver a comprar (máximo 1 abierta, D19). Reutiliza la clave de idempotencia ya diseñada. **Limitación del mock:** guarda las claves en memoria, así que tras reiniciar las olvida; una pasarela real las conserva | Dejarlo como limitación documentada |
| D55 | **Job de expiración con `@nestjs/schedule`** (`@Interval`); la lógica vive en `CheckoutService`, el job solo la dispara | Paquete oficial, una línea explícita sobre el método. El job es un disparador más, como el cliente o el admin (§5, Cancelar) | `setInterval` propio con `onModuleInit`/`onModuleDestroy` |
| D56 | **Cada intento de pago es una fila de `payments`**, creada en `PENDING` **antes** de llamar a la pasarela y actualizada con el resultado (`SUCCEEDED`/`FAILED`; `REFUNDED` al reembolsar). Se guarda solo `"tarjeta ****1234"`. `PaymentsService` cobra, reembolsa y recupera; **no** toca estados de la orden | Si la pasarela no responde, queda la huella del intento (`PENDING`) para recuperarlo (D54). Los intentos usados se cuentan en la BD (máximo 3). El `UNIQUE (orderId, attempt)` impide dos cobros del mismo intento. Nunca se almacenan datos de tarjeta | Registrar el pago solo después de cobrar (si el servidor cae en medio, no queda rastro) |
| D57 | **La reserva bloquea los productos en orden de id** (`SELECT ... ORDER BY id FOR UPDATE`) y la liberación los recorre en el mismo orden | Si Ana bloquea A y luego B mientras Beto bloquea B y luego A, cada uno espera al otro para siempre (deadlock). Con un orden fijo, el segundo siempre espera al primero en la misma fila. Verificado: 8 compras simultáneas con los mismos dos productos, sin errores | Bloquear en el orden del carrito |
| D58 | **Capa 5 refinada**: si `PROCESSING → PAID` no se aplica, se relee la orden. Si ya está `PAID` (el job de recuperación se adelantó), no se hace nada; solo si está `CANCELLED` se reembolsa | Reembolsar a ciegas devolvería el dinero de una orden que sí quedó pagada | Reembolsar siempre que la transición falle |
| D59 | **Respuestas del pago**: siempre 200 con el estado de la orden (`PAID`, `PENDING` + motivo + intentos restantes, `CANCELLED` al tercer rechazo, `PROCESSING` si otra petición está cobrando). Sin respuesta de la pasarela → **503**; reembolso fallido → **502** | Un rechazo de tarjeta no es un error del sistema: es un resultado que el cliente debe ver (idempotencia, §8). 5xx solo cuando falla un sistema externo | 402/409 en cada rechazo |

---

## 7. Pendiente de decidir

_Nada por ahora._
