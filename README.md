# Tienda: e-commerce con carrito y checkout

Proyecto académico: un e-commerce simplificado con catálogo, carrito, checkout con pago simulado y panel de administración.

El foco está en la corrección del backend:
- El stock nunca queda negativo, ni siquiera con compras simultáneas.
- Un pago no se cobra dos veces aunque se envíe dos veces.
- Las órdenes guardan el precio del momento de la compra.
- El servidor es la única fuente de verdad de precios, totales, stock y permisos.

| Capa | Tecnología |
|---|---|
| Backend | NestJS 12 (TypeScript, ESM) · Prisma 7 · PostgreSQL 17 · Zod · JWT |
| Frontend | React 19 · Vite 8 · React Router 8 · Tailwind CSS 4 |
| Pruebas | Vitest (112 pruebas unitarias en el backend) |

## Requisitos

- **Node.js 24** y **npm 11 o superior**. Con npm 10.9.x, la instalación del backend falla (`Cannot read properties of null (reading 'edgesOut')`); se actualiza con `npm install -g npm@11`.
- **Podman** (con `podman-compose`) o **Docker**, para la base de datos.

## Puesta en marcha

Todos los comandos se ejecutan desde la raíz del repositorio, salvo donde se indica otra carpeta.

### 1. Variables de entorno

```bash
cp .env.example .env
```

Edita `.env` y cambia al menos:
- `JWT_SECRET`: una clave larga y aleatoria. En `.env.example` está el comando para generarla.
- `ADMIN_PASSWORD`: la contraseña del administrador inicial, de mínimo 8 caracteres.

### 2. Base de datos

```bash
podman-compose up -d        # o: docker compose up -d
```

Levanta PostgreSQL 17 en el puerto `5432`, con los datos en un volumen persistente.

### 3. Backend (puerto 3000)

```bash
cd backend
npm install
npx prisma migrate deploy   # crea las tablas, restricciones e índices
npx prisma generate         # genera el cliente de Prisma (src/generated/)
npm run seed                # admin inicial + catálogo de demostración
npm run start:dev
```

El seed es idempotente: ejecutarlo de nuevo no duplica nada. Crea:
- **El administrador**, con `ADMIN_EMAIL` / `ADMIN_PASSWORD` del `.env`.
- **El catálogo de demostración:** 3 categorías y 8 productos, entre ellos uno agotado, uno con la **última unidad** (para demostrar la carrera por el stock) y uno desactivado.

### 4. Frontend (puerto 5173)

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

Abre **http://localhost:5173**. En desarrollo, Vite reenvía `/api/*` al backend, así que no hace falta configurar CORS.

## Probar la tienda

| Para… | Haz… |
|---|---|
| Comprar como cliente | Regístrate, agrega tu dirección en **Perfil**, llena el carrito y **Confirma la compra** |
| Pagar | Tarjeta `4242 4242 4242 4242`: **aprobada**. Tarjeta `4000 0000 0000 0002`: **rechazada** (máximo 3 intentos) |
| Ver la ventana de pago | Tras confirmar tienes **5 minutos** para pagar. Si no pagas, el stock se libera a los 10 minutos (lo hace un job que corre cada minuto) |
| Administrar | Inicia sesión con el admin del `.env` y entra a **Admin**: productos, stock, categorías y órdenes |

La pasarela de pago es **simulada**: el número de tarjeta nunca se guarda.

## Comandos útiles

| Carpeta | Comando | Qué hace |
|---|---|---|
| `backend/` | `npm test` | Pruebas unitarias (Vitest) |
| `backend/` | `npm run lint` | Linter (oxlint) |
| `backend/` | `npm run build` | Compila a `dist/` |
| `backend/` | `npx prisma studio` | Explorador visual de la base de datos |
| `frontend/` | `npm run build` | Verifica tipos y genera `dist/` |
| `frontend/` | `npm run lint` | Linter (oxlint) |

## Estructura

```
├── backend/            API NestJS (un módulo por dominio)
│   ├── prisma/         schema.prisma y migraciones
│   └── src/            auth, security, users, categories, products, cart,
│                       orders, payments, checkout, expirations, prisma, config, shared
├── frontend/           SPA React (una carpeta por dominio, espejo del backend)
├── docs/
│   ├── ENUNCIADO.txt       el enunciado del proyecto
│   ├── SUPUESTOS.md        reglas de negocio y su justificación
│   └── ARQUITECTURA.md     módulos, flujo de una compra y registro de decisiones (D1–D69)
└── docker-compose.yml  PostgreSQL
```

Para entender el diseño, conviene leer los documentos en este orden:
1. `docs/SUPUESTOS.md`: el *qué* y el *por qué* del negocio.
2. `docs/ARQUITECTURA.md`: §4 (módulos), §5 (flujo de una compra) y §6 (decisiones).

## Problemas frecuentes

| Síntoma | Causa y solución |
|---|---|
| El backend termina al arrancar con un error de conexión | La base de datos no está levantada. Ejecuta el paso 2. La app falla a propósito si no hay BD, en lugar de arrancar a medias |
| `Falta la variable de entorno obligatoria: …` | Falta `.env` en la raíz, o le falta esa variable. Ejecuta el paso 1 |
| `Cannot find module '…/generated/prisma/…'` | Falta generar el cliente: `cd backend && npx prisma generate` |
| Las imágenes del catálogo no cargan | Vienen de `picsum.photos` y necesitan internet. Sin conexión, cada producto muestra su inicial |
| `Port 5173 is already in use` | Ya hay otro `npm run dev` corriendo. Ciérralo o usa la URL que indique Vite |
