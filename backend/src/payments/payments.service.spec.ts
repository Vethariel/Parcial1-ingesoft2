import type { ChargeResult, PaymentGateway } from './payment-gateway.js';
import type { PaymentRepository } from './payment.repository.js';
import type { Payment } from './payment.types.js';
import { PaymentsService } from './payments.service.js';

/** Repositorio falso en memoria. */
function createFakeRepository(): PaymentRepository & { rows: Payment[] } {
  const rows: Payment[] = [];
  return {
    rows,
    countByOrder: (orderId) =>
      Promise.resolve(rows.filter((p) => p.orderId === orderId).length),
    findByOrder: (orderId) =>
      Promise.resolve(rows.filter((p) => p.orderId === orderId)),
    create: (data) => {
      const row: Payment = {
        ...data,
        id: `pay-${rows.length + 1}`,
        status: 'PENDING',
        externalReference: null,
      };
      rows.push(row);
      return Promise.resolve(row);
    },
    saveResult: (id, result) => {
      Object.assign(
        rows.find((p) => p.id === id)!,
        {
          status: result.status,
          externalReference: result.externalReference ?? null,
        },
      );
      return Promise.resolve();
    },
  };
}

/** Pasarela falsa: responde lo que se le indique y registra las claves. */
function createFakeGateway(result: ChargeResult | null) {
  const keys: string[] = [];
  const refunds: string[] = [];
  const gateway: PaymentGateway = {
    charge: (req) => {
      keys.push(req.idempotencyKey);
      return result
        ? Promise.resolve(result)
        : Promise.reject(new Error('timeout de red'));
    },
    findCharge: (key) => {
      keys.push(key);
      return Promise.resolve(result);
    },
    refund: (reference) => {
      refunds.push(reference);
      return Promise.resolve();
    },
  };
  return { gateway, keys, refunds };
}

const input = {
  orderId: 'o-1',
  attempt: 1,
  amount: '36000.00',
  cardNumber: '4242424242424242',
};
const approved: ChargeResult = { status: 'APPROVED', reference: 'ch_1' };

describe('PaymentsService', () => {
  it('registra el intento con la tarjeta enmascarada y la clave orderId:intento', async () => {
    const repo = createFakeRepository();
    const { gateway, keys } = createFakeGateway(approved);
    await new PaymentsService(repo, gateway).charge(input);
    expect(keys).toEqual(['o-1:1']);
    expect(repo.rows[0]).toMatchObject({
      method: 'tarjeta ****4242',
      status: 'SUCCEEDED',
      externalReference: 'ch_1',
    });
    expect(JSON.stringify(repo.rows)).not.toContain('4242424242424242');
  });

  it('un rechazo queda registrado como FAILED', async () => {
    const repo = createFakeRepository();
    const { gateway } = createFakeGateway({ status: 'DECLINED', reason: 'x' });
    await new PaymentsService(repo, gateway).charge(input);
    expect(repo.rows[0].status).toBe('FAILED');
  });

  it('si la pasarela no responde, el intento queda PENDING (lo recupera el job)', async () => {
    const repo = createFakeRepository();
    const { gateway } = createFakeGateway(null);
    await expect(
      new PaymentsService(repo, gateway).charge(input),
    ).rejects.toThrow('timeout');
    expect(repo.rows[0].status).toBe('PENDING');
  });

  it('recover consulta por la clave del intento pendiente y guarda el resultado', async () => {
    const repo = createFakeRepository();
    await repo.create({ ...input, method: 'tarjeta ****4242' });
    const { gateway, keys } = createFakeGateway(approved);
    expect(await new PaymentsService(repo, gateway).recover('o-1')).toEqual(
      approved,
    );
    expect(keys).toEqual(['o-1:1']);
    expect(repo.rows[0].status).toBe('SUCCEEDED');
  });

  it('recover devuelve null y marca FAILED si la pasarela nunca recibió el cobro', async () => {
    const repo = createFakeRepository();
    await repo.create({ ...input, method: 'tarjeta ****4242' });
    const { gateway } = createFakeGateway(null);
    expect(await new PaymentsService(repo, gateway).recover('o-1')).toBeNull();
    expect(repo.rows[0].status).toBe('FAILED');
  });

  it('refund usa la referencia del cobro aprobado y lo marca REFUNDED', async () => {
    const repo = createFakeRepository();
    const { gateway, refunds } = createFakeGateway(approved);
    const service = new PaymentsService(repo, gateway);
    await service.charge(input);
    await service.refund('o-1');
    expect(refunds).toEqual(['ch_1']);
    expect(repo.rows[0].status).toBe('REFUNDED');
  });
});
