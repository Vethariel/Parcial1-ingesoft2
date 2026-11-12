import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { asPrismaTransaction } from '../prisma/prisma-transaction-runner.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Page } from '../shared/pagination.js';
import type { Transaction } from '../shared/transaction.js';
import { OpenOrderExistsError } from './order.errors.js';
import type {
  OrderRepository,
  OrderToSave,
  StoredOrder,
} from './order.repository.js';
import type { OrderFilter, OrderStatus } from './order.types.js';

/** Código de Prisma para "violación de restricción UNIQUE". */
const UNIQUE_VIOLATION = 'P2002';

const include = { items: true } as const;
type OrderRow = Prisma.OrderGetPayload<{ include: typeof include }>;

@Injectable()
export class PrismaOrderRepository implements OrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(tx: Transaction, data: OrderToSave): Promise<StoredOrder> {
    try {
      const row = await asPrismaTransaction(tx).order.create({
        data: {
          userId: data.userId,
          shippingAddress: data.shippingAddress,
          total: data.total,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
            })),
          },
        },
        include,
      });
      return toDomain(row);
    } catch (error) {
      // El único UNIQUE que puede fallar al crear es el índice parcial
      // orders_one_open_per_user (D19): ya hay una orden PENDING/PROCESSING.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_VIOLATION
      ) {
        throw new OpenOrderExistsError();
      }
      throw error;
    }
  }

  async findById(id: string): Promise<StoredOrder | null> {
    const row = await this.prisma.order.findUnique({ where: { id }, include });
    return row ? toDomain(row) : null;
  }

  async findPage(filter: OrderFilter): Promise<Page<StoredOrder>> {
    const where: Prisma.OrderWhereInput = {
      userId: filter.userId,
      status: filter.status,
    };
    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], // las más recientes primero
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);
    return {
      items: rows.map(toDomain),
      total,
      page: filter.page,
      pageSize: filter.pageSize,
    };
  }

  async findCreatedBefore(
    status: OrderStatus,
    before: Date,
    limit: number,
  ): Promise<StoredOrder[]> {
    // Usa el índice (status, createdAt) del schema.
    const rows = await this.prisma.order.findMany({
      where: { status, createdAt: { lt: before } },
      include,
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    return rows.map(toDomain);
  }

  async transition(
    id: string,
    from: OrderStatus,
    to: OrderStatus,
    tx?: Transaction,
  ): Promise<boolean> {
    const client = tx ? asPrismaTransaction(tx) : this.prisma;
    // La condición sobre el estado actual hace la transición atómica:
    // si dos procesos intentan lo mismo, solo uno afecta la fila.
    const { count } = await client.order.updateMany({
      where: { id, status: from },
      data: { status: to },
    });
    return count > 0;
  }
}

function toDomain(row: OrderRow): StoredOrder {
  return {
    id: row.id,
    userId: row.userId,
    status: row.status,
    total: row.total.toFixed(2),
    shippingAddress: row.shippingAddress,
    createdAt: row.createdAt,
    items: row.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      unitPrice: item.unitPrice.toFixed(2),
      quantity: item.quantity,
    })),
  };
}
