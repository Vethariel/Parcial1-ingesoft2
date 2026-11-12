import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CategoryInUseError,
  CategoryNameTakenError,
  CategoryNotFoundError,
} from './category.errors.js';
import type { CategoryRepository } from './category.repository.js';
import type { Category } from './category.types.js';

/** Código de Prisma para "violación de restricción UNIQUE". */
const UNIQUE_VIOLATION = 'P2002';
/** Código de Prisma para "violación de llave foránea" (FK con Restrict). */
const FOREIGN_KEY_VIOLATION = 'P2003';
/** Código de Prisma para "el registro a modificar no existe". */
const RECORD_NOT_FOUND = 'P2025';

// La fila de Prisma ya tiene exactamente la forma del dominio ({ id, name }),
// así que se seleccionan solo esos campos en lugar de mapear.
const select = { id: true, name: true } as const;

@Injectable()
export class PrismaCategoryRepository implements CategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<Category[]> {
    return this.prisma.category.findMany({ select, orderBy: { name: 'asc' } });
  }

  async create(name: string): Promise<Category> {
    try {
      return await this.prisma.category.create({ data: { name }, select });
    } catch (error) {
      throw translate(error, { name });
    }
  }

  async rename(id: string, name: string): Promise<Category> {
    try {
      return await this.prisma.category.update({
        where: { id },
        data: { name },
        select,
      });
    } catch (error) {
      throw translate(error, { id, name });
    }
  }

  async delete(id: string): Promise<void> {
    try {
      // No se pregunta antes "¿tiene productos?": la FK con Restrict hace que
      // la BD rechace el borrado. Así no hay hueco entre leer y borrar
      // (un admin podría crear un producto en esa categoría justo en medio).
      await this.prisma.category.delete({ where: { id } });
    } catch (error) {
      throw translate(error, { id });
    }
  }
}

/** Traduce los errores de Prisma a errores del dominio (el service no conoce Prisma). */
function translate(error: unknown, ctx: { id?: string; name?: string }): unknown {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return error;
  }
  if (error.code === UNIQUE_VIOLATION && ctx.name !== undefined) {
    return new CategoryNameTakenError(ctx.name);
  }
  if (error.code === RECORD_NOT_FOUND && ctx.id !== undefined) {
    return new CategoryNotFoundError(ctx.id);
  }
  if (error.code === FOREIGN_KEY_VIOLATION && ctx.id !== undefined) {
    return new CategoryInUseError(ctx.id);
  }
  return error;
}
