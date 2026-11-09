# Supuestos y alcance

Base de las decisiones de diseño. Cada supuesto incluye su justificación.
Si un supuesto cambia, se actualiza aquí primero y luego el código.

_Última actualización: 2026-11-09_

---

## 1. Actores

| Actor | Puede | No puede |
|---|---|---|
| **Visitante** (sin sesión) | Ver catálogo y detalle, armar carrito anónimo | Confirmar compra |
| **Cliente** | Todo lo del visitante + carrito persistido, comprar, ver sus órdenes, editar perfil | Gestionar inventario |
| **Administrador** (dueño de la tienda) | CRUD de productos, control de stock, gestión de órdenes | **Comprar** |

**Justificación:** el administrador no compra para mantener los registros de ventas limpios y los roles separados (separación de responsabilidades).

## 2. Catálogo

- Público y de solo lectura, sin login.
- **Justificación:** reduce la fricción de compra y permite que tanto personas como agentes automatizados consulten productos.
- **Trabajo futuro:** optimización específica para agentes de IA (datos estructurados, endpoints dedicados).

## 3. Perfil de usuario

Campos editables: nombre, dirección y contraseña.

## 4. Carrito

- **Sin sesión:** el carrito vive en el navegador (localStorage).
- **Con sesión:** el carrito se persiste en la BD, ligado a la cuenta.
- **Al iniciar sesión:** gana el carrito guardado. El anónimo **no se pierde**: se le ofrece al usuario re-agregar esos productos (reutiliza el endpoint de "agregar al carrito", sin lógica nueva en el backend).
- **El carrito NO reserva stock.** Tener un producto en el carrito no garantiza disponibilidad al pagar.

**Justificación:** no se pisa ni se pierde información del usuario y la fusión se resuelve en la interfaz.

## 5. Pagos

- Pasarela **simulada**, detrás de una interfaz `PaymentGateway`.
- Pasarela real (Stripe, PayU, etc.) solo si hay tiempo.

**Justificación:** como la pasarela puede cambiar, el checkout depende de la abstracción y no de la implementación (principio de inversión de dependencias, la D de SOLID).

## 6. Stock y reservas

Flujo:

```
"Confirmar compra" → descuento atómico de stock + orden PENDING
        ↓
Página de pago → "Pagar" → PROCESSING (atómico, antes de cobrar)
                              → pago OK        → PAID
                              → pago rechazado → PENDING (puede reintentar)
               → no paga a tiempo              → CANCELLED + stock devuelto (por expiración)
```

Estados de orden: `PENDING ⇄ PROCESSING → PAID → SHIPPED`, o `CANCELLED`.

- **Reintentos:** si el pago es rechazado, la orden vuelve a `PENDING` y el cliente puede reintentar **dentro de la misma ventana de 5 min** (no se reinicia).
- **Justificación:** un error de tipeo en la tarjeta no debe hacerle perder la reserva al cliente.
- **Consecuencia:** el stock solo se libera por expiración, no por un pago rechazado.
- **Máximo 3 intentos** de pago por orden (constante configurable). Al agotarlos, la orden pasa a `CANCELLED` y el stock se libera **de inmediato** (sin esperar la expiración), para no bloquear a otros compradores. **Justificación:** protección contra *card testing* (probar tarjetas robadas en la tienda).

- La reserva empieza **al confirmar la compra**, no al agregar al carrito.
- **Aviso preventivo:** al ver el carrito se marcan los productos sin stock suficiente. Es solo informativo: **no reemplaza** la verificación atómica al confirmar.
- **Orden parcial:** si al confirmar algún producto no tiene stock, la orden `PENDING` se crea **solo con lo disponible** y la respuesta indica qué se excluyó. El cliente ve el cambio antes de pagar y puede **cancelar** la orden (`PENDING → CANCELLED` + stock liberado). **Justificación:** se prioriza la facilidad para el cliente; lo disponible queda reservado y no se pierde mientras decide.
  - **Disponibilidad parcial:** si pide 3 y hay 2, se reservan las 2.
  - **Nada disponible:** no se crea la orden y se responde "sin stock".
  - **Carrito tras confirmar:** lo que entró en la orden sale del carrito. Lo excluido (o la cantidad faltante) **se queda** en el carrito, con el mensaje *"Estos productos se mantienen en tu carrito. Revisa su disponibilidad más adelante."* No se promete notificación.
