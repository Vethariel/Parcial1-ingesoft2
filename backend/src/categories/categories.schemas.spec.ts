import { idSchema } from '../shared/id.schema.js';
import { categoryNameSchema } from './categories.schemas.js';

describe('categoryNameSchema', () => {
  it('recorta espacios del nombre', () => {
    expect(categoryNameSchema.parse({ name: '  Ropa  ' })).toEqual({
      name: 'Ropa',
    });
  });

  it('rechaza un nombre que solo tiene espacios', () => {
    expect(categoryNameSchema.safeParse({ name: '   ' }).success).toBe(false);
  });

  it('descarta campos extra (el id no se puede cambiar)', () => {
    expect(categoryNameSchema.parse({ name: 'Ropa', id: 'x' })).toEqual({
      name: 'Ropa',
    });
  });
});

describe('idSchema', () => {
  it('acepta un UUID', () => {
    expect(
      idSchema.safeParse('3f2504e0-4f89-41d3-9a0c-0305e82c3301').success,
    ).toBe(true);
  });

  it('rechaza algo que no es UUID (400 antes de consultar la BD)', () => {
    expect(idSchema.safeParse('123').success).toBe(false);
  });
});
