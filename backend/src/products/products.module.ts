import { Module } from '@nestjs/common';
import { SecurityModule } from '../security/security.module.js';
import { AdminProductsController } from './admin-products.controller.js';
import { PrismaProductRepository } from './prisma-product.repository.js';
import { PRODUCT_REPOSITORY } from './product.repository.js';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';

@Module({
  // SecurityModule: guards para los endpoints de admin (D36).
  // No importa CategoriesModule: la FK valida la categoría (D48).
  imports: [SecurityModule],
  // Público y admin separados (D47).
  controllers: [ProductsController, AdminProductsController],
  providers: [
    ProductsService,
    { provide: PRODUCT_REPOSITORY, useClass: PrismaProductRepository },
  ],
  // cart y checkout usarán el service (y luego StockService).
  exports: [ProductsService],
})
export class ProductsModule {}
