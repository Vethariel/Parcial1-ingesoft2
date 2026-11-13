import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { EmailAlreadyRegisteredError } from '../users/user.errors.js';
import {
  InvalidCredentialsError,
  WrongCurrentPasswordError,
} from './auth.errors.js';
import {
  type ChangePasswordInput,
  changePasswordSchema,
  type LoginInput,
  loginSchema,
  type RegisterInput,
  registerSchema,
} from './auth.schemas.js';
import { AuthService } from './auth.service.js';
import { CurrentUser } from '../security/current-user.decorator.js';
import { JwtGuard } from '../security/jwt.guard.js';
import type { AuthenticatedUser } from '../security/security.types.js';
import type { AuthResult } from './auth.types.js';

/**
 * El mesero de auth: valida la forma (Zod), delega al service y traduce los
 * errores del dominio a códigos HTTP (D28). Sin lógica de negocio.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(
    @Body({ schema: registerSchema }) input: RegisterInput,
  ): Promise<AuthResult> {
    try {
      return await this.auth.register(input);
    } catch (error) {
      if (error instanceof EmailAlreadyRegisteredError) {
        throw new ConflictException(error.message); // 409
      }
      throw error;
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK) // 200: el login no "crea" un recurso.
  async login(
    @Body({ schema: loginSchema }) input: LoginInput,
  ): Promise<AuthResult> {
    try {
      return await this.auth.login(input);
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        throw new UnauthorizedException(error.message); // 401
      }
      throw error;
    }
  }

  @Patch('password')
  @UseGuards(JwtGuard)
  @HttpCode(HttpStatus.NO_CONTENT) // 204: éxito, sin cuerpo de respuesta.
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body({ schema: changePasswordSchema }) input: ChangePasswordInput,
  ): Promise<void> {
    try {
      await this.auth.changePassword(user.id, input);
    } catch (error) {
      if (error instanceof WrongCurrentPasswordError) {
        // 400, NO 401: el usuario SÍ está autenticado (token válido); lo que
        // falla es un dato del formulario. 401 queda solo para "token ausente,
        // inválido o vencido", y el frontend lo usa para cerrar la sesión (D67).
        throw new BadRequestException(error.message); // 400
      }
      throw error;
    }
  }
}
