import type { User } from './user.types.js';

/** Lo que se puede mostrar de un usuario fuera del backend: nunca el hash. */
export type PublicUser = Omit<User, 'passwordHash'>;

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    address: user.address,
    role: user.role,
  };
}
