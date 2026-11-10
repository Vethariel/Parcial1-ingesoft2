import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type {
  AuthenticatedRequest,
  AuthenticatedUser,
} from './security.types.js';

/**
 * Entrega al controller el usuario que dejó JwtGuard en request.user:
 *   me(@CurrentUser() user: AuthenticatedUser)
 * Solo funciona en endpoints protegidos con JwtGuard.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!user) {
      throw new Error('@CurrentUser requiere JwtGuard en el endpoint');
    }
    return user;
  },
);
