# Contexto

Proyecto académico: e-commerce simplificado con carrito y checkout.
Simula una entrevista técnica real. Se evalúa: buenas prácticas, SOLID, DRY,
sustentación (con cambios en vivo) y pruebas unitarias (opcional).

Mi objetivo NO es escribir el código, sino ENTENDER el sistema lo suficiente
para identificar qué cambiar, dónde y por qué, y darte instrucciones precisas.
Tú escribes el código; yo tomo las decisiones.

# Stack

- Backend: NestJS (TypeScript) + Prisma + PostgreSQL
- Frontend: React + Vite (TypeScript)
- Pruebas: Vitest

## Notas de NestJS 12

- La versión de NestJS (12) puede ser más nueva que lo que conoce el asistente.
  Documentación indexada: https://docs.nestjs.com/llms.txt (una página
  markdown por capítulo).
- El proyecto es ESM: los imports relativos terminan en `.js`, no existe
  `__dirname` (usar `import.meta.dirname`) y las pruebas usan Vitest
  (`vi.fn()`, no `jest.fn()`).
- Antes de agregar una librería o escribir algo propio, revisar si existe un
  paquete oficial de Nest: config (`@nestjs/config`), tareas programadas
  (`@nestjs/schedule`), autenticación (`@nestjs/authentication`), permisos
  (`@nestjs/authorization`), rate limiting (`@nestjs/throttler`),
  idempotencia (`@nestjs/idempotency`), OpenAPI (`@nestjs/swagger`), entre
  otros. Usarlo solo si respeta el principio "explícito sobre implícito"
  (docs/ARQUITECTURA.md §1); la lógica de negocio crítica no se delega a
  una caja negra.
- Validación: funciona con Zod/Valibot/ArkType (Standard Schema) mediante
  `StandardSchemaValidationPipe`, o con `class-validator` mediante
  `ValidationPipe`.
- npm 10.9.x tiene un bug al instalar las dependencias de esta plantilla
  (`Cannot read properties of null (reading 'edgesOut')`). Usar npm >= 11.

# Arquitectura

- Capas: controller → service → repository (vía Prisma). Sin lógica de negocio
  en controladores ni en el frontend.
- La lógica crítica vive en servicios: CheckoutService, StockService, OrderService.
- Dependencias externas detrás de interfaces (ej. PaymentGateway) e inyectadas
  con DI de NestJS. Nunca `new` de servicios.
- El backend es la fuente de verdad: precios, totales, stock y permisos se
  validan y calculan en el servidor, nunca se confía en el cliente.
- Stock: descuento atómico dentro de transacción (`stock >= cantidad` en la
  condición). Si la orden expira sin pago, se revierte (un pago rechazado
  permite reintentar dentro de la ventana).
- Las órdenes guardan el precio del momento de la compra (snapshot).
- Estados de orden explícitos: PENDING ⇄ PROCESSING → PAID → SHIPPED, o CANCELLED.
- Pagos idempotentes por orderId + intento (ver docs/SUPUESTOS.md §8).
- Constantes y reglas configurables en un solo lugar, no repartidas.

# Cómo trabajamos

## Antes de escribir código
- Explica en pocas líneas el enfoque y qué archivos vas a crear o modificar.
- Si hay una decisión de diseño real, preséntame 2-3 opciones con sus
  trade-offs y espera a que elija. No decidas por mí.
- Si mi instrucción es ambigua o contradice la arquitectura, pregunta antes
  de asumir.

## Al escribir código
- Haz exactamente el cambio pedido. No refactorices, renombres ni "mejores"
  nada fuera del alcance sin preguntarme.
- Pasos pequeños: un cambio coherente a la vez.
- No dupliques lógica: si algo ya existe, reutilízalo y dime dónde está.
- Código simple y legible antes que ingenioso.

## Después de cada cambio
- Lista los archivos que tocaste y, para cada uno, qué cambió y por qué.
- Señala qué capa(s) afectó el cambio y si tiene efectos en otras partes
  (ej. migración de BD, cambios en DTOs, pantallas afectadas).
- Indica qué principio SOLID/DRY aplica, si es relevante.
- Menciona casos borde que no se cubrieron.
- Sugiere la prueba que verificaría el cambio.

## Cuando te pida explicaciones
- Explica el flujo siguiendo el código real (archivo y función), no en abstracto.
- Si te pregunto "¿qué pasa si…?", responde primero sin modificar código.

# Documentación viva

Mantén actualizado `docs/ARQUITECTURA.md` con:
- Mapa de módulos: responsabilidad, archivos principales, dependencias.
- Flujo de una compra de punta a punta (endpoint → guard → controller →
  service → transacción → pago → orden → respuesta).
- Registro de decisiones de diseño y su justificación.

Actualízalo cada vez que un cambio altere la estructura o una decisión.

# Git

- Un commit por cambio coherente, con mensaje descriptivo en español.
- No hagas commit sin que yo haya revisado el diff.
