import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../security/jwt.guard.js';
import { Roles } from '../security/roles.decorator.js';
import { RolesGuard } from '../security/roles.guard.js';
import { idSchema } from '../shared/id.schema.js';
import {
  type CategoryNameInput,
  categoryNameSchema,
} from './categories.schemas.js';
import { CategoriesService } from './categories.service.js';
import {
  CategoryInUseError,
  CategoryNameTakenError,
  CategoryNotFoundError,
} from './category.errors.js';
import type { Category } from './category.types.js';

/**
 * Listar es público (el catálogo se filtra por categoría).
 * Crear, renombrar y borrar: solo ADMIN.
 */
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  findAll(): Promise<Category[]> {
    return this.categories.findAll();
  }

  @Post()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(['ADMIN'])
  async create(
    @Body({ schema: categoryNameSchema }) input: CategoryNameInput,
  ): Promise<Category> {
    try {
      return await this.categories.create(input.name);
    } catch (error) {
      throw toHttpError(error);
    }
  }

  @Patch(':id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(['ADMIN'])
  async rename(
    @Param('id', { schema: idSchema }) id: string,
    @Body({ schema: categoryNameSchema }) input: CategoryNameInput,
  ): Promise<Category> {
    try {
      return await this.categories.rename(id, input.name);
    } catch (error) {
      throw toHttpError(error);
    }
  }

  @Delete(':id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(['ADMIN'])
  @HttpCode(204)
  async delete(@Param('id', { schema: idSchema }) id: string): Promise<void> {
    try {
      await this.categories.delete(id);
    } catch (error) {
      throw toHttpError(error);
    }
  }
}

/** Traduce los errores del dominio a HTTP (D28). */
function toHttpError(error: unknown): unknown {
  if (error instanceof CategoryNotFoundError) {
    return new NotFoundException(error.message); // 404
  }
  if (
    error instanceof CategoryNameTakenError ||
    error instanceof CategoryInUseError
  ) {
    return new ConflictException(error.message); // 409
  }
  return error;
}
