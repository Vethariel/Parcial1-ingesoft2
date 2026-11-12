import { ProductNotFoundError } from './product.errors.js';
import type { ProductRepository } from './product.repository.js';
import type { Product } from './product.types.js';
import { ProductsService } from './products.service.js';

const camisa: Product = {
  id: 'p-1',
  name: 'Camisa',
  description: 'Algodón',
  imageUrl: 'https://img.x/camisa.png',
  price: '19990.00',
  stock: 5,
  active: true,
  category: { id: 'c-1', name: 'Ropa' },
};
const descontinuado: Product = { ...camisa, id: 'p-2', active: false };

/** Repositorio falso: findPage registra el filtro que recibió. */
function createFakeRepository() {
  const findPage = vi.fn<ProductRepository['findPage']>((filter) =>
    Promise.resolve({
      items: [],
      total: 0,
      page: filter.page,
      pageSize: filter.pageSize,
    }),
  );
  const byId = new Map([camisa, descontinuado].map((p) => [p.id, p]));
  const repository: ProductRepository = {
    findPage,
    findById: (id) => Promise.resolve(byId.get(id) ?? null),
    create: () => Promise.reject(new Error('no usado')),
    update: () => Promise.reject(new Error('no usado')),
    adjustStock: () => Promise.reject(new Error('no usado')),
  };
  return { repository, findPage };
}

describe('ProductsService', () => {
  it('el catálogo público pide solo productos activos', async () => {
    const { repository, findPage } = createFakeRepository();
    await new ProductsService(repository).findCatalogPage({
      page: 1,
      pageSize: 20,
    });
    expect(findPage).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      onlyActive: true,
    });
  });

  it('el listado del admin incluye los desactivados', async () => {
    const { repository, findPage } = createFakeRepository();
    await new ProductsService(repository).findAdminPage({
      page: 2,
      pageSize: 10,
      categoryId: 'c-1',
    });
    expect(findPage).toHaveBeenCalledWith({
      page: 2,
      pageSize: 10,
      categoryId: 'c-1',
      onlyActive: false,
    });
  });

  it('el detalle público devuelve un producto activo', async () => {
    const { repository } = createFakeRepository();
    await expect(
      new ProductsService(repository).findActiveById('p-1'),
    ).resolves.toEqual(camisa);
  });

  it('un producto desactivado responde igual que uno inexistente', async () => {
    const service = new ProductsService(createFakeRepository().repository);
    await expect(service.findActiveById('p-2')).rejects.toThrow(
      ProductNotFoundError,
    );
    await expect(service.findActiveById('no-existe')).rejects.toThrow(
      ProductNotFoundError,
    );
  });
});
