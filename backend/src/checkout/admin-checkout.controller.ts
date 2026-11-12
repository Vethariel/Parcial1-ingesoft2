import { Controller, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import type { Order } from '../orders/order.types.js';
import { JwtGuard } from '../security/jwt.guard.js';
import { Roles } from '../security/roles.decorator.js';
import { RolesGuard } from '../security/roles.guard.js';
import { idSchema } from '../shared/id.schema.js';
import { toHttpError } from './checkout-http-errors.js';
import { CheckoutService } from './checkout.service.js';

/**
 * Cancelación del admin (caso 15): vive en checkout porque toca órdenes,
 * pagos (reembolso) y stock (D6). La URL sigue el prefijo /admin (D47).
 */
@Controller('admin/orders')
@UseGuards(JwtGuard, RolesGuard)
@Roles(['ADMIN'])
export class AdminCheckoutController {
  constructor(private readonly checkout: CheckoutService) {}

  /** PENDING → CANCELLED, o PAID → reembolso → CANCELLED. */
  @Post(':id/cancel')
  @HttpCode(200)
  async cancel(@Param('id', { schema: idSchema }) id: string): Promise<Order> {
    try {
      return await this.checkout.cancelByAdmin(id);
    } catch (error) {
      throw toHttpError(error);
    }
  }
}
