import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module.js';
import { SecurityModule } from '../security/security.module.js';
import { CART_REPOSITORY } from './cart.repository.js';
import { CartController } from './cart.controller.js';
import { CartService } from './cart.service.js';
import { PrismaCartRepository } from './prisma-cart.repository.js';

@Module({
  // ProductsModule: leer productos (precio, stock, activo) vía ProductsService.
  // SecurityModule: guards (D36).
  imports: [ProductsModule, SecurityModule],
  controllers: [CartController],
  providers: [
    CartService,
    { provide: CART_REPOSITORY, useClass: PrismaCartRepository },
  ],
})
export class CartModule {}
