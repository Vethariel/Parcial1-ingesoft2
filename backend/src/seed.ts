// Seed: crea el administrador inicial (D35) y un catálogo de demostración.
// Uso: npm run seed
//
// Reutiliza las piezas de la app en lugar de duplicarlas (DRY, D38):
//   - registerSchema      → misma validación y normalización del correo y la contraseña
//   - PasswordHasher      → mismo algoritmo y costo de hash que el registro
//   - UsersService        → misma forma de crear usuarios
//   - createProductSchema → misma validación que el endpoint del admin
//   - CategoriesService / ProductsService → misma forma de crear el catálogo
//
// Es idempotente: ejecutarlo varias veces no duplica nada.
import './config/zod.js';
import type { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { registerSchema } from './auth/auth.schemas.js';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from './auth/password-hasher.js';
import { CategoriesService } from './categories/categories.service.js';
import { required } from './config/env.js';
import type { NewProduct } from './products/product.types.js';
import { createProductSchema } from './products/products.schemas.js';
import { ProductsService } from './products/products.service.js';
import { UsersService } from './users/users.service.js';

async function seedAdmin(app: INestApplicationContext): Promise<void> {
  const admin = registerSchema.parse({
    name: process.env.ADMIN_NAME ?? 'Administrador',
    email: required('ADMIN_EMAIL'),
    password: required('ADMIN_PASSWORD'),
  });

  const users = app.get(UsersService);
  const existing = await users.findByEmail(admin.email);
  if (existing) {
    // No se modifica: ni la contraseña ni el rol (si fuera un CUSTOMER con
    // ese correo, promoverlo debe ser una decisión consciente, no del seed).
    console.log(
      `Admin: ${admin.email} ya existe (rol ${existing.role}); no se modifica.`,
    );
    return;
  }

  // strict: false → busca el provider en cualquier módulo (PASSWORD_HASHER
  // vive en AuthModule y no se exporta).
  const hasher = app.get<PasswordHasher>(PASSWORD_HASHER, { strict: false });
  await users.create({
    name: admin.name,
    email: admin.email,
    passwordHash: await hasher.hash(admin.password),
    role: 'ADMIN',
  });
  console.log(`Admin: ${admin.email} creado.`);
}

/** Productos de demostración, agrupados por categoría. */
const DEMO_CATALOG: Record<
  string,
  Omit<NewProduct, 'categoryId' | 'imageUrl'>[]
> = {
  Ropa: [
    {
      name: 'Camiseta básica',
      description: 'Camiseta de algodón, cuello redondo.',
      price: '35000',
      stock: 25,
    },
    {
      name: 'Jean clásico',
      description: 'Jean de corte recto, tela resistente.',
      price: '120000',
      stock: 10,
    },
    // Stock 1: sirve para demostrar que dos clientes no pueden comprar la última unidad.
    {
      name: 'Chaqueta impermeable',
      description: 'Chaqueta liviana para lluvia.',
      price: '210000',
      stock: 1,
    },
  ],
  Hogar: [
    {
      name: 'Taza de cerámica',
      description: 'Taza de 350 ml, apta para microondas.',
      price: '18000',
      stock: 40,
    },
    {
      name: 'Lámpara de escritorio',
      description: 'Lámpara LED con brazo ajustable.',
      price: '89000',
      stock: 0,
    },
  ],
  Tecnología: [
    {
      name: 'Audífonos inalámbricos',
      description: 'Bluetooth, 20 horas de batería.',
      price: '159900.50',
      stock: 8,
    },
    {
      name: 'Mouse ergonómico',
      description: 'Mouse inalámbrico vertical.',
      price: '75000',
      stock: 15,
    },
    {
      name: 'Teclado mecánico',
      description: 'Descontinuado: aparece solo para el admin.',
      price: '250000',
      stock: 3,
    },
  ],
};

/** Producto que se crea desactivado para demostrar el soft delete (D44). */
const DEMO_INACTIVE = 'Teclado mecánico';

/**
 * Catálogo de demostración. Solo se crea si no hay categorías: si ya hay
 * datos (de una demo anterior o creados por el admin) no se tocan.
 */
async function seedCatalog(app: INestApplicationContext): Promise<void> {
  const categories = app.get(CategoriesService);
  if ((await categories.findAll()).length > 0) {
    console.log('Catálogo: ya hay categorías; no se crea la demo.');
    return;
  }

  const products = app.get(ProductsService);
  let count = 0;
  for (const [categoryName, items] of Object.entries(DEMO_CATALOG)) {
    const category = await categories.create(categoryName);
    for (const item of items) {
      // Se valida con el mismo esquema que usa el endpoint del admin (DRY).
      const data = createProductSchema.parse({
        ...item,
        categoryId: category.id,
        imageUrl: `https://picsum.photos/seed/${encodeURIComponent(item.name)}/400/300`,
      });
      const product = await products.create(data);
      if (item.name === DEMO_INACTIVE) {
        await products.update(product.id, { active: false });
      }
      count++;
    }
  }
  console.log(
    `Catálogo: ${Object.keys(DEMO_CATALOG).length} categorías y ${count} productos creados.`,
  );
}

// Arma las piezas con el contenedor de DI una sola vez, sin servidor HTTP.
const app = await NestFactory.createApplicationContext(AppModule, {
  logger: ['error'],
});
try {
  await seedAdmin(app);
  await seedCatalog(app);
} finally {
  await app.close();
}
