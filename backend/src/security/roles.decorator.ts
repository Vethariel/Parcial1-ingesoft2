import { Reflector } from '@nestjs/core';
import type { Role } from '../users/user.types.js';

/**
 * Marca qué roles pueden usar un endpoint: @Roles(['ADMIN']).
 * Solo deja una "etiqueta"; quien la lee y decide es RolesGuard.
 */
export const Roles = Reflector.createDecorator<Role[]>();
