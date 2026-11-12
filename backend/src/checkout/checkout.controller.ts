import {
  Body,
  Controller,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { Order } from '../orders/order.types.js';
import { CurrentUser } from '../security/current-user.decorator.js';
import { JwtGuard } from '../security/jwt.guard.js';
import { Roles } from '../security/roles.decorator.js';
import { RolesGuard } from '../security/roles.guard.js';
import type { AuthenticatedUser } from '../security/security.types.js';
import { idSchema } from '../shared/id.schema.js';
import { toHttpError } from './checkout-http-errors.js';
import { type PayOrderInput, payOrderSchema } from './checkout.schemas.js';
import { CheckoutService } from './checkout.service.js';
import type { ConfirmResult, PayResult } from './checkout.types.js';

/**
 * Proceso de compra del cliente (casos 7, 8 y 9). El usuario sale del token:
 * solo puede confirmar su carrito y pagar o cancelar SUS órdenes.
 */
@Controller('checkout')
@UseGuards(JwtGuard, RolesGuard)
@Roles(['CUSTOMER'])
export class CheckoutController {
  constructor(private readonly checkout: CheckoutService) {}

  /** 201: crea una orden. */
  @Post('confirm')
  async confirm(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ConfirmResult> {
    try {
      return await this.checkout.confirm(user.id);
    } catch (error) {
      throw toHttpError(error);
    }
  }

  @Post('orders/:id/pay')
  @HttpCode(200)
  async pay(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', { schema: idSchema }) id: string,
    @Body({ schema: payOrderSchema }) input: PayOrderInput,
  ): Promise<PayResult> {
    try {
      return await this.checkout.pay(user.id, id, input.cardNumber);
    } catch (error) {
      throw toHttpError(error);
    }
  }

  @Post('orders/:id/cancel')
  @HttpCode(200)
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', { schema: idSchema }) id: string,
  ): Promise<Order> {
    try {
      return await this.checkout.cancelByCustomer(user.id, id);
    } catch (error) {
      throw toHttpError(error);
    }
  }
}
