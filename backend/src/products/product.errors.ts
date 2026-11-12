// Errores del dominio de productos. No conocen HTTP: el controller decide
// qué código de respuesta corresponde a cada uno.

/** No existe, o (para el público) está desactivado: se responde igual. */
export class ProductNotFoundError extends Error {
  constructor(id: string) {
    super(`No existe el producto ${id}`);
    this.name = 'ProductNotFoundError';
  }
}

/** Un ajuste negativo dejaría el stock por debajo de 0. */
export class InsufficientStockError extends Error {
  constructor(id: string, available: number, requested: number) {
    super(
      `No se pueden restar ${requested} unidades del producto ${id}: hay ${available}`,
    );
    this.name = 'InsufficientStockError';
  }
}

/**
 * La categoría indicada al crear o editar no existe. Lo detecta la FK de la
 * BD (D48), por eso products no necesita consultar al módulo categories.
 */
export class InvalidCategoryError extends Error {
  constructor(categoryId: string) {
    super(`No existe la categoría ${categoryId}`);
    this.name = 'InvalidCategoryError';
  }
}
