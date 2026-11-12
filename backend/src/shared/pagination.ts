import { z } from 'zod';
import { PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX } from '../config/business-rules.js';

/**
 * ?page=1&pageSize=20 (D41). Los query params llegan como texto:
 * z.coerce los convierte a número antes de validar.
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGE_SIZE_MAX)
    .default(PAGE_SIZE_DEFAULT),
});

export type Pagination = z.infer<typeof paginationSchema>;

/** Respuesta paginada: los elementos de la página y el total para calcular cuántas hay. */
export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};
