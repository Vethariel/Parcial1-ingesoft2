import {
  catalogQuerySchema,
  createProductSchema,
  updateProductSchema,
} from './products.schemas.js';

const valid = {
  name: 'Camisa',
  description: 'Algodón',
  imageUrl: 'https://img.x/camisa.png',
  price: '19990.50',
  stock: 10,
  categoryId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
};

describe('createProductSchema', () => {
  it('acepta un producto válido', () => {
    expect(createProductSchema.safeParse(valid).success).toBe(true);
  });

  it.each(['0', '0.00', '-5', '10.999', '1e3', 'abc', '12345678901'])(
    'rechaza el precio %s',
    (price) => {
      expect(createProductSchema.safeParse({ ...valid, price }).success).toBe(
        false,
      );
    },
  );

  it('rechaza el precio como number (D45)', () => {
    expect(
      createProductSchema.safeParse({ ...valid, price: 19990 }).success,
    ).toBe(false);
  });

  it('rechaza stock negativo o con decimales', () => {
    expect(createProductSchema.safeParse({ ...valid, stock: -1 }).success).toBe(
      false,
    );
    expect(
      createProductSchema.safeParse({ ...valid, stock: 1.5 }).success,
    ).toBe(false);
  });

  it('rechaza URLs de imagen que no son http(s)', () => {
    expect(
      createProductSchema.safeParse({
        ...valid,
        imageUrl: 'javascript:alert(1)',
      }).success,
    ).toBe(false);
  });
});

describe('updateProductSchema', () => {
  it('descarta stock: solo se ajusta con StockService (D40)', () => {
    expect(updateProductSchema.safeParse({ stock: 50 }).success).toBe(false);
    expect(updateProductSchema.parse({ active: false, stock: 50 })).toEqual({
      active: false,
    });
  });

  it('rechaza un cuerpo vacío', () => {
    expect(updateProductSchema.safeParse({}).success).toBe(false);
  });
});

describe('catalogQuerySchema', () => {
  it('convierte los query params de texto a número y aplica valores por defecto', () => {
    expect(catalogQuerySchema.parse({ page: '3' })).toEqual({
      page: 3,
      pageSize: 20,
    });
  });

  it('rechaza un pageSize mayor al máximo', () => {
    expect(catalogQuerySchema.safeParse({ pageSize: '1000' }).success).toBe(
      false,
    );
  });
});
