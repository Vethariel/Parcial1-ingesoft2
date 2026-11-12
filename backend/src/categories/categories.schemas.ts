// Validación de FORMA para categorías. "Nombre único" es regla de negocio:
// la garantiza la BD (UNIQUE), no este esquema.
import { z } from 'zod';

/** Mismo esquema para crear y renombrar: la categoría solo tiene nombre. */
export const categoryNameSchema = z.object({
  name: z.string().trim().min(2).max(50),
});

export type CategoryNameInput = z.infer<typeof categoryNameSchema>;
