import { Module } from '@nestjs/common';
import { SecurityModule } from '../security/security.module.js';
import { AdminCategoriesController } from './admin-categories.controller.js';
import { CategoriesController } from './categories.controller.js';
import { CategoriesService } from './categories.service.js';
import { CATEGORY_REPOSITORY } from './category.repository.js';
import { PrismaCategoryRepository } from './prisma-category.repository.js';

@Module({
  // SecurityModule: JwtGuard y RolesGuard para los endpoints de admin (D36).
  imports: [SecurityModule],
  // Público y admin separados (D47): cambian por razones distintas.
  controllers: [CategoriesController, AdminCategoriesController],
  providers: [
    CategoriesService,
    { provide: CATEGORY_REPOSITORY, useClass: PrismaCategoryRepository },
  ],
  // Se exporta el service para que products pueda usarlo más adelante.
  exports: [CategoriesService],
})
export class CategoriesModule {}
