import {
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../security/jwt.guard.js';
import { Roles } from '../security/roles.decorator.js';
import { RolesGuard } from '../security/roles.guard.js';
import { idSchema } from '../shared/id.schema.js';
import type { Page } from '../shared/pagination.js';
import { InvalidOrderStateError, OrderNotFoundError } from './order.errors.js';
import { OrderService } from './order.service.js';
import type { Order } from './order.types.js';
import {
  type AdminOrdersQuery,
  adminOrdersQuerySchema,
} from './orders.schemas.js';

/** Gestión de órdenes del admin (caso 13). Cancelar está en checkout (D6). */
@Controller('admin/orders')
@UseGuards(JwtGuard, RolesGuard)
@Roles(['ADMIN'])
export class AdminOrdersController {
  constructor(private readonly orders: OrderService) {}

  @Get()
  findPage(
    @Query({ schema: adminOrdersQuerySchema }) query: AdminOrdersQuery,
  ): Promise<Page<Order>> {
    return this.orders.findPage(query);
  }

  @Get(':id')
  async findOne(@Param('id', { schema: idSchema }) id: string): Promise<Order> {
    try {
      return await this.orders.findById(id);
    } catch (error) {
      throw toHttpError(error);
    }
  }

  /** PAID → SHIPPED. */
  @Patch(':id/ship')
  async ship(@Param('id', { schema: idSchema }) id: string): Promise<Order> {
    try {
      return await this.orders.ship(id);
    } catch (error) {
      throw toHttpError(error);
    }
  }
}

/** Traduce los errores del dominio a HTTP (D28). */
function toHttpError(error: unknown): unknown {
  if (error instanceof OrderNotFoundError) {
    return new NotFoundException(error.message); // 404
  }
  if (error instanceof InvalidOrderStateError) {
    return new ConflictException(error.message); // 409
  }
  return error;
}
