import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ACCESS_TOKEN_TTL_SECONDS } from '../config/business-rules.js';
import { env } from '../config/env.js';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { BcryptPasswordHasher } from './bcrypt-password-hasher.js';
import { JwtGuard } from './jwt.guard.js';
import { PASSWORD_HASHER } from './password-hasher.js';
import { RolesGuard } from './roles.guard.js';

@Module({
  imports: [
    UsersModule,
    // Configura JwtService con la clave secreta y la duración del token.
    JwtModule.register({
      secret: env.jwtSecret,
      signOptions: { expiresIn: ACCESS_TOKEN_TTL_SECONDS },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtGuard,
    RolesGuard,
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
  ],
  // Otros módulos importan AuthModule para proteger sus endpoints con
  // @UseGuards(JwtGuard, RolesGuard). JwtGuard necesita JwtService, por eso
  // también se exporta JwtModule.
  exports: [JwtModule, JwtGuard, RolesGuard],
})
export class AuthModule {}
