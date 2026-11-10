// Errores del dominio de autenticación. No conocen HTTP (D28).

/**
 * Correo inexistente O contraseña incorrecta: el mismo error para ambos casos,
 * para no revelar qué correos están registrados.
 */
export class InvalidCredentialsError extends Error {
  constructor() {
    super('Credenciales inválidas');
    this.name = 'InvalidCredentialsError';
  }
}

/** Al cambiar la contraseña, la actual no coincide. */
export class WrongCurrentPasswordError extends Error {
  constructor() {
    super('La contraseña actual no es correcta');
    this.name = 'WrongCurrentPasswordError';
  }
}
