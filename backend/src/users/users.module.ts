import { Module } from '@nestjs/common';
import { PrismaUserRepository } from './prisma-user.repository.js';
import { USER_REPOSITORY } from './user.repository.js';
import { UsersService } from './users.service.js';

@Module({
  providers: [
    UsersService,
    // "Cuando alguien pida USER_REPOSITORY, entrégale PrismaUserRepository".
    // En las pruebas, aquí se pone un repositorio falso.
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
  ],
  // Solo se exporta el service: el repositorio es un detalle interno del módulo.
  exports: [UsersService],
})
export class UsersModule {}
