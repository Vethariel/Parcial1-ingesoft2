import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../security/current-user.decorator.js';
import { JwtGuard } from '../security/jwt.guard.js';
import { Roles } from '../security/roles.decorator.js';
import { RolesGuard } from '../security/roles.guard.js';
import type { AuthenticatedUser } from '../security/security.types.js';
import { idSchema } from '../shared/id.schema.js';
import { type Pagination, paginationSchema } from '../shared/pagination.js';
import type { Page } from '../shared/pagination.js';
import { OrderNotFoundError } from './order.errors.js';
import { OrderService } from './order.service.js';
import type { Order } from './order.types.js';

/**
 * Órdenes del cliente autenticado (solo lectura). Confirmar, pagar y cancelar
 * están en checkout (D6). El usuario sale del token.
 */
@Controller('orders')
@UseGuards(JwtGuard, RolesGuard)
@Roles(['CUSTOMER'])
export class OrdersController {
  constructor(private readonly orders: OrderService) {}

  @Get()
  findMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query({ schema: paginationSchema }) query: Pagination,
  ): Promise<Page<Order>> {
    return this.orders.findPage({ ...query, userId: user.id });
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', { schema: idSchema }) id: string,
  ): Promise<Order> {
    try {
      return await this.orders.findForUser(user.id, id);
    } catch (error) {
      if (error instanceof OrderNotFoundError) {
        throw new NotFoundException(error.message); // 404
      }
      throw error;
    }
  }
}
