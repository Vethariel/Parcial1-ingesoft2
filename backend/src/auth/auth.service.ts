import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { toPublicUser } from '../users/public-user.js';
import type { User } from '../users/user.types.js';
import { UsersService } from '../users/users.service.js';
import {
  InvalidCredentialsError,
  WrongCurrentPasswordError,
} from './auth.errors.js';
import type {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
} from './auth.schemas.js';
import type { AuthResult, TokenPayload } from './auth.types.js';
import { PASSWORD_HASHER, type PasswordHasher } from './password-hasher.js';

/**
 * Dueño de las credenciales (D30): registro, login y cambio de contraseña.
 * Los datos de la persona (nombre, dirección) son responsabilidad de users.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Registro público: el rol es SIEMPRE CUSTOMER. Los admin se crean con el seed.
   * @throws EmailAlreadyRegisteredError
   */
  async register(input: RegisterInput): Promise<AuthResult> {
    const passwordHash = await this.hasher.hash(input.password);
    const user = await this.users.create({
      name: input.name,
      email: input.email,
      passwordHash,
      role: 'CUSTOMER',
    });
    return this.issueToken(user);
  }

  /** @throws InvalidCredentialsError (correo inexistente o contraseña incorrecta) */
  async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.users.findByEmail(input.email);
    // verify() compara incluso si el usuario no existe (tiempo constante).
    const valid = await this.hasher.verify(
      input.password,
      user?.passwordHash ?? null,
    );
    if (!user || !valid) {
      throw new InvalidCredentialsError();
    }
    return this.issueToken(user);
  }

  /**
   * Exige la contraseña actual: si alguien encuentra la sesión abierta,
   * no puede quitarle la cuenta al dueño.
   * @throws WrongCurrentPasswordError
   */
  async changePassword(
    userId: string,
    input: ChangePasswordInput,
  ): Promise<void> {
    const user = await this.users.findById(userId);
    const valid = await this.hasher.verify(
      input.currentPassword,
      user?.passwordHash ?? null,
    );
    if (!user || !valid) {
      throw new WrongCurrentPasswordError();
    }
    const newHash = await this.hasher.hash(input.newPassword);
    await this.users.updatePasswordHash(user.id, newHash);
  }

  /** Una sola forma de emitir tokens, para registro y login (DRY). */
  private async issueToken(user: User): Promise<AuthResult> {
    const payload: TokenPayload = { sub: user.id, role: user.role };
    return {
      accessToken: await this.jwt.signAsync(payload),
      user: toPublicUser(user),
    };
  }
}
