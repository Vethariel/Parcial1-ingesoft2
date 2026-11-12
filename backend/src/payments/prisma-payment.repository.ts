import { Injectable } from '@nestjs/common';
import type { Payment as PaymentRow } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { PaymentRepository } from './payment.repository.js';
import type { NewPayment, Payment, PaymentResult } from './payment.types.js';

@Injectable()
export class PrismaPaymentRepository implements PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  countByOrder(orderId: string): Promise<number> {
    return this.prisma.payment.count({ where: { orderId } });
  }

  async findByOrder(orderId: string): Promise<Payment[]> {
    const rows = await this.prisma.payment.findMany({
      where: { orderId },
      orderBy: { attempt: 'asc' },
    });
    return rows.map(toDomain);
  }

  async create(data: NewPayment): Promise<Payment> {
    return toDomain(await this.prisma.payment.create({ data }));
  }

  async saveResult(id: string, result: PaymentResult): Promise<void> {
    await this.prisma.payment.update({
      where: { id },
      data: {
        status: result.status,
        externalReference: result.externalReference,
      },
    });
  }
}

function toDomain(row: PaymentRow): Payment {
  return {
    id: row.id,
    orderId: row.orderId,
    attempt: row.attempt,
    amount: row.amount.toFixed(2),
    method: row.method,
    status: row.status,
    externalReference: row.externalReference,
  };
}
