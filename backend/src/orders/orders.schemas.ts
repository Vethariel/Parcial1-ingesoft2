import { z } from 'zod';
import { paginationSchema } from '../shared/pagination.js';

/** ?page&pageSize&status para el listado del admin. */
export const adminOrdersQuerySchema = paginationSchema.extend({
  status: z
    .enum(['PENDING', 'PROCESSING', 'PAID', 'SHIPPED', 'CANCELLED'])
    .optional(),
});
export type AdminOrdersQuery = z.infer<typeof adminOrdersQuerySchema>;
