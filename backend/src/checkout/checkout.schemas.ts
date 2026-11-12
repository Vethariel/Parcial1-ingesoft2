import { z } from 'zod';

/**
 * Datos de pago (D53). Se aceptan espacios o guiones ("4242 4242 ...") y se
 * quitan antes de validar. El número solo viaja a la pasarela: no se guarda.
 */
export const payOrderSchema = z.object({
  cardNumber: z
    .string()
    .transform((value) => value.replace(/[\s-]/g, ''))
    .pipe(z.string().regex(/^\d{12,19}$/, 'Número de tarjeta inválido')),
});
export type PayOrderInput = z.infer<typeof payOrderSchema>;
