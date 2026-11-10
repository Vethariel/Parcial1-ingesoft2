// Configuración de la CLI de Prisma (migraciones, generación del cliente).
// Desde Prisma 7 la CLI no lee el .env por sí sola: lo cargamos aquí.
import { config as loadEnv } from 'dotenv';
import { expand } from 'dotenv-expand';
import { defineConfig, env } from 'prisma/config';

// El .env vive en la raíz del repositorio (lo comparte con docker-compose).
// expand() resuelve las referencias ${VARIABLE} dentro de DATABASE_URL.
expand(loadEnv({ path: '../.env', quiet: true }));

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
