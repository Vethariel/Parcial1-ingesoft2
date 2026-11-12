import type { CartService } from '../cart/cart.service.js';
import { InvalidOrderStateError } from '../orders/order.errors.js';
import type { OrderService } from '../orders/order.service.js';
import type { Order, OrderStatus } from '../orders/order.types.js';
import type { ChargeResult } from '../payments/payment-gateway.js';
import type { PaymentsService } from '../payments/payments.service.js';
import type { Reservation } from '../products/product.types.js';
import type { StockService } from '../products/stock.service.js';
import type { TransactionRunner } from '../shared/transaction.js';
import type { UsersService } from '../users/users.service.js';
import {
  EmptyCartError,
  MissingAddressError,
  NothingAvailableError,
  PaymentGatewayUnavailableError,
  PaymentWindowClosedError,
  RefundFailedError,
} from './checkout.errors.js';
import { CheckoutService } from './checkout.service.js';

const FUTURE = new Date(Date.now() + 60_000);
const PAST = new Date(Date.now() - 60_000);

const anOrder = (overrides: Partial<Order> = {}): Order => ({
  id: 'o-1',
  userId: 'ana',
  status: 'PENDING',
  total: '36000.00',
  shippingAddress: 'Calle 5',
  createdAt: new Date(),
  paymentDeadline: FUTURE,
  items: [
    {
      productId: 'p-1',
      productName: 'Taza',
      unitPrice: '18000.00',
      quantity: 2,
      subtotal: '36000.00',
    },
  ],
  ...overrides,
});

const reservation = (overrides: Partial<Reservation>): Reservation => ({
  productId: 'p-1',
  productName: 'Taza',
  unitPrice: '18000.00',
  requested: 2,
  reserved: 2,
  active: true,
  ...overrides,
});

/**
 * Arma CheckoutService con dependencias falsas. Las órdenes viven en un Map
 * y `transition` imita el UPDATE condicional por estado.
 */
function setup(
  options: {
    address?: string | null;
    cart?: { productId: string; quantity: number }[];
    reservations?: Reservation[];
    order?: Order;
    charge?: ChargeResult | 'network-error';
    attemptsUsed?: number;
    refundFails?: boolean;
    recover?: ChargeResult | null;
    extraOrders?: Order[];
  } = {},
) {
  const orders = new Map<string, Order>();
  if (options.order) orders.set(options.order.id, { ...options.order });
  for (const o of options.extraOrders ?? []) orders.set(o.id, { ...o });
  const cutoffs: Date[] = [];
  const calls = {
    charge: 0,
    refund: 0,
    released: [] as unknown[],
    removedFromCart: [] as unknown[],
    created: [] as unknown[],
  };
  let attempts = options.attemptsUsed ?? 0;

  const orderService = {
    create: (_tx: unknown, data: { items: unknown[] }) => {
      calls.created.push(data);
      const order = anOrder({ id: 'nueva' });
      orders.set(order.id, order);
      return Promise.resolve(order);
    },
    findById: (id: string) => Promise.resolve({ ...orders.get(id)! }),
    findForUser: (_user: string, id: string) =>
      Promise.resolve({ ...orders.get(id)! }),
    findCreatedBefore: (status: OrderStatus, before: Date) => {
      cutoffs.push(before);
      return Promise.resolve(
        [...orders.values()]
          .filter((o) => o.status === status)
          .map((o) => ({ ...o })),
      );
    },
    transition: (id: string, from: OrderStatus, to: OrderStatus) => {
      const order = orders.get(id);
      if (!order || order.status !== from) return Promise.resolve(false);
      order.status = to;
      return Promise.resolve(true);
    },
  } as unknown as OrderService;

  const payments = {
    recover: () => Promise.resolve(options.recover ?? null),
    attemptsUsed: () => Promise.resolve(attempts),
    charge: () => {
      calls.charge++;
      attempts++;
      return options.charge === 'network-error'
        ? Promise.reject(new Error('timeout'))
        : Promise.resolve(
            options.charge ?? { status: 'APPROVED', reference: 'ch' },
          );
    },
    refund: () => {
      calls.refund++;
      return options.refundFails
        ? Promise.reject(new Error('pasarela caída'))
        : Promise.resolve();
    },
  } as unknown as PaymentsService;

  const stock = {
    reserve: () => Promise.resolve(options.reservations ?? [reservation({})]),
    release: (_tx: unknown, lines: unknown) => {
      calls.released.push(lines);
      return Promise.resolve();
    },
  } as unknown as StockService;

  const cart = {
    getItems: () =>
      Promise.resolve(options.cart ?? [{ productId: 'p-1', quantity: 2 }]),
    removeOrdered: (_tx: unknown, _user: string, lines: unknown) => {
      calls.removedFromCart.push(lines);
      return Promise.resolve();
    },
  } as unknown as CartService;

  const users = {
    getProfile: () =>
      Promise.resolve({
        address: options.address === undefined ? 'Calle 5' : options.address,
      }),
  } as unknown as UsersService;

  // Transacción falsa: ejecuta el trabajo (el rollback real se prueba contra la BD).
  const transactions: TransactionRunner = { run: (work) => work({} as never) };

  const service = new CheckoutService(
    transactions,
    users,
    cart,
    stock,
    orderService,
    payments,
  );
  return { service, orders, calls, cutoffs };
}

