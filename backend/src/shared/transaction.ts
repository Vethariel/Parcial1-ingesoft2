// Contrato de transacciones (decisión D13).
// Los services abren transacciones y las pasan a los repositorios sin saber
// qué herramienta hay detrás (Prisma). Solo la implementación sabe abrirla.

/**
 * Transacción opaca: una "caja cerrada con etiqueta".
 * Los services la reciben y la pasan de mano en mano, pero no pueden usarla.
 * El campo __brand solo existe para que TypeScript no confunda este tipo con
 * otro objeto cualquiera; nunca se lee.
 */
export type Transaction = { readonly __brand: 'Transaction' };

/** Ejecuta un trabajo dentro de una transacción: todo o nada. */
export interface TransactionRunner {
  /**
   * BEGIN → work(tx) → COMMIT.
   * Si work lanza un error → ROLLBACK y el error se propaga.
   */
  run<T>(work: (tx: Transaction) => Promise<T>): Promise<T>;
}

/** Token de inyección: las interfaces no existen en tiempo de ejecución. */
export const TRANSACTION_RUNNER = Symbol('TRANSACTION_RUNNER');
