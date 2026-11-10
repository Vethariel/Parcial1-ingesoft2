import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../security/current-user.decorator.js';
import { JwtGuard } from '../security/jwt.guard.js';
import type { AuthenticatedUser } from '../security/security.types.js';
import { type PublicUser, toPublicUser } from './public-user.js';
import { UserNotFoundError } from './user.errors.js';
import {
  type UpdateProfileInput,
  updateProfileSchema,
} from './users.schemas.js';
import { UsersService } from './users.service.js';

/**
 * Perfil del usuario autenticado. "me" = el usuario del token: el id nunca
 * viene del cliente, así nadie puede leer ni editar el perfil de otro.
 */
@Controller('users/me')
@UseGuards(JwtGuard) // Portero en toda la clase: todos los endpoints exigen token.
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  async getProfile(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PublicUser> {
    try {
      return toPublicUser(await this.users.getProfile(user.id));
    } catch (error) {
      throw toHttpError(error);
    }
  }

  @Patch()
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body({ schema: updateProfileSchema }) input: UpdateProfileInput,
  ): Promise<PublicUser> {
    try {
      return toPublicUser(await this.users.updateProfile(user.id, input));
    } catch (error) {
      throw toHttpError(error);
    }
  }
}

/** Traduce los errores del dominio a HTTP (D28). */
function toHttpError(error: unknown): unknown {
  if (error instanceof UserNotFoundError) {
    return new NotFoundException(error.message); // 404
  }
  return error;
}
