import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { type QuoteInput, quoteSchema } from './cart.schemas.js';
import { CartService } from './cart.service.js';
import type { CartView } from './cart.types.js';

/**
 * Cotización PÚBLICA del carrito anónimo (D68). Sin guards: el visitante no
 * tiene sesión. No guarda nada; solo calcula con precios y stock actuales.
 * Separado de CartController, que exige CUSTOMER en toda la clase (D50).
 */
@Controller('cart')
export class CartQuoteController {
  constructor(private readonly cart: CartService) {}

  /** 200: calcula, no crea nada. */
  @Post('quote')
  @HttpCode(200)
  quote(@Body({ schema: quoteSchema }) input: QuoteInput): Promise<CartView> {
    return this.cart.quote(input.items);
  }
}
