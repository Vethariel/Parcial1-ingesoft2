import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CheckoutModule } from '../checkout/checkout.module.js';
import { ExpirationJob } from './expiration.job.js';

@Module({
  // ScheduleModule.forRoot(): activa @Interval en la app (D55).
  imports: [ScheduleModule.forRoot(), CheckoutModule],
  providers: [ExpirationJob],
})
export class ExpirationsModule {}
