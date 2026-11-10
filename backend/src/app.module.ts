import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module.js';
import { UsersModule } from './users/users.module.js';

// Módulo raíz: aquí se registran los módulos de dominio
// (ver docs/ARQUITECTURA.md §4).
@Module({
  imports: [PrismaModule, UsersModule],
})
export class AppModule {}
