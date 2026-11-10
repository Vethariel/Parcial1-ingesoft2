import { Inject, Injectable } from '@nestjs/common';
import { UserNotFoundError } from './user.errors.js';
import { USER_REPOSITORY, type UserRepository } from './user.repository.js';
import type { NewUser, ProfileChanges, User } from './user.types.js';

/**
 * Punto de entrada al dominio de usuarios para otros módulos (p. ej. auth).
 * Los demás módulos usan este service, nunca el repositorio directamente.
 */
@Injectable()
export class UsersService {
  constructor(
    // @Inject(token): la interfaz no existe en ejecución, así que se pide por token.
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  findById(id: string): Promise<User | null> {
    return this.users.findById(id);
  }

  findByEmail(email: string): Promise<User | null> {
    return this.users.findByEmail(email);
  }

  /** @throws EmailAlreadyRegisteredError si el correo ya existe. */
  create(data: NewUser): Promise<User> {
    return this.users.create(data);
  }

  /** Recibe el hash ya calculado: users no conoce bcrypt (D30). */
  updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    return this.users.updatePasswordHash(id, passwordHash);
  }

  /** @throws UserNotFoundError si el usuario del token ya no existe. */
  async getProfile(id: string): Promise<User> {
    const user = await this.users.findById(id);
    if (!user) {
      throw new UserNotFoundError(id);
    }
    return user;
  }

  /** @throws UserNotFoundError si el usuario del token ya no existe. */
  updateProfile(id: string, changes: ProfileChanges): Promise<User> {
    return this.users.updateProfile(id, changes);
  }
}
