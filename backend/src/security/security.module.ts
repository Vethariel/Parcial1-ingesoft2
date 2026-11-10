import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ACCESS_TOKEN_TTL_SECONDS } from '../config/business-rules.js';
import { env } from '../config/env.js';
import { JwtGuard } from './jwt.guard.js';
import { RolesGuard } from './roles.guard.js';

/**
 * Control de acceso: el "portero" (D36).
 * Verifica tokens y roles; NO conoce la base de usuarios, por eso no depende
 * de ningún módulo de dominio y todos pueden importarlo sin crear ciclos.
 *
 * Uso en otro módulo:
 *   imports: [SecurityModule]
 *   @UseGuards(JwtGuard, RolesGuard) @Roles(['ADMIN'])
 */
@Module({
  imports: [
    // Configura JwtService con la clave secreta y la duración del token.
    JwtModule.register({
      secret: env.jwtSecret,
      signOptions: { expiresIn: ACCESS_TOKEN_TTL_SECONDS },
    }),
  ],
  providers: [JwtGuard, RolesGuard],
  // JwtModule se exporta porque JwtGuard necesita JwtService para verificar,
  // y auth lo necesita para firmar los tokens que emite.
  exports: [JwtModule, JwtGuard, RolesGuard],
})
export class SecurityModule {}
