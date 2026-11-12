import { ProductNotFoundError } from '../products/product.errors.js';
import type { Product } from '../products/product.types.js';
import type { ProductsService } from '../products/products.service.js';
import { CartQuantityLimitError } from './cart.errors.js';
import type { CartRepository } from './cart.repository.js';
import { CartService } from './cart.service.js';

const base: Product = {
  id: '',
  name: '',
  description: 'x',
  imageUrl: 'https://img.x/p.png',
  price: '0',
  stock: 0,
  active: true,
  category: { id: 'c-1', name: 'Ropa' },
};
const camisa = {
  ...base,
  id: 'p-1',
  name: 'Camisa',
  price: '19990.50',
  stock: 10,
};
const taza = { ...base, id: 'p-2', name: 'Taza', price: '0.10', stock: 1 };
const teclado = {
  ...base,
  id: 'p-3',
  name: 'Teclado',
  price: '100',
  stock: 5,
  active: false,
};
const catalog = new Map([camisa, taza, teclado].map((p) => [p.id, p]));

/** ProductsService falso: solo los dos métodos que usa el carrito. */
const products = {
  findByIds: (ids: string[]) =>
    Promise.resolve(ids.flatMap((id) => catalog.get(id) ?? [])),
  findActiveById: (id: string) => {
    const p = catalog.get(id);
    return p?.active
      ? Promise.resolve(p)
      : Promise.reject(new ProductNotFoundError(id));
  },
} as unknown as ProductsService;

/** Repositorio falso en memoria con un solo usuario. */
function createFakeRepository(
  initial: Record<string, number> = {},
): CartRepository {
  const items = new Map(Object.entries(initial));
  return {
    findItems: () =>
      Promise.resolve(
        [...items].map(([productId, quantity]) => ({ productId, quantity })),
      ),
    addItem: (_user, productId, quantity, max) => {
      const next = (items.get(productId) ?? 0) + quantity;
      if (next > max) return Promise.resolve(false);
      items.set(productId, next);
      return Promise.resolve(true);
    },
    setQuantity: (_user, productId, quantity) =>
      Promise.resolve(items.has(productId) && !!items.set(productId, quantity)),
    removeItem: (_user, productId) => Promise.resolve(items.delete(productId)),
  };
}

describe('CartService', () => {
  it('un carrito sin productos tiene total 0.00 y sin avisos', async () => {
    const cart = await new CartService(
      createFakeRepository(),
      products,
    ).getCart('u');
    expect(cart).toEqual({ items: [], total: '0.00', hasWarnings: false });
  });

  it('calcula subtotales y total exactos con precios actuales', async () => {
    const service = new CartService(
      createFakeRepository({ 'p-1': 2 }),
      products,
    );
    const cart = await service.getCart('u');
    expect(cart.items[0].subtotal).toBe('39981.00');
    expect(cart.total).toBe('39981.00');
  });

  it('acepta más cantidad que el stock, pero lo avisa (D49)', async () => {
    const service = new CartService(createFakeRepository(), products);
    const cart = await service.addItem('u', 'p-2', 3);
    expect(cart.items[0]).toMatchObject({
      quantity: 3,
      warning: 'INSUFFICIENT_STOCK',
    });
    expect(cart.total).toBe('0.30'); // 0.10 × 3 sin errores de decimales
    expect(cart.hasWarnings).toBe(true);
  });

  it('un producto desactivado en el carrito se marca y no suma al total', async () => {
    const service = new CartService(
      createFakeRepository({ 'p-1': 1, 'p-3': 1 }),
      products,
    );
    const cart = await service.getCart('u');
    expect(cart.items.map((l) => [l.product.name, l.warning])).toEqual([
      ['Camisa', null],
      ['Teclado', 'UNAVAILABLE'],
    ]);
    expect(cart.total).toBe('19990.50');
  });

  it('no deja agregar un producto desactivado', async () => {
    const service = new CartService(createFakeRepository(), products);
    await expect(service.addItem('u', 'p-3', 1)).rejects.toThrow(
      ProductNotFoundError,
    );
  });

  it('suma la cantidad si el producto ya estaba, hasta el máximo', async () => {
    const service = new CartService(
      createFakeRepository({ 'p-1': 90 }),
      products,
    );
    await expect(service.addItem('u', 'p-1', 10)).rejects.toThrow(
      CartQuantityLimitError,
    );
    const cart = await service.addItem('u', 'p-1', 9);
    expect(cart.items[0].quantity).toBe(99);
  });
});
