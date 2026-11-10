import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { env } from './config/env.js';

async function bootstrap() {
  // Aquí el contenedor de DI arma todas las piezas declaradas en los módulos.
  const app = await NestFactory.create(AppModule);
  // Llama a onModuleDestroy (p. ej. cerrar la BD) al detener la app con Ctrl+C.
  app.enableShutdownHooks();
  await app.listen(env.port);
}
await bootstrap();
