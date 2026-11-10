import { Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import type { PasswordHasher } from './password-hasher.js';

/**
 * Costo de bcrypt: 2^10 iteraciones. Más alto = más lento de atacar por
 * fuerza bruta, pero también más lento cada login. 10 es el valor habitual.
 */
const BCRYPT_ROUNDS = 10;

@Injectable()
export class BcryptPasswordHasher implements PasswordHasher {
  /** Hash de relleno para comparar cuando el usuario no existe (ver PasswordHasher.verify). */
  private readonly dummyHash = bcrypt.hashSync('dummy-password', BCRYPT_ROUNDS);

  hash(plain: string): Promise<string> {
    // bcrypt genera una "sal" aleatoria y la guarda dentro del mismo hash.
    return bcrypt.hash(plain, BCRYPT_ROUNDS);
  }

  async verify(plain: string, hash: string | null): Promise<boolean> {
    const matches = await bcrypt.compare(plain, hash ?? this.dummyHash);
    return hash !== null && matches;
  }
}
