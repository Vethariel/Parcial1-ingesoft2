// Configuración global de Zod: mensajes de validación en español.
// Se importa al inicio de main.ts (y del seed) para que aplique a todos los
// esquemas antes de la primera validación.
import { z } from 'zod';

z.config(z.locales.es());