describe('CheckoutService.confirm', () => {
  it('exige una dirección en el perfil', async () => {
    const { service } = setup({ address: null });
    await expect(service.confirm('ana')).rejects.toThrow(MissingAddressError);
  });

  it('rechaza un carrito vacío', async () => {
    const { service } = setup({ cart: [] });
    await expect(service.confirm('ana')).rejects.toThrow(EmptyCartError);
  });

  it('orden parcial: crea la orden con lo reservado e informa lo excluido', async () => {
    const { service, calls } = setup({
      reservations: [
        reservation({ productId: 'p-1', requested: 3, reserved: 2 }),
        reservation({ productId: 'p-2', productName: 'Lámpara', reserved: 0 }),
        reservation({
          productId: 'p-3',
          productName: 'Teclado',
          reserved: 0,
          active: false,
        }),
      ],
    });
    const result = await service.confirm('ana');
    expect(calls.created[0]).toMatchObject({
      items: [{ productId: 'p-1', quantity: 2, unitPrice: '18000.00' }],
    });
    expect(result.excluded.map((e) => [e.productId, e.reason])).toEqual([
      ['p-1', 'PARTIAL'],
      ['p-2', 'OUT_OF_STOCK'],
      ['p-3', 'UNAVAILABLE'],
    ]);
    // Del carrito sale solo lo que entró en la orden.
    expect(calls.removedFromCart).toEqual([
      [{ productId: 'p-1', quantity: 2 }],
    ]);
  });

  it('si nada está disponible no crea la orden', async () => {
    const { service, calls } = setup({
      reservations: [reservation({ reserved: 0 })],
    });
    await expect(service.confirm('ana')).rejects.toThrow(NothingAvailableError);
    expect(calls.created).toHaveLength(0);
  });
});

describe('CheckoutService.pay', () => {
  it('cobro aprobado: PENDING → PROCESSING → PAID', async () => {
    const { service, calls } = setup({ order: anOrder() });
    const result = await service.pay('ana', 'o-1', '4242424242424242');
    expect(result.order.status).toBe('PAID');
    expect(calls.charge).toBe(1);
  });

  it('idempotente: una orden ya pagada responde su estado sin cobrar', async () => {
    const { service, calls } = setup({ order: anOrder({ status: 'PAID' }) });
    const result = await service.pay('ana', 'o-1', '4242424242424242');
    expect(result.order.status).toBe('PAID');
    expect(calls.charge).toBe(0);
  });

  it('doble clic: si otra petición ya tomó la orden, no cobra', async () => {
    const { service, calls } = setup({
      order: anOrder({ status: 'PROCESSING' }),
    });
    const result = await service.pay('ana', 'o-1', '4242424242424242');
    expect(result.order.status).toBe('PROCESSING');
    expect(calls.charge).toBe(0);
  });

  it('fuera de la ventana de pago no cobra', async () => {
    const { service, calls } = setup({
      order: anOrder({ paymentDeadline: PAST }),
    });
    await expect(service.pay('ana', 'o-1', '4242424242424242')).rejects.toThrow(
      PaymentWindowClosedError,
    );
    expect(calls.charge).toBe(0);
  });

  it('rechazo: vuelve a PENDING y descuenta un intento', async () => {
    const { service } = setup({
      order: anOrder(),
      charge: { status: 'DECLINED', reason: 'Tarjeta rechazada' },
    });
    const result = await service.pay('ana', 'o-1', '4000000000000002');
    expect(result).toMatchObject({
      order: { status: 'PENDING' },
      declineReason: 'Tarjeta rechazada',
      attemptsLeft: 2,
    });
  });

  it('tercer rechazo: cancela la orden y libera el stock de inmediato', async () => {
    const { service, calls } = setup({
      order: anOrder(),
      attemptsUsed: 2,
      charge: { status: 'DECLINED', reason: 'Tarjeta rechazada' },
    });
    const result = await service.pay('ana', 'o-1', '4000000000000002');
    expect(result.order.status).toBe('CANCELLED');
    expect(result.attemptsLeft).toBe(0);
    expect(calls.released).toHaveLength(1);
  });

  it('si la pasarela no responde, la orden queda PROCESSING para el job (D54)', async () => {
    const { service, orders } = setup({
      order: anOrder(),
      charge: 'network-error',
    });
    await expect(service.pay('ana', 'o-1', '4242424242424242')).rejects.toThrow(
      PaymentGatewayUnavailableError,
    );
    expect(orders.get('o-1')!.status).toBe('PROCESSING');
  });

  it('una orden cancelada no se puede pagar', async () => {
    const { service } = setup({ order: anOrder({ status: 'CANCELLED' }) });
    await expect(service.pay('ana', 'o-1', '4242424242424242')).rejects.toThrow(
      InvalidOrderStateError,
    );
  });
});

