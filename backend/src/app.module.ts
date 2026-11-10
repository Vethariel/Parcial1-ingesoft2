import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module.js';

// Módulo raíz: aquí se registran los módulos de dominio
// (ver docs/ARQUITECTURA.md §4).
@Module({
  imports: [PrismaModule],
})
export class AppModule {}
