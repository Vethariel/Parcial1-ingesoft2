import type { PublicUser } from '../users/public-user.js';

/** Respuesta de registro y login. */
export type AuthResult = {
  accessToken: string;
  user: PublicUser;
};
