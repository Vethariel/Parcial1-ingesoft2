import { UserNotFoundError } from './user.errors.js';
import type { UserRepository } from './user.repository.js';
import type { User } from './user.types.js';
import { UsersService } from './users.service.js';

const ana: User = {
  id: 'user-1',
  name: 'Ana',
  email: 'ana@x.com',
  address: null,
  passwordHash: 'hash',
  role: 'CUSTOMER',
};

/** Repositorio falso en memoria: solo lo que estas pruebas usan. */
function createFakeRepository(initial: User[]): UserRepository {
  const byId = new Map(initial.map((u) => [u.id, { ...u }]));
  return {
    findById: (id) => Promise.resolve(byId.get(id) ?? null),
    findByEmail: () => Promise.reject(new Error('no usado')),
    create: () => Promise.reject(new Error('no usado')),
    updatePasswordHash: () => Promise.reject(new Error('no usado')),
    updateProfile: (id, changes) => {
      const user = byId.get(id);
      if (!user) return Promise.reject(new UserNotFoundError(id));
      // Igual que Prisma: los campos undefined no cambian.
      const updated = {
        ...user,
        name: changes.name ?? user.name,
        address: changes.address ?? user.address,
      };
      byId.set(id, updated);
      return Promise.resolve(updated);
    },
  };
}

describe('UsersService.getProfile', () => {
  it('devuelve el usuario si existe', async () => {
    const service = new UsersService(createFakeRepository([ana]));

    await expect(service.getProfile('user-1')).resolves.toMatchObject({
      email: 'ana@x.com',
    });
  });

  it('lanza UserNotFoundError si el usuario del token ya no existe', async () => {
    const service = new UsersService(createFakeRepository([]));

    await expect(service.getProfile('user-1')).rejects.toThrow(
      UserNotFoundError,
    );
  });
});

describe('UsersService.updateProfile', () => {
  it('cambia solo los campos enviados', async () => {
    const service = new UsersService(createFakeRepository([ana]));

    const updated = await service.updateProfile('user-1', {
      address: 'Calle 1 # 2-3',
    });

    expect(updated.address).toBe('Calle 1 # 2-3');
    expect(updated.name).toBe('Ana');
  });
});
