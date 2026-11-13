import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module.js';
import { SecurityModule } from '../security/security.module.js';
import { CartQuoteController } from './cart-quote.controller.js';
import { CART_REPOSITORY } from './cart.repository.js';
import { CartController } from './cart.controller.js';
import { CartService } from './cart.service.js';
import { PrismaCartRepository } from './prisma-cart.repository.js';

@Module({
  // ProductsModule: leer productos (precio, stock, activo) vía ProductsService.
  // SecurityModule: guards (D36).
  imports: [ProductsModule, SecurityModule],
  // Cliente (CUSTOMER) y cotización pública del carrito anónimo (D68).
  controllers: [CartController, CartQuoteController],
  providers: [
    CartService,
    { provide: CART_REPOSITORY, useClass: PrismaCartRepository },
  ],
  // checkout lee el carrito y saca lo que entró en la orden.
  exports: [CartService],
})
export class CartModule {}
