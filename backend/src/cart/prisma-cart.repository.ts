import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CartRepository } from './cart.repository.js';
import type { CartItem } from './cart.types.js';

/** Código de Prisma para "violación de restricción UNIQUE". */
const UNIQUE_VIOLATION = 'P2002';

@Injectable()
export class PrismaCartRepository implements CartRepository {
  constructor(private readonly prisma: PrismaService) {}

  findItems(userId: string): Promise<CartItem[]> {
    return this.prisma.cartItem.findMany({
      where: { cart: { userId } },
      select: { productId: true, quantity: true },
    });
  }

  async addItem(
    userId: string,
    productId: string,
    quantity: number,
    maxQuantity: number,
  ): Promise<boolean> {
    // El carrito se crea con el primer producto (userId es UNIQUE: uno por usuario).
    const { id: cartId } = await this.prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
      select: { id: true },
    });

    // 1) Si la línea ya existe: sumar en UN UPDATE condicional, igual que el
    //    stock (D40). Dos "agregar" simultáneos no se pisan.
    if (await this.increment(cartId, productId, quantity, maxQuantity)) {
      return true;
    }
    // 2) Si no existe: crearla.
    try {
      await this.prisma.cartItem.create({
        data: { cartId, productId, quantity },
      });
      return true;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_VIOLATION
      ) {
        // La línea ya existía: o el UPDATE no se aplicó por el máximo, u otra
        // petición la creó justo en medio. Se reintenta la suma una vez.
        return this.increment(cartId, productId, quantity, maxQuantity);
      }
      throw error;
    }
  }

  async setQuantity(
    userId: string,
    productId: string,
    quantity: number,
  ): Promise<boolean> {
    const { count } = await this.prisma.cartItem.updateMany({
      where: { productId, cart: { userId } },
      data: { quantity },
    });
    return count > 0;
  }

  async removeItem(userId: string, productId: string): Promise<boolean> {
    const { count } = await this.prisma.cartItem.deleteMany({
      where: { productId, cart: { userId } },
    });
    return count > 0;
  }

  /** UPDATE cart_items SET quantity = quantity + q WHERE ... AND quantity <= max - q */
  private async increment(
    cartId: string,
    productId: string,
    quantity: number,
    maxQuantity: number,
  ): Promise<boolean> {
    const { count } = await this.prisma.cartItem.updateMany({
      where: { cartId, productId, quantity: { lte: maxQuantity - quantity } },
      data: { quantity: { increment: quantity } },
    });
    return count > 0;
  }
}
