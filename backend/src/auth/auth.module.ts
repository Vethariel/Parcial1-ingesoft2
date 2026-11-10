import { Module } from '@nestjs/common';
import { SecurityModule } from '../security/security.module.js';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { BcryptPasswordHasher } from './bcrypt-password-hasher.js';
import { PASSWORD_HASHER } from './password-hasher.js';

/**
 * Credenciales (D30): registro, login y cambio de contraseña.
 * Usa SecurityModule para firmar tokens y proteger PATCH /auth/password.
 */
@Module({
  imports: [UsersModule, SecurityModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
  ],
})
export class AuthModule {}
