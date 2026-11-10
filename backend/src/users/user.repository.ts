import type { NewUser, ProfileChanges, User } from './user.types.js';

/**
 * Contrato del repositorio de usuarios: QUÉ se puede pedir, en lenguaje del
 * negocio. La implementación (PrismaUserRepository) decide CÓMO.
 */
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  /** @throws EmailAlreadyRegisteredError si el correo ya existe. */
  create(data: NewUser): Promise<User>;
  updatePasswordHash(id: string, passwordHash: string): Promise<void>;
  /** @throws UserNotFoundError si el usuario no existe. */
  updateProfile(id: string, changes: ProfileChanges): Promise<User>;
}

/** Token de inyección: las interfaces no existen en tiempo de ejecución. */
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
