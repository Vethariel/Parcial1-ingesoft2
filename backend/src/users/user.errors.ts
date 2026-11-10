// Errores del dominio de usuarios. No conocen HTTP: el controller decide
// qué código de respuesta corresponde a cada uno.

export class EmailAlreadyRegisteredError extends Error {
  constructor(email: string) {
    super(`El correo ${email} ya está registrado`);
    this.name = 'EmailAlreadyRegisteredError';
  }
}
