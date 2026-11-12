import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../security/jwt.guard.js';
import { Roles } from '../security/roles.decorator.js';
import { RolesGuard } from '../security/roles.guard.js';
import { idSchema } from '../shared/id.schema.js';
import type { Page } from '../shared/pagination.js';
import {
  InvalidCategoryError,
  ProductNotFoundError,
} from './product.errors.js';
import type { Product } from './product.types.js';
import {
  type CatalogQueryInput,
  catalogQuerySchema,
  type CreateProductInput,
  createProductSchema,
  type UpdateProductInput,
  updateProductSchema,
} from './products.schemas.js';
import { ProductsService } from './products.service.js';

/**
 * Administración de productos (caso 12). Todo bajo /admin (D47), con guards
 * y rol EN LA CLASE.
 */
@Controller('admin/products')
@UseGuards(JwtGuard, RolesGuard)
@Roles(['ADMIN'])
export class AdminProductsController {
  constructor(private readonly products: ProductsService) {}

  /** Incluye productos desactivados (D42). */
  @Get()
  findPage(
    @Query({ schema: catalogQuerySchema }) query: CatalogQueryInput,
  ): Promise<Page<Product>> {
    return this.products.findAdminPage(query);
  }

  @Post()
  async create(
    @Body({ schema: createProductSchema }) input: CreateProductInput,
  ): Promise<Product> {
    try {
      return await this.products.create(input);
    } catch (error) {
      throw toHttpError(error);
    }
  }

  @Patch(':id')
  async update(
    @Param('id', { schema: idSchema }) id: string,
    @Body({ schema: updateProductSchema }) input: UpdateProductInput,
  ): Promise<Product> {
    try {
      return await this.products.update(id, input);
    } catch (error) {
      throw toHttpError(error);
    }
  }
}

/** Traduce los errores del dominio a HTTP (D28). */
function toHttpError(error: unknown): unknown {
  if (error instanceof ProductNotFoundError) {
    return new NotFoundException(error.message); // 404: el recurso de la URL no existe
  }
  if (error instanceof InvalidCategoryError) {
    return new BadRequestException(error.message); // 400: un dato del cuerpo es inválido
  }
  return error;
}
