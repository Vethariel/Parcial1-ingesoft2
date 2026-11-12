import { Module } from '@nestjs/common';
import { SecurityModule } from '../security/security.module.js';
import { AdminOrdersController } from './admin-orders.controller.js';
import { ORDER_REPOSITORY } from './order.repository.js';
import { OrderService } from './order.service.js';
import { OrdersController } from './orders.controller.js';
import { PrismaOrderRepository } from './prisma-order.repository.js';

@Module({
  imports: [SecurityModule],
  controllers: [OrdersController, AdminOrdersController],
  providers: [
    OrderService,
    { provide: ORDER_REPOSITORY, useClass: PrismaOrderRepository },
  ],
  // checkout crea órdenes y cambia sus estados a través del service.
  exports: [OrderService],
})
export class OrdersModule {}
