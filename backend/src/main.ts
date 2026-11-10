import { StandardSchemaValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { env } from './config/env.js';

async function bootstrap() {
  // Aquí el contenedor de DI arma todas las piezas declaradas en los módulos.
  const app = await NestFactory.create(AppModule);
  // Valida (y transforma) cada parámetro que declare un esquema Zod:
  // @Body({ schema: ... }). Si no cumple, responde 400 sin llegar al controller.
  app.useGlobalPipes(new StandardSchemaValidationPipe());
  // Llama a onModuleDestroy (p. ej. cerrar la BD) al detener la app con Ctrl+C.
  app.enableShutdownHooks();
  await app.listen(env.port);
}
await bootstrap();
