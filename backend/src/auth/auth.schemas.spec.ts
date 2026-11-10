import { loginSchema, registerSchema } from './auth.schemas.js';

describe('registerSchema', () => {
  const valid = { name: 'Ana', email: 'ana@x.com', password: 'secreto123' };

  it('normaliza el correo: espacios y mayúsculas', () => {
    const result = registerSchema.parse({ ...valid, email: '  Ana@X.COM ' });

    expect(result.email).toBe('ana@x.com');
  });

  it('rechaza un correo con formato inválido', () => {
    expect(
      registerSchema.safeParse({ ...valid, email: 'no-es-correo' }).success,
    ).toBe(false);
  });

  it('rechaza contraseñas de menos de 8 caracteres', () => {
    expect(
      registerSchema.safeParse({ ...valid, password: '1234567' }).success,
    ).toBe(false);
  });

  it('rechaza contraseñas de más de 72 caracteres (límite de bcrypt)', () => {
    expect(
      registerSchema.safeParse({ ...valid, password: 'a'.repeat(73) }).success,
    ).toBe(false);
  });

  it('ignora un campo "role" enviado por el cliente', () => {
    const result = registerSchema.parse({ ...valid, role: 'ADMIN' });

    expect(result).not.toHaveProperty('role');
  });
});

describe('loginSchema', () => {
  it('normaliza el correo igual que el registro', () => {
    const result = loginSchema.parse({ email: 'ANA@x.com', password: 'x' });

    expect(result.email).toBe('ana@x.com');
  });
});
