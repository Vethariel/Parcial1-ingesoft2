import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ProductsModule } from './products/products.module.js';
import { UsersModule } from './users/users.module.js';

// Módulo raíz: aquí se registran los módulos de dominio
// (ver docs/ARQUITECTURA.md §4).
@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    CategoriesModule,
    ProductsModule,
  ],
})
export class AppModule {}
