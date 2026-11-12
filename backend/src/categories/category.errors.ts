// Errores del dominio de categorías. No conocen HTTP: el controller decide
// qué código de respuesta corresponde a cada uno.

export class CategoryNotFoundError extends Error {
  constructor(id: string) {
    super(`No existe la categoría ${id}`);
    this.name = 'CategoryNotFoundError';
  }
}

export class CategoryNameTakenError extends Error {
  constructor(name: string) {
    super(`Ya existe una categoría llamada "${name}"`);
    this.name = 'CategoryNameTakenError';
  }
}

/** La categoría tiene productos (activos o desactivados): no se puede borrar. */
export class CategoryInUseError extends Error {
  constructor(id: string) {
    super(
      `La categoría ${id} tiene productos; reasígnalos antes de eliminarla`,
    );
    this.name = 'CategoryInUseError';
  }
}
