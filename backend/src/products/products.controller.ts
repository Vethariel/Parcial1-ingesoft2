import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { idSchema } from '../shared/id.schema.js';
import type { Page } from '../shared/pagination.js';
import { ProductNotFoundError } from './product.errors.js';
import type { Product } from './product.types.js';
import {
  type CatalogQueryInput,
  catalogQuerySchema,
} from './products.schemas.js';
import { ProductsService } from './products.service.js';

/**
 * Catálogo PÚBLICO (sin login, SUPUESTOS §2): solo productos activos.
 * La administración está en AdminProductsController (D47).
 */
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  findPage(
    @Query({ schema: catalogQuerySchema }) query: CatalogQueryInput,
  ): Promise<Page<Product>> {
    return this.products.findCatalogPage(query);
  }

  @Get(':id')
  async findOne(
    @Param('id', { schema: idSchema }) id: string,
  ): Promise<Product> {
    try {
      return await this.products.findActiveById(id);
    } catch (error) {
      if (error instanceof ProductNotFoundError) {
        throw new NotFoundException(error.message); // 404
      }
      throw error;
    }
  }
}
