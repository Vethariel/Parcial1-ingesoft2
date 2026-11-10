import { Module } from '@nestjs/common';
import { SecurityModule } from '../security/security.module.js';
import { PrismaUserRepository } from './prisma-user.repository.js';
import { USER_REPOSITORY } from './user.repository.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({
  // SecurityModule: para proteger /users/me con JwtGuard (sin ciclo, D36).
  imports: [SecurityModule],
  controllers: [UsersController],
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
