import { Module } from '@nestjs/common';
import { SecurityModule } from '../security/security.module.js';
import { AdminProductsController } from './admin-products.controller.js';
import { PrismaProductRepository } from './prisma-product.repository.js';
import { PRODUCT_REPOSITORY } from './product.repository.js';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';
import { StockService } from './stock.service.js';

@Module({
  // SecurityModule: guards para los endpoints de admin (D36).
  // No importa CategoriesModule: la FK valida la categoría (D48).
  imports: [SecurityModule],
  // Público y admin separados (D47).
  controllers: [ProductsController, AdminProductsController],
  providers: [
    ProductsService,
    StockService, // único que modifica el stock (D5)
    { provide: PRODUCT_REPOSITORY, useClass: PrismaProductRepository },
  ],
  // cart lee productos; checkout reserva y libera stock (solo vía StockService).
  exports: [ProductsService, StockService],
})
export class ProductsModule {}
