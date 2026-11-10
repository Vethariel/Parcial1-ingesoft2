import type { Request } from 'express';
import type { Role } from '../users/user.types.js';

/** Contenido del JWT. Es LEGIBLE por cualquiera: nunca poner datos sensibles. */
export type TokenPayload = {
  /** "subject": el id del usuario (nombre estándar en JWT). */
  sub: string;
  role: Role;
};

/** Quién hace la petición, según el token ya verificado. */
export type AuthenticatedUser = {
  id: string;
  role: Role;
};

/** Petición HTTP después de pasar por JwtGuard. */
export type AuthenticatedRequest = Request & { user?: AuthenticatedUser };