describe('CheckoutService: cancelar', () => {
  it('el cliente cancela una orden PENDING y el stock se libera', async () => {
    const { service, calls } = setup({ order: anOrder() });
    const order = await service.cancelByCustomer('ana', 'o-1');
    expect(order.status).toBe('CANCELLED');
    expect(calls.released).toEqual([anOrder().items]);
    expect(calls.refund).toBe(0);
  });

  it('el cliente no puede cancelar mientras se cobra (PROCESSING)', async () => {
    const { service } = setup({ order: anOrder({ status: 'PROCESSING' }) });
    await expect(service.cancelByCustomer('ana', 'o-1')).rejects.toThrow(
      InvalidOrderStateError,
    );
  });

  it('el admin cancela una orden PAID: primero reembolsa', async () => {
    const { service, calls } = setup({ order: anOrder({ status: 'PAID' }) });
    const order = await service.cancelByAdmin('o-1');
    expect(order.status).toBe('CANCELLED');
    expect(calls.refund).toBe(1);
    expect(calls.released).toHaveLength(1);
  });

  it('si el reembolso falla, la orden NO se cancela (§6)', async () => {
    const { service, orders, calls } = setup({
      order: anOrder({ status: 'PAID' }),
      refundFails: true,
    });
    await expect(service.cancelByAdmin('o-1')).rejects.toThrow(
      RefundFailedError,
    );
    expect(orders.get('o-1')!.status).toBe('PAID');
    expect(calls.released).toHaveLength(0);
  });

  it('una orden enviada no se puede cancelar', async () => {
    const { service } = setup({ order: anOrder({ status: 'SHIPPED' }) });
    await expect(service.cancelByAdmin('o-1')).rejects.toThrow(
      InvalidOrderStateError,
    );
  });
});

describe('CheckoutService.expireOrders (job, D11 y D54)', () => {
  const now = new Date('2026-11-12T12:00:00Z');

  it('busca las órdenes creadas hace más de 10 minutos (ventana + gracia)', async () => {
    const { service, cutoffs } = setup();
    await service.expireOrders(now);
    expect(cutoffs[0].toISOString()).toBe('2026-11-12T11:50:00.000Z');
  });

  it('cancela las PENDING vencidas y libera su stock', async () => {
    const { service, orders, calls } = setup({ order: anOrder() });
    const summary = await service.expireOrders(now);
    expect(summary).toEqual({ cancelled: 1, recovered: 0, failed: 0 });
    expect(orders.get('o-1')!.status).toBe('CANCELLED');
    expect(calls.released).toHaveLength(1);
  });

  it('PROCESSING atascada con cobro aprobado en la pasarela → PAID, sin cobrar de nuevo', async () => {
    const { service, orders, calls } = setup({
      order: anOrder({ status: 'PROCESSING' }),
      recover: { status: 'APPROVED', reference: 'ch' },
    });
    const summary = await service.expireOrders(now);
    expect(summary.recovered).toBe(1);
    expect(orders.get('o-1')!.status).toBe('PAID');
    expect(calls.charge).toBe(0);
    expect(calls.released).toHaveLength(0);
  });

  it('PROCESSING atascada que la pasarela nunca recibió → se cancela', async () => {
    const { service, orders, calls } = setup({
      order: anOrder({ status: 'PROCESSING' }),
      recover: null,
    });
    const summary = await service.expireOrders(now);
    expect(summary.cancelled).toBe(1);
    expect(orders.get('o-1')!.status).toBe('CANCELLED');
    expect(calls.released).toHaveLength(1);
  });

  it('no toca órdenes PAID, SHIPPED ni CANCELLED', async () => {
    const { service, orders } = setup({
      extraOrders: [
        anOrder({ id: 'a', status: 'PAID' }),
        anOrder({ id: 'b', status: 'SHIPPED' }),
        anOrder({ id: 'c', status: 'CANCELLED' }),
      ],
    });
    expect(await service.expireOrders(now)).toEqual({
      cancelled: 0,
      recovered: 0,
      failed: 0,
    });
    expect([...orders.values()].map((o) => o.status)).toEqual([
      'PAID',
      'SHIPPED',
      'CANCELLED',
    ]);
  });
});
