import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { CheckoutService } from '../checkout/checkout.service.js';
import { EXPIRATION_JOB_INTERVAL_SECONDS } from '../config/business-rules.js';

/**
 * El "reloj" (D11, D55): cada minuto dispara la expiración. Es un disparador
 * más de cancelar, como el cliente o el admin (§5); la lógica de negocio
 * vive en CheckoutService.expireOrders, no aquí.
 */
@Injectable()
export class ExpirationJob {
  private readonly logger = new Logger(ExpirationJob.name);
  private running = false;

  constructor(private readonly checkout: CheckoutService) {}

  @Interval(EXPIRATION_JOB_INTERVAL_SECONDS * 1000)
  async run(): Promise<void> {
    // Si una pasada tarda más de un minuto, la siguiente no se superpone.
    if (this.running) {
      return;
    }
    this.running = true;
    try {
      const summary = await this.checkout.expireOrders(new Date());
      if (summary.cancelled || summary.recovered || summary.failed) {
        this.logger.log(
          `Canceladas: ${summary.cancelled}, recuperadas: ${summary.recovered}, con error: ${summary.failed}`,
        );
      }
    } catch (error) {
      // Un fallo (p. ej. la BD no responde) no debe tumbar el proceso:
      // se registra y se reintenta en la siguiente pasada.
      this.logger.error('Falló la pasada de expiración', error);
    } finally {
      this.running = false;
    }
  }
}
