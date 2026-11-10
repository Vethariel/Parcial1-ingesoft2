import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import type {
  Transaction,
  TransactionRunner,
} from '../shared/transaction.js';
import { PrismaService } from './prisma.service.js';

/** Implementación de TransactionRunner con Prisma (decisión D13). */
@Injectable()
export class PrismaTransactionRunner implements TransactionRunner {
  constructor(private readonly prisma: PrismaService) {}

  run<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
    // $transaction hace BEGIN, ejecuta el callback y hace COMMIT;
    // si el callback lanza un error, hace ROLLBACK.
    return this.prisma.$transaction((prismaTx) =>
      work(prismaTx as unknown as Transaction),
    );
  }
}

/**
 * "Abre la caja": convierte la Transaction opaca en el cliente de Prisma.
 * SOLO deben usarla las implementaciones de repositorios (Prisma*Repository).
 */
export function asPrismaTransaction(
  tx: Transaction,
): Prisma.TransactionClient {
  return tx as unknown as Prisma.TransactionClient;
}
