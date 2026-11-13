// Validación de FORMA del carrito. Que el producto exista y esté activo es
// regla de negocio: la verifica CartService.
import { z } from 'zod';
import {
  CART_MAX_QUANTITY_PER_ITEM,
  CART_QUOTE_MAX_LINES,
} from '../config/business-rules.js';
import { idSchema } from '../shared/id.schema.js';

const quantity = z.int().min(1).max(CART_MAX_QUANTITY_PER_ITEM);

export const addItemSchema = z.object({ productId: idSchema, quantity });
export type AddItemInput = z.infer<typeof addItemSchema>;

/** Para quitar un producto se usa DELETE, no cantidad 0. */
export const setQuantitySchema = z.object({ quantity });
export type SetQuantityInput = z.infer<typeof setQuantitySchema>;

/**
 * Cotización del carrito anónimo (D68): las líneas que el navegador tiene
 * guardadas. Sin productos repetidos y con un máximo de líneas.
 */
export const quoteSchema = z.object({
  items: z
    .array(addItemSchema)
    .max(CART_QUOTE_MAX_LINES)
    .refine(
      (items) => new Set(items.map((i) => i.productId)).size === items.length,
      'Un producto no puede aparecer dos veces',
    ),
});
export type QuoteInput = z.infer<typeof quoteSchema>;