- **Cancelación por el admin:** puede cancelar órdenes `PENDING` o `PAID`. Si estaba `PAID`, se **reembolsa** (usando la referencia externa del cobro) y se libera el stock. Si el reembolso falla, la orden **no** se cancela. Las órdenes `SHIPPED` **no** se pueden cancelar.
- **Las transacciones nunca esperan una decisión humana:** mientras están abiertas, las filas quedan bloqueadas y los demás compradores esperan.
- **Ventana de pago:** 5 minutos.
- **Liberación de stock:** a los 10 minutos (5 min de gracia).
- Máximo **1 orden `PENDING` por usuario**. Si ya tiene una e intenta confirmar otra, **se rechaza** ("tienes un pago pendiente").
- Los tiempos y límites son constantes configurables en un solo lugar.

**Justificación de reservar antes de cobrar (en lugar de cobrar y luego descontar):**
lo que se deshace ante un fallo es un número en nuestra propia BD (barato, inmediato y bajo nuestro control), no dinero en un sistema externo (lento, con comisiones y que también puede fallar).

**Costo aceptado:** el stock de una orden abandonada queda bloqueado hasta 10 min, y otros clientes lo ven como "reservado".

## 7. Concurrencia (última unidad)

Como se reserva **lo disponible** (orden parcial, §6), no basta con saber "si alcanza": hay que saber **cuánto hay**. Por eso se lee y se bloquea la fila en un solo paso:

```sql
SELECT stock FROM product WHERE id = :id FOR UPDATE   -- lee y BLOQUEA la fila
-- reservado = min(stock, cantidad pedida)
UPDATE product SET stock = stock - :reservado WHERE id = :id
```

- `FOR UPDATE` bloquea la fila **desde la lectura**: la primera transacción la toma y la segunda **espera** hasta el `COMMIT`, y luego lee el stock ya actualizado.
- Sin `FOR UPDATE`, ambas leerían el mismo valor antes de que alguna escriba y venderían de más.
- **Nuestro código** (`StockService`) decide cuánto reservar: `reservado = 0` significa "sin stock" para ese producto.
- No existe el "empate perfecto": la BD serializa. No se implementa desempate.
- Todo ocurre dentro de la transacción de confirmación, que dura milisegundos.

## 8. Protección del pago

### Principio: idempotencia

Pagar una orden N veces debe producir **un solo cobro**.

- Una petición repetida **no recibe error**: recibe el **estado actual de la orden** (`PAID`, o "en proceso" si la primera aún no termina).
- **Justificación:** al cliente le importa el estado de su orden, no cuántas veces hizo clic. Un error lo confundiría.

### Capas

| Capa | Regla | Evita |
|---|---|---|
| 1. Antes de cobrar | Validar: la orden es del usuario, está `PENDING` y sigue dentro de los 5 min. Si no, se rechaza **sin cobrar**. El monto sale de la orden guardada, nunca del cliente. | Cobrar órdenes vencidas, ajenas o ya pagadas |
| 2. Tomar la orden | Transición `PENDING → PROCESSING` atómica (`WHERE status = 'PENDING'`) **antes de cobrar**. Si afecta 0 filas, no se cobra y se responde el estado actual. | Doble clic o peticiones duplicadas |
| 3. Clave de idempotencia | `PaymentGateway.charge(clave, monto)` con clave = `orderId + número de intento`: la pasarela garantiza un solo cobro por clave. Es parte del **contrato** de la interfaz: toda implementación (mock o real) debe cumplirlo. | Reintentos por timeout o fallos de red dentro de un mismo intento |
| 4. Gracia | La liberación ocurre a los 10 min, no a los 5. | Que un pago iniciado a tiempo choque con la liberación |
| 5. Después de cobrar | Transición `PROCESSING → PAID` atómica. Si afecta 0 filas: **reembolso** vía `PaymentGateway`. | El caso residual en que el pago termina después de la liberación |

