import {
  InsufficientStockError,
  ProductNotFoundError,
} from './product.errors.js';
import type { ProductRepository } from './product.repository.js';
import type { Product } from './product.types.js';
import { StockService } from './stock.service.js';

const camisa: Product = {
  id: 'p-1',
  name: 'Camisa',
  description: 'Algodón',
  imageUrl: 'https://img.x/camisa.png',
  price: '19990.00',
  stock: 10,
  active: true,
  category: { id: 'c-1', name: 'Ropa' },
};

/**
 * Repositorio falso en memoria que imita el UPDATE condicional:
 * solo aplica el ajuste si el resultado no queda negativo.
 */
function createFakeRepository(): ProductRepository {
  const byId = new Map([[camisa.id, { ...camisa }]]);
  return {
    findPage: () => Promise.reject(new Error('no usado')),
    findById: (id) => Promise.resolve(byId.get(id) ?? null),
    findByIds: () => Promise.reject(new Error('no usado')),
    create: () => Promise.reject(new Error('no usado')),
    update: () => Promise.reject(new Error('no usado')),
    adjustStock: (id, delta) => {
      const product = byId.get(id);
      if (!product || product.stock + delta < 0) return Promise.resolve(null);
      product.stock += delta;
      return Promise.resolve({ ...product });
    },
  };
}

describe('StockService.adjust', () => {
  it('suma unidades (llegó mercancía)', async () => {
    const stock = new StockService(createFakeRepository());
    expect((await stock.adjust('p-1', 40)).stock).toBe(50);
  });

  it('resta unidades mientras alcance, hasta dejarlo en 0', async () => {
    const stock = new StockService(createFakeRepository());
    expect((await stock.adjust('p-1', -10)).stock).toBe(0);
  });

  it('rechaza dejar el stock negativo e informa cuánto hay', async () => {
    const stock = new StockService(createFakeRepository());
    await expect(stock.adjust('p-1', -11)).rejects.toThrow(
      InsufficientStockError,
    );
    await expect(stock.adjust('p-1', -11)).rejects.toThrow('hay 10');
  });

  it('distingue un producto inexistente', async () => {
    const stock = new StockService(createFakeRepository());
    await expect(stock.adjust('no-existe', 5)).rejects.toThrow(
      ProductNotFoundError,
    );
  });
});
