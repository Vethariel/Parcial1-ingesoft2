import type { Category } from './category.types.js';

/**
 * Contrato del repositorio de categorías: QUÉ se puede pedir, en lenguaje
 * del negocio. La implementación (PrismaCategoryRepository) decide CÓMO.
 */
export interface CategoryRepository {
  findAll(): Promise<Category[]>;
  /** @throws CategoryNameTakenError si el nombre ya existe. */
  create(name: string): Promise<Category>;
  /**
   * @throws CategoryNotFoundError si no existe.
   * @throws CategoryNameTakenError si el nuevo nombre ya existe.
   */
  rename(id: string, name: string): Promise<Category>;
  /**
   * @throws CategoryNotFoundError si no existe.
   * @throws CategoryInUseError si tiene productos.
   */
  delete(id: string): Promise<void>;
}

/** Token de inyección: las interfaces no existen en tiempo de ejecución. */
export const CATEGORY_REPOSITORY = Symbol('CATEGORY_REPOSITORY');
