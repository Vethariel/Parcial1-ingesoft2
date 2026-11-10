// Seed: crea el administrador inicial (D35). Uso: npm run seed
//
// Reutiliza las piezas de la app en lugar de duplicarlas (DRY):
//   - registerSchema   → misma validación y normalización del correo y la contraseña
//   - PasswordHasher   → mismo algoritmo y costo de hash que el registro
//   - UsersService     → misma forma de crear usuarios
//
// Es idempotente: ejecutarlo varias veces no duplica nada.
import './config/zod.js';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { registerSchema } from './auth/auth.schemas.js';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from './auth/password-hasher.js';
import { required } from './config/env.js';
import { UsersService } from './users/users.service.js';

async function seed(): Promise<void> {
  // Arma las piezas con el contenedor de DI, sin levantar el servidor HTTP.
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
  });

  try {
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
  } finally {
    await app.close();
  }
}

await seed();
