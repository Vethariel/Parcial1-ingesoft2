import type { Transaction } from '../shared/transaction.js';
import { InvalidOrderStateError, OrderNotFoundError } from './order.errors.js';
import type {
  OrderRepository,
  OrderToSave,
  StoredOrder,
} from './order.repository.js';
import { OrderService } from './order.service.js';

const tx = {} as Transaction;

const stored = (overrides: Partial<StoredOrder> = {}): StoredOrder => ({
  id: 'o-1',
  userId: 'ana',
  status: 'PENDING',
  total: '0.30',
  shippingAddress: 'Calle 5',
  createdAt: new Date('2026-11-12T10:00:00Z'),
  items: [],
  ...overrides,
});

/** Repositorio falso en memoria que imita el UPDATE condicional por estado. */
function createFakeRepository(initial: StoredOrder[] = []) {
  const byId = new Map(initial.map((o) => [o.id, { ...o }]));
  const saved: OrderToSave[] = [];
  const repository: OrderRepository = {
    create: (_tx, data) => {
      saved.push(data);
      const order = stored({ ...data, id: 'nueva' });
      byId.set(order.id, order);
      return Promise.resolve(order);
    },
    findById: (id) => Promise.resolve(byId.get(id) ?? null),
    findPage: () => Promise.reject(new Error('no usado')),
    findCreatedBefore: () => Promise.reject(new Error('no usado')),
    transition: (id, from, to) => {
      const order = byId.get(id);
      if (!order || order.status !== from) return Promise.resolve(false);
      order.status = to;
      return Promise.resolve(true);
    },
  };
  return { repository, saved };
}

describe('OrderService', () => {
  it('calcula el total en el servidor, exacto, a partir del snapshot', async () => {
    const { repository, saved } = createFakeRepository();
    const order = await new OrderService(repository).create(tx, {
      userId: 'ana',
      shippingAddress: 'Calle 5',
      items: [
        {
          productId: 'p-1',
          productName: 'Taza',
          unitPrice: '0.10',
          quantity: 2,
        },
        {
          productId: 'p-2',
          productName: 'Vaso',
          unitPrice: '0.10',
          quantity: 1,
        },
      ],
    });
    expect(saved[0].total).toBe('0.30');
    expect(order.items[0].subtotal).toBe('0.20');
  });

  it('la fecha límite de pago es createdAt + 5 minutos', async () => {
    const { repository } = createFakeRepository([stored()]);
    const order = await new OrderService(repository).findById('o-1');
    expect(order.paymentDeadline.toISOString()).toBe(
      '2026-11-12T10:05:00.000Z',
    );
  });

  it('la orden de otro usuario responde como inexistente', async () => {
    const { repository } = createFakeRepository([stored()]);
    await expect(
      new OrderService(repository).findForUser('beto', 'o-1'),
    ).rejects.toThrow(OrderNotFoundError);
  });

  it('rechaza transiciones que la máquina de estados no permite', () => {
    const service = new OrderService(createFakeRepository().repository);
    expect(() => service.transition('o-1', 'SHIPPED', 'CANCELLED')).toThrow(
      'Transición no permitida',
    );
    expect(() => service.transition('o-1', 'PENDING', 'PAID')).toThrow(
      'Transición no permitida',
    );
  });

  it('una transición solo se aplica si la orden sigue en el estado de origen', async () => {
    const { repository } = createFakeRepository([stored()]);
    const service = new OrderService(repository);
    expect(await service.transition('o-1', 'PENDING', 'PROCESSING')).toBe(true);
    // Segundo intento (p. ej. doble clic): ya no está PENDING.
    expect(await service.transition('o-1', 'PENDING', 'PROCESSING')).toBe(
      false,
    );
  });

  it('enviar exige que la orden esté PAID', async () => {
    const { repository } = createFakeRepository([
      stored(),
      stored({ id: 'o-2', status: 'PAID' }),
    ]);
    const service = new OrderService(repository);
    await expect(service.ship('o-1')).rejects.toThrow(InvalidOrderStateError);
    expect((await service.ship('o-2')).status).toBe('SHIPPED');
    await expect(service.ship('no-existe')).rejects.toThrow(OrderNotFoundError);
  });
});
