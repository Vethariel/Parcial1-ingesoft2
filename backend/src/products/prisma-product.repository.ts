import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Page } from '../shared/pagination.js';
import {
  InvalidCategoryError,
  ProductNotFoundError,
} from './product.errors.js';
import type { ProductRepository } from './product.repository.js';
import type {
  NewProduct,
  Product,
  ProductChanges,
  ProductFilter,
} from './product.types.js';

/** Código de Prisma para "violación de llave foránea" (categoryId inexistente). */
const FOREIGN_KEY_VIOLATION = 'P2003';
/** Código de Prisma para "el registro a modificar no existe". */
const RECORD_NOT_FOUND = 'P2025';

// Cada producto se devuelve con el nombre de su categoría (lo muestra el catálogo).
const include = { category: { select: { id: true, name: true } } } as const;
type ProductRow = Prisma.ProductGetPayload<{ include: typeof include }>;

@Injectable()
export class PrismaProductRepository implements ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPage(filter: ProductFilter): Promise<Page<Product>> {
    const where: Prisma.ProductWhereInput = {
      categoryId: filter.categoryId, // undefined = sin filtro
      ...(filter.onlyActive && { active: true }),
    };
    // Dos consultas: la página y el total (para saber cuántas páginas hay).
    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include,
        // Orden estable: con el id como desempate, un producto no aparece en
        // dos páginas ni se salta entre una página y la siguiente.
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.product.count({ where }),
    ]);
    return {
      items: rows.map(toDomain),
      total,
      page: filter.page,
      pageSize: filter.pageSize,
    };
  }

  async findById(id: string): Promise<Product | null> {
    const row = await this.prisma.product.findUnique({
      where: { id },
      include,
    });
    return row ? toDomain(row) : null;
  }

  async create(data: NewProduct): Promise<Product> {
    try {
      const row = await this.prisma.product.create({ data, include });
      return toDomain(row);
    } catch (error) {
      throw translate(error, { categoryId: data.categoryId });
    }
  }

  async update(id: string, changes: ProductChanges): Promise<Product> {
    try {
      // Prisma ignora los campos undefined: solo cambia lo que se envió.
      const row = await this.prisma.product.update({
        where: { id },
        data: changes,
        include,
      });
      return toDomain(row);
    } catch (error) {
      throw translate(error, { id, categoryId: changes.categoryId });
    }
  }

  async adjustStock(id: string, delta: number): Promise<Product | null> {
    // Equivale a:
    //   UPDATE products SET stock = stock + delta
    //   WHERE id = $id AND stock >= -delta
    // La BD lee y escribe la fila en el mismo paso (con la fila bloqueada),
    // así que no hay hueco entre leer y escribir: dos ajustes simultáneos se
    // aplican uno tras otro y ninguno se pierde (D40).
    const { count } = await this.prisma.product.updateMany({
      where: { id, stock: { gte: -delta } },
      data: { stock: { increment: delta } },
    });
    // count = 0: no existe o el stock no alcanza. El service decide cuál.
    return count === 0 ? null : this.findById(id);
  }
}

/** Traduce los errores de Prisma a errores del dominio (el service no conoce Prisma). */
function translate(
  error: unknown,
  ctx: { id?: string; categoryId?: string },
): unknown {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return error;
  }
  // La única FK que se escribe en products es categoryId.
  if (error.code === FOREIGN_KEY_VIOLATION && ctx.categoryId !== undefined) {
    return new InvalidCategoryError(ctx.categoryId);
  }
  if (error.code === RECORD_NOT_FOUND && ctx.id !== undefined) {
    return new ProductNotFoundError(ctx.id);
  }
  return error;
}

/** Traduce la fila de Prisma al tipo del dominio. */
function toDomain(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    imageUrl: row.imageUrl,
    price: row.price.toFixed(2), // Decimal → "19990.00" (D45)
    stock: row.stock,
    active: row.active,
    category: row.category,
  };
}
