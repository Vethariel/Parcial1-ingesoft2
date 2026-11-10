import { Injectable } from '@nestjs/common';
import { Prisma, type User as PrismaUser } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  EmailAlreadyRegisteredError,
  UserNotFoundError,
} from './user.errors.js';
import type { UserRepository } from './user.repository.js';
import type { NewUser, ProfileChanges, User } from './user.types.js';

/** Código de Prisma para "violación de restricción UNIQUE". */
const UNIQUE_VIOLATION = 'P2002';
/** Código de Prisma para "el registro a modificar no existe". */
const RECORD_NOT_FOUND = 'P2025';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { email } });
    return row ? toDomain(row) : null;
  }

  async create(data: NewUser): Promise<User> {
    try {
      const row = await this.prisma.user.create({ data });
      return toDomain(row);
    } catch (error) {
      // Dos registros simultáneos con el mismo correo: el UNIQUE de la BD
      // rechaza al segundo. Se traduce a un error del dominio para que el
      // service no conozca los códigos de Prisma.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_VIOLATION
      ) {
        throw new EmailAlreadyRegisteredError(data.email);
      }
      throw error;
    }
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
  }

  async updateProfile(id: string, changes: ProfileChanges): Promise<User> {
    try {
      // Prisma ignora los campos undefined: solo cambia lo que se envió.
      const row = await this.prisma.user.update({
        where: { id },
        data: changes,
      });
      return toDomain(row);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === RECORD_NOT_FOUND
      ) {
        throw new UserNotFoundError(id);
      }
      throw error;
    }
  }
}

/** Traduce la fila de Prisma al tipo del dominio (sin campos de la BD como updatedAt). */
function toDomain(row: PrismaUser): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    address: row.address,
    passwordHash: row.passwordHash,
    role: row.role,
  };
}
