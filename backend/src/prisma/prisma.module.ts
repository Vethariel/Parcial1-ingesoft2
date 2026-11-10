import { Global, Module } from '@nestjs/common';
import { TRANSACTION_RUNNER } from '../shared/transaction.js';
import { PrismaTransactionRunner } from './prisma-transaction-runner.js';
import { PrismaService } from './prisma.service.js';

/**
 * Infraestructura de base de datos.
 * @Global (decisión D24): se registra una vez en AppModule y queda disponible
 * para todos los módulos sin importarlo en cada uno.
 */
@Global()
@Module({
  providers: [
    PrismaService,
    // "Cuando alguien pida TRANSACTION_RUNNER, entrégale PrismaTransactionRunner".
    { provide: TRANSACTION_RUNNER, useClass: PrismaTransactionRunner },
  ],
  exports: [PrismaService, TRANSACTION_RUNNER],
})
export class PrismaModule {}
