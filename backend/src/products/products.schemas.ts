// Validación de FORMA para productos. Que la categoría exista es una regla
// que garantiza la BD (FK, D48), no este esquema.
import { z } from 'zod';
import { idSchema } from '../shared/id.schema.js';
import { paginationSchema } from '../shared/pagination.js';

/** Límite técnico de la columna INT de PostgreSQL (no es una regla de negocio). */
const PG_INT_MAX = 2_147_483_647;

/**
 * Precio como texto (D45): positivo, máximo 2 decimales y hasta 10 dígitos
 * enteros (la columna es Decimal(12,2)). Ej.: "19990" o "19990.50".
 */
const price = z
  .string()
  .trim()
  .regex(
    /^\d{1,10}(\.\d{1,2})?$/,
    'Precio inválido: use un número con hasta 2 decimales, p. ej. "19990.50"',
  )
  .refine((value) => Number(value) > 0, 'El precio debe ser mayor que 0');

const fields = {
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().min(1).max(2000),
  // Solo http(s): la URL termina en un <img src> del frontend.
  imageUrl: z.url({ protocol: /^https?$/ }),
  price,
  categoryId: idSchema,
};

export const createProductSchema = z.object({
  ...fields,
  stock: z.int().min(0).max(PG_INT_MAX), // stock inicial (D43)
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

/**
 * PATCH parcial: cada campo es opcional, pero debe venir al menos uno.
 * `stock` NO se acepta aquí (se descarta): se ajusta con StockService (D40).
 */
export const updateProductSchema = z
  .object({
    name: fields.name.optional(),
    description: fields.description.optional(),
    imageUrl: fields.imageUrl.optional(),
    price: fields.price.optional(),
    categoryId: fields.categoryId.optional(),
    active: z.boolean().optional(), // desactivar / reactivar (D44)
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message:
      'Debe enviar al menos un campo: name, description, imageUrl, price, categoryId o active',
  });
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

/** ?page&pageSize&categoryId (D41). */
export const catalogQuerySchema = paginationSchema.extend({
  categoryId: idSchema.optional(),
});
export type CatalogQueryInput = z.infer<typeof catalogQuerySchema>;
