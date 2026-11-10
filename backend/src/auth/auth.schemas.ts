// Validación de FORMA de los datos de entrada (el mesero revisa que el pedido
// esté bien escrito). Las reglas de NEGOCIO (p. ej. correo ya registrado)
// viven en los services.
import { z } from 'zod';
import { PASSWORD_MIN_LENGTH } from '../config/business-rules.js';

/**
 * Correo normalizado ANTES de validar: "  Ana@X.com " → "ana@x.com".
 * Sin esto, Ana@x.com y ana@x.com serían dos usuarios distintos para el UNIQUE.
 */
const email = z.string().trim().toLowerCase().pipe(z.email());

/**
 * bcrypt solo considera los primeros 72 bytes: dos contraseñas que difieran
 * después de ese punto tendrían el mismo hash. Se limita para evitarlo.
 */
const newPassword = z.string().min(PASSWORD_MIN_LENGTH).max(72);

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email,
  password: newPassword,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email,
  // En el login no se exige el largo mínimo: solo se compara.
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword,
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
