import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
// Retain free-text input used by mobile. A known inactive category cannot be reused.
export async function resolveCategory(
  tx: Prisma.TransactionClient,
  name: string,
) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(736292, hashtext(lower(${name.trim()})))`;
  const alias = await tx.categoriaNombre.findFirst({
    where: { nombre: { equals: name.trim(), mode: 'insensitive' } },
    include: { categoria: true },
  });
  if (alias) {
    if (!alias.categoria.activo)
      throw new BadRequestException('Esta categoría está desactivada.');
    await tx.$queryRaw`SELECT "id" FROM "Categoria" WHERE "id" = ${alias.categoriaId} FOR SHARE`;
    const current = await tx.categoria.findUniqueOrThrow({
      where: { id: alias.categoriaId },
    });
    if (!current.activo)
      throw new BadRequestException('Esta categoría está desactivada.');
    return alias.categoriaId;
  }
  const category = await tx.categoria.upsert({
    where: { nombre: name.trim() },
    update: {},
    create: { nombre: name.trim() },
  });
  if (!category.activo)
    throw new BadRequestException('Esta categoría está desactivada.');
  await tx.$queryRaw`SELECT "id" FROM "Categoria" WHERE "id" = ${category.id} FOR SHARE`;
  const current = await tx.categoria.findUniqueOrThrow({
    where: { id: category.id },
  });
  if (!current.activo)
    throw new BadRequestException('Esta categoría está desactivada.');
  await tx.categoriaNombre.upsert({
    where: { nombre: name.trim() },
    update: {},
    create: { nombre: name.trim(), categoriaId: category.id },
  });
  return category.id;
}