### Responsables

| Servicio | Rol en el pago |
|---|---|
| `CheckoutService` | Orquesta: valida, toma la orden, cobra, confirma y reembolsa si es necesario |
| `OrderService` | Dueño de los estados: transiciones atómicas que devuelven si se lograron |
| `PaymentGateway` | Cobro y reembolso, idempotentes por `orderId` |
| `StockService` | No participa en el pago (el stock se reservó al confirmar) |

**Principio aplicado:** responsabilidad única (la S de SOLID). `CheckoutService` sabe *cuándo* cambiar un estado, `OrderService` sabe *cómo*.

## 9. Modelo de dominio

```
Usuario ──1:1── Carrito ──1:N── ItemCarrito ──N:1── Producto ──N:1── Categoría
   │                                                    ▲
   └──1:N── Orden ──1:N── DetalleOrden ─────────────────┘
              │
              └──1:N── Cobro   (varios fallidos, máximo 1 exitoso)
```

| Entidad | Campos | Notas |
|---|---|---|
| **Usuario** | id, nombre, correo, dirección, hash de contraseña, rol | Correo único. Contraseña con hash (bcrypt), nunca en texto plano. Rol: `CUSTOMER` / `ADMIN` |
| **Categoría** | id, nombre | Gestionada por el admin |
| **Producto** | id, nombre, descripción, URL de foto, precio, stock, activo, categoría | Stock y precio aquí, no en una tabla aparte |
| **Carrito** | id, usuario, creado, actualizado | Fechas para analizar carritos abandonados |
| **ItemCarrito** | carrito, producto, cantidad | Combinación carrito+producto única |
| **Orden** | id, usuario, estado, total, dirección de envío, creado | Total y dirección son snapshot |
| **DetalleOrden** | orden, producto, nombre, precio unitario, cantidad | Nombre y precio son snapshot |
| **Cobro** | id, orden, intento, monto, método, estado, referencia externa | La referencia externa permite reembolsar |

### Decisiones

- **Stock y precio en `Producto`** (no en una tabla `Inventario`). Con una sola bodega, separarlo solo agrega un *join*. La separación de responsabilidades se logra en el código: solo `StockService` modifica `stock`. SOLID aplica a módulos, no a tablas.
- **Categoría como tabla** (no enum). El admin las gestiona sin tocar código y hay una sola fuente de verdad (DRY). Permite filtros en el catálogo.
- **No se puede borrar una categoría con productos** (activos o desactivados): el admin debe reasignarlos primero.
- **`Carrito` + `ItemCarrito`** (no solo items): el carrito tiene datos propios (fechas) útiles para análisis.
- **Soft delete de productos** (`activo = false`): no se pierde el historial de órdenes. El catálogo solo muestra activos y la confirmación rechaza productos inactivos.
- **Snapshot en la orden** (precio, nombre, total, dirección): la orden es un registro histórico inmutable. Si después cambian el producto o el perfil, la orden no cambia.
- **Total guardado** (desnormalización justificada): se calcula una vez en el servidor al crear la orden y nunca cambia, así que no puede desincronizarse del detalle.
- **Montos como `Decimal`** (o enteros en centavos), nunca `float`.
- **Varios cobros por orden, máximo 1 exitoso:** cada reintento es un cobro nuevo y la idempotencia garantiza que no haya dos cobros exitosos.

## 10. Pendiente de decidir (fase de diseño)


- Órdenes atascadas en `PROCESSING` (p. ej. el servidor se cae a mitad del pago): recuperación reintentando el cobro con el mismo `orderId`, que es seguro gracias a la clave de idempotencia.

## 11. Fuera de alcance

- Optimización para agentes de IA.
- Pasarela de pago real (salvo que haya tiempo).
- Devoluciones de órdenes ya enviadas (`SHIPPED`).
- Notificaciones de "volvió el stock" (requiere entidad de suscripción, detección y servicio de correo).
- Envíos, impuestos, cupones y descuentos.
