import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  InvalidOrderStateError,
  OpenOrderExistsError,
  OrderNotFoundError,
} from '../orders/order.errors.js';
import { UserNotFoundError } from '../users/user.errors.js';
import {
  EmptyCartError,
  MissingAddressError,
  NothingAvailableError,
  OrderChangedError,
  PaymentGatewayUnavailableError,
  PaymentWindowClosedError,
  RefundFailedError,
} from './checkout.errors.js';

/**
 * Traduce los errores del dominio a HTTP (D28). Compartida por los dos
 * controllers de checkout (cliente y admin) para no duplicarla (DRY).
 */
export function toHttpError(error: unknown): unknown {
  if (
    error instanceof OrderNotFoundError ||
    error instanceof UserNotFoundError
  ) {
    return new NotFoundException(error.message); // 404
  }
  if (error instanceof MissingAddressError || error instanceof EmptyCartError) {
    return new BadRequestException(error.message); // 400
  }
  if (error instanceof NothingAvailableError) {
    // 409 con el detalle de lo excluido, para mostrarlo al cliente.
    return new ConflictException({
      message: error.message,
      excluded: error.excluded,
    });
  }
  if (
    error instanceof OpenOrderExistsError ||
    error instanceof InvalidOrderStateError ||
    error instanceof PaymentWindowClosedError ||
    error instanceof OrderChangedError
  ) {
    return new ConflictException(error.message); // 409: choca con el estado actual
  }
  if (error instanceof PaymentGatewayUnavailableError) {
    return new ServiceUnavailableException(error.message); // 503
  }
  if (error instanceof RefundFailedError) {
    return new BadGatewayException(error.message); // 502: falló un sistema externo
  }
  return error;
}
