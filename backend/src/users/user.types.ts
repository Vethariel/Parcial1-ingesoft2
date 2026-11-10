// Tipos del dominio de usuarios (decisión D27): describen lo que el negocio
// necesita, no cómo se guarda. Prisma no aparece en los contratos.

export type Role = 'CUSTOMER' | 'ADMIN';

export type User = {
  id: string;
  name: string;
  email: string;
  /** Opcional al registrarse; obligatoria para confirmar una compra. */
  address: string | null;
  passwordHash: string;
  role: Role;
};

/** Campos del perfil que el propio usuario puede cambiar. */
export type ProfileChanges = {
  name?: string;
  address?: string;
};

/** Datos para crear un usuario. El rol lo decide quien llama, nunca el cliente. */
export type NewUser = {
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
};
