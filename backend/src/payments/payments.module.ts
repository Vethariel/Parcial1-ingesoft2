import { Module } from '@nestjs/common';
import { MockPaymentGateway } from './mock-payment-gateway.js';
import { PAYMENT_GATEWAY } from './payment-gateway.js';
import { PAYMENT_REPOSITORY } from './payment.repository.js';
import { PaymentsService } from './payments.service.js';
import { PrismaPaymentRepository } from './prisma-payment.repository.js';

@Module({
  providers: [
    PaymentsService,
    { provide: PAYMENT_REPOSITORY, useClass: PrismaPaymentRepository },
    // Cambiar a una pasarela real = cambiar SOLO esta línea (D de SOLID).
    { provide: PAYMENT_GATEWAY, useClass: MockPaymentGateway },
  ],
  // checkout cobra, reembolsa y recupera a través del service.
  exports: [PaymentsService],
})
export class PaymentsModule {}
