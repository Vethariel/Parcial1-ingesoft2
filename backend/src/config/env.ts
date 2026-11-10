// Variables de entorno: lo que cambia según dónde corre la app
// (credenciales, puertos). Las reglas de negocio están en business-rules.ts.
import { config as loadEnv } from 'dotenv';
import { expand } from 'dotenv-expand';

// El .env vive en la raíz del repositorio; la app se ejecuta desde backend/.
// expand() resuelve las referencias ${VARIABLE}. Las variables que ya existan
// en el entorno (p. ej. en un servidor) tienen prioridad sobre el archivo.
expand(loadEnv({ path: '../.env', quiet: true }));

/** Falla al arrancar si falta una variable obligatoria, diciendo cuál. */
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno obligatoria: ${name}`);
  }
  return value;
}

export const env = {
  databaseUrl: required('DATABASE_URL'),
  port: Number(process.env.PORT ?? 3000),
} as const;
