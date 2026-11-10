// Validación de FORMA para el perfil. La contraseña NO está aquí: se cambia
// en PATCH /auth/password (D30).
import { z } from 'zod';

/**
 * PATCH parcial: cada campo es opcional, pero debe venir al menos uno.
 * La dirección se puede cambiar, no borrar: es obligatoria para comprar (§6).
 */
export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    address: z.string().trim().min(5).max(200).optional(),
  })
  .refine((data) => data.name !== undefined || data.address !== undefined, {
    message: 'Debe enviar al menos un campo: name o address',
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
