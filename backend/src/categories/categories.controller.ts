import { Controller, Get } from '@nestjs/common';
import { CategoriesService } from './categories.service.js';
import type { Category } from './category.types.js';

/**
 * Endpoints PÚBLICOS de categorías (el catálogo se filtra por categoría).
 * Los de administración están en AdminCategoriesController (D47).
 */
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  findAll(): Promise<Category[]> {
    return this.categories.findAll();
  }
}
