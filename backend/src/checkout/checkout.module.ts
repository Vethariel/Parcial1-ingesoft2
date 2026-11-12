import { Module } from '@nestjs/common';
import { CartModule } from '../cart/cart.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { PaymentsModule } from '../payments/payments.module.js';
import { ProductsModule } from '../products/products.module.js';
import { SecurityModule } from '../security/security.module.js';
import { UsersModule } from '../users/users.module.js';
import { AdminCheckoutController } from './admin-checkout.controller.js';
import { CheckoutController } from './checkout.controller.js';
import { CheckoutService } from './checkout.service.js';

/**
 * Coordinador (D6): el único módulo que conoce a carrito, stock, órdenes y
 * pagos a la vez. Ninguno de ellos depende de checkout.
 * TRANSACTION_RUNNER llega de PrismaModule, que es global.
 */
@Module({
  imports: [
    UsersModule, // dirección de envío
    CartModule,
    ProductsModule, // StockService
    OrdersModule,
    PaymentsModule,
    SecurityModule,
  ],
  controllers: [CheckoutController, AdminCheckoutController],
  providers: [CheckoutService],
  // expirations dispara la expiración y la recuperación (paso 5d).
  exports: [CheckoutService],
})
export class CheckoutModule {}
