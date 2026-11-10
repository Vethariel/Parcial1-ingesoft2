import { JwtService } from '@nestjs/jwt';
import { EmailAlreadyRegisteredError } from '../users/user.errors.js';
import type { NewUser, User } from '../users/user.types.js';
import type { UsersService } from '../users/users.service.js';
import {
  InvalidCredentialsError,
  WrongCurrentPasswordError,
} from './auth.errors.js';
import { AuthService } from './auth.service.js';
import type { TokenPayload } from './auth.types.js';
import type { PasswordHasher } from './password-hasher.js';

// ─── Piezas falsas ───────────────────────────────────────────────────────
// En la prueba, NOSOTROS hacemos de contenedor de DI: armamos AuthService a
// mano con piezas falsas, rápidas y sin base de datos.

/** Hasher falso: instantáneo y predecible ("abc" → "hashed:abc"). */
const fakeHasher: PasswordHasher = {
  hash: (plain) => Promise.resolve(`hashed:${plain}`),
  verify: (plain, hash) => Promise.resolve(hash === `hashed:${plain}`),
};

/** UsersService falso: guarda los usuarios en memoria. */
function createFakeUsers() {
  const byId = new Map<string, User>();
  let nextId = 1;
  const fake = {
    create: (data: NewUser) => {
      if ([...byId.values()].some((u) => u.email === data.email)) {
        return Promise.reject(new EmailAlreadyRegisteredError(data.email));
      }
      const user: User = { id: `user-${nextId++}`, address: null, ...data };
      byId.set(user.id, user);
      return Promise.resolve(user);
    },
    findByEmail: (email: string) =>
      Promise.resolve(
        [...byId.values()].find((u) => u.email === email) ?? null,
      ),
    findById: (id: string) => Promise.resolve(byId.get(id) ?? null),
    updatePasswordHash: (id: string, passwordHash: string) => {
      byId.set(id, { ...byId.get(id)!, passwordHash });
      return Promise.resolve();
    },
  };
  return { fake, byId };
}

const jwt = new JwtService({ secret: 'test-secret' });

function setup() {
  const users = createFakeUsers();
  const service = new AuthService(
    users.fake as unknown as UsersService,
    fakeHasher,
    jwt,
  );
  return { service, users };
}

const ana = { name: 'Ana', email: 'ana@x.com', password: 'secreto123' };

// ─── Pruebas ─────────────────────────────────────────────────────────────

describe('AuthService.register', () => {
  it('crea un CUSTOMER con la contraseña hasheada y devuelve un token válido', async () => {
    const { service, users } = setup();

    const result = await service.register(ana);

    const saved = users.byId.get(result.user.id)!;
    expect(saved.role).toBe('CUSTOMER');
    expect(saved.passwordHash).toBe('hashed:secreto123');
    const payload = await jwt.verifyAsync<TokenPayload>(result.accessToken);
    expect(payload).toMatchObject({ sub: saved.id, role: 'CUSTOMER' });
  });

  it('nunca expone el hash en la respuesta', async () => {
    const { service } = setup();

    const result = await service.register(ana);

    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('propaga EmailAlreadyRegisteredError si el correo ya existe', async () => {
    const { service } = setup();
    await service.register(ana);

    await expect(service.register(ana)).rejects.toThrow(
      EmailAlreadyRegisteredError,
    );
  });
});

describe('AuthService.login', () => {
  it('devuelve un token con las credenciales correctas', async () => {
    const { service } = setup();
    const registered = await service.register(ana);

    const result = await service.login({
      email: ana.email,
      password: ana.password,
    });

    expect(result.user.id).toBe(registered.user.id);
    expect(result.accessToken).toEqual(expect.any(String));
  });

  it('rechaza una contraseña incorrecta con InvalidCredentialsError', async () => {
    const { service } = setup();
    await service.register(ana);

    await expect(
      service.login({ email: ana.email, password: 'otra-clave' }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('rechaza un correo inexistente con el MISMO error (no revela qué correos existen)', async () => {
    const { service } = setup();

    await expect(
      service.login({ email: 'nadie@x.com', password: 'lo-que-sea' }),
    ).rejects.toThrow(InvalidCredentialsError);
  });
});

describe('AuthService.changePassword', () => {
  it('cambia la contraseña si la actual es correcta', async () => {
    const { service } = setup();
    const { user } = await service.register(ana);

    await service.changePassword(user.id, {
      currentPassword: 'secreto123',
      newPassword: 'nueva-clave-456',
    });

    await expect(
      service.login({ email: ana.email, password: 'nueva-clave-456' }),
    ).resolves.toBeDefined();
    await expect(
      service.login({ email: ana.email, password: 'secreto123' }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('rechaza el cambio si la contraseña actual es incorrecta', async () => {
    const { service, users } = setup();
    const { user } = await service.register(ana);

    await expect(
      service.changePassword(user.id, {
        currentPassword: 'adivinando',
        newPassword: 'nueva-clave-456',
      }),
    ).rejects.toThrow(WrongCurrentPasswordError);
    expect(users.byId.get(user.id)!.passwordHash).toBe('hashed:secreto123');
  });
});
