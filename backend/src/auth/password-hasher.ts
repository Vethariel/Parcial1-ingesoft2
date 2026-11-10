/**
 * Contrato para proteger contraseñas. auth depende de esta interfaz, no de
 * bcrypt: en las pruebas se usa un hasher falso e instantáneo.
 */
export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  /**
   * Compara una contraseña con un hash guardado.
   * Si hash es null (el usuario no existe), igual hace el trabajo de comparar
   * y devuelve false: así la respuesta tarda lo mismo exista o no el usuario,
   * y un atacante no puede deducir qué correos están registrados midiendo tiempos.
   */
  verify(plain: string, hash: string | null): Promise<boolean>;
}

export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');
