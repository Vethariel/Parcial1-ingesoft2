// Validación de FORMA del carrito. Que el producto exista y esté activo es
// regla de negocio: la verifica CartService.
import { z } from 'zod';
import { CART_MAX_QUANTITY_PER_ITEM } from '../config/business-rules.js';
import { idSchema } from '../shared/id.schema.js';

const quantity = z.int().min(1).max(CART_MAX_QUANTITY_PER_ITEM);

export const addItemSchema = z.object({ productId: idSchema, quantity });
export type AddItemInput = z.infer<typeof addItemSchema>;

/** Para quitar un producto se usa DELETE, no cantidad 0. */
export const setQuantitySchema = z.object({ quantity });
export type SetQuantityInput = z.infer<typeof setQuantitySchema>;
