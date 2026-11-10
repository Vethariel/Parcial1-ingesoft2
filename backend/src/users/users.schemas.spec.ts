import { updateProfileSchema } from './users.schemas.js';

describe('updateProfileSchema', () => {
  it('acepta cambiar un solo campo', () => {
    expect(updateProfileSchema.safeParse({ name: 'Ana María' }).success).toBe(
      true,
    );
  });

  it('rechaza un cuerpo vacío', () => {
    expect(updateProfileSchema.safeParse({}).success).toBe(false);
  });

  it('descarta campos que no son del perfil (email, role, password)', () => {
    const result = updateProfileSchema.parse({
      name: 'Ana',
      email: 'otro@x.com',
      role: 'ADMIN',
      password: 'x',
    });

    expect(result).toEqual({ name: 'Ana' });
  });
});
