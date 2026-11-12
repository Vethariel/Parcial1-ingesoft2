import { z } from 'zod';

/**
 * Id recibido en la URL (p. ej. /categories/:id). Todos los ids son UUID:
 * si no tiene ese formato se responde 400 sin consultar la BD.
 * Compartido por todos los controllers (DRY).
 */
export const idSchema = z.uuid();
