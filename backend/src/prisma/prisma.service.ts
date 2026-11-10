import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../config/env.js';
import { PrismaClient } from '../generated/prisma/client.js';

/**
 * La conexión única a la base de datos.
 * El contenedor de DI crea una sola instancia y la entrega a todos los
 * repositorios que la piden. Nunca hacer `new PrismaService()`.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    // Prisma 7 se conecta a PostgreSQL a través del adaptador del driver `pg`.
    super({ adapter: new PrismaPg(env.databaseUrl) });
  }

  /**
   * NestJS lo llama al arrancar: si la BD no responde, la app no arranca.
   * Con el adaptador `pg`, $connect() no abre una conexión real (el pool se
   * conecta en la primera consulta). Por eso se hace una consulta mínima:
   * así el error aparece al arrancar y no en la primera petición de un cliente.
   */
  async onModuleInit(): Promise<void> {
    await this.$queryRaw`SELECT 1`;
  }

  /** NestJS lo llama al apagar: cierra las conexiones limpiamente. */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
