import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ProductNotFoundError } from '../products/product.errors.js';
import { CurrentUser } from '../security/current-user.decorator.js';
import { JwtGuard } from '../security/jwt.guard.js';
import { Roles } from '../security/roles.decorator.js';
import { RolesGuard } from '../security/roles.guard.js';
import type { AuthenticatedUser } from '../security/security.types.js';
import { idSchema } from '../shared/id.schema.js';
import {
  CartItemNotFoundError,
  CartQuantityLimitError,
} from './cart.errors.js';
import {
  type AddItemInput,
  addItemSchema,
  type SetQuantityInput,
  setQuantitySchema,
} from './cart.schemas.js';
import { CartService } from './cart.service.js';
import type { CartView } from './cart.types.js';

/**
 * Carrito del cliente autenticado. Como en /users/me, el usuario sale del
 * token: no hay forma de tocar el carrito de otro. Solo CUSTOMER (D50).
 * Cada endpoint responde con el carrito completo.
 */
@Controller('cart')
@UseGuards(JwtGuard, RolesGuard)
@Roles(['CUSTOMER'])
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  getCart(@CurrentUser() user: AuthenticatedUser): Promise<CartView> {
    return this.cart.getCart(user.id);
  }

  /** 200 y no 201: devuelve el carrito, no un recurso nuevo. */
  @Post('items')
  @HttpCode(200)
  async addItem(
    @CurrentUser() user: AuthenticatedUser,
    @Body({ schema: addItemSchema }) input: AddItemInput,
  ): Promise<CartView> {
    try {
      return await this.cart.addItem(user.id, input.productId, input.quantity);
    } catch (error) {
      throw toHttpError(error);
    }
  }

  @Patch('items/:productId')
  async setQuantity(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId', { schema: idSchema }) productId: string,
    @Body({ schema: setQuantitySchema }) input: SetQuantityInput,
  ): Promise<CartView> {
    try {
      return await this.cart.setQuantity(user.id, productId, input.quantity);
    } catch (error) {
      throw toHttpError(error);
    }
  }

  @Delete('items/:productId')
  async removeItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId', { schema: idSchema }) productId: string,
  ): Promise<CartView> {
    try {
      return await this.cart.removeItem(user.id, productId);
    } catch (error) {
      throw toHttpError(error);
    }
  }
}

/** Traduce los errores del dominio a HTTP (D28). */
function toHttpError(error: unknown): unknown {
  if (
    error instanceof ProductNotFoundError ||
    error instanceof CartItemNotFoundError
  ) {
    return new NotFoundException(error.message); // 404
  }
  if (error instanceof CartQuantityLimitError) {
    return new ConflictException(error.message); // 409
  }
  return error;
}
