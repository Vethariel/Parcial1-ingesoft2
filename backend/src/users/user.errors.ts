// Errores del dominio de usuarios. No conocen HTTP: el controller decide
// qué código de respuesta corresponde a cada uno.

/**
 * El usuario del token ya no existe. Puede pasar porque un JWT sigue siendo
 * válido hasta que expira, aunque el usuario haya sido eliminado (D31).
 */
export class UserNotFoundError extends Error {
  constructor(id: string) {
    super(`No existe el usuario ${id}`);
    this.name = 'UserNotFoundError';
  }
}

export class EmailAlreadyRegisteredError extends Error {
  constructor(email: string) {
    super(`El correo ${email} ya está registrado`);
    this.name = 'EmailAlreadyRegisteredError';
  }
}
