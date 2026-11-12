import { Inject, Injectable } from '@nestjs/common';
import {
  CATEGORY_REPOSITORY,
  type CategoryRepository,
} from './category.repository.js';
import type { Category } from './category.types.js';

/**
 * Casos de uso de categorías (caso 11 de ARQUITECTURA §3).
 * Las reglas "nombre único" y "no borrar con productos" las garantiza la BD;
 * el repositorio las traduce a errores del dominio.
 */
@Injectable()
export class CategoriesService {
  constructor(
    @Inject(CATEGORY_REPOSITORY) private readonly categories: CategoryRepository,
  ) {}

  findAll(): Promise<Category[]> {
    return this.categories.findAll();
  }

  /** @throws CategoryNameTakenError */
  create(name: string): Promise<Category> {
    return this.categories.create(name);
  }

  /** @throws CategoryNotFoundError | CategoryNameTakenError */
  rename(id: string, name: string): Promise<Category> {
    return this.categories.rename(id, name);
  }

  /** @throws CategoryNotFoundError | CategoryInUseError */
  delete(id: string): Promise<void> {
    return this.categories.delete(id);
  }
}
