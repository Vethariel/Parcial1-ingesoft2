import { MockPaymentGateway } from './mock-payment-gateway.js';
import type { PaymentGateway } from './payment-gateway.js';

const APPROVED_CARD = '4242424242424242';
const DECLINED_CARD = '4000000000000002';

/** El mock simula latencia; con temporizadores falsos la prueba no espera. */
async function run<T>(promise: Promise<T>): Promise<T> {
  await vi.runAllTimersAsync();
  return promise;
}

describe('MockPaymentGateway (contrato de PaymentGateway)', () => {
  let gateway: PaymentGateway;
  beforeEach(() => {
    vi.useFakeTimers();
    gateway = new MockPaymentGateway();
  });
  afterEach(() => vi.useRealTimers());

  it('aprueba una tarjeta válida y rechaza la de prueba terminada en 0002', async () => {
    const ok = await run(
      gateway.charge({
        idempotencyKey: 'o:1',
        amount: '10.00',
        cardNumber: APPROVED_CARD,
      }),
    );
    const ko = await run(
      gateway.charge({
        idempotencyKey: 'o:2',
        amount: '10.00',
        cardNumber: DECLINED_CARD,
      }),
    );
    expect(ok.status).toBe('APPROVED');
    expect(ko.status).toBe('DECLINED');
  });

  it('es idempotente: la misma clave devuelve el mismo cobro', async () => {
    const request = {
      idempotencyKey: 'o:1',
      amount: '10.00',
      cardNumber: APPROVED_CARD,
    };
    const first = await run(gateway.charge(request));
    const second = await run(gateway.charge(request));
    expect(second).toEqual(first);
  });

  it('findCharge devuelve null si la pasarela nunca recibió la clave', async () => {
    expect(await gateway.findCharge('nunca')).toBeNull();
    const result = await run(
      gateway.charge({
        idempotencyKey: 'o:1',
        amount: '10.00',
        cardNumber: APPROVED_CARD,
      }),
    );
    expect(await gateway.findCharge('o:1')).toEqual(result);
  });

  it('reembolsar un cobro inexistente falla', async () => {
    // Se observa la promesa ANTES de avanzar el reloj, para que su rechazo
    // no quede "sin manejar" mientras corren los temporizadores.
    const assertion = expect(gateway.refund('mock_ch_x')).rejects.toThrow();
    await vi.runAllTimersAsync();
    await assertion;
  });
});
