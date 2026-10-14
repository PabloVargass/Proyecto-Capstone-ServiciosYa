BEGIN;
-- CreateEnum
CREATE TYPE "RolAdministrativo" AS ENUM ('USUARIO', 'ADMIN');

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "rol" "RolAdministrativo" NOT NULL DEFAULT 'USUARIO',
ADD COLUMN     "versionSesion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Trabajo" ADD COLUMN     "categoriaId" TEXT,
ADD COLUMN     "oculto" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Resena" ADD COLUMN     "oculta" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoriaNombre" (
    "nombre" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,

    CONSTRAINT "CategoriaNombre_pkey" PRIMARY KEY ("nombre")
);

-- CreateTable
CREATE TABLE "AuditoriaAdministrativa" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "recurso" TEXT NOT NULL,
    "recursoId" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "cambios" JSONB NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditoriaAdministrativa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvitacionCuenta" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "usadoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvitacionCuenta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_nombre_key" ON "Categoria"("nombre");

-- CreateIndex
CREATE INDEX "AuditoriaAdministrativa_creadoEn_idx" ON "AuditoriaAdministrativa"("creadoEn");

-- CreateIndex
CREATE UNIQUE INDEX "InvitacionCuenta_tokenHash_key" ON "InvitacionCuenta"("tokenHash");

-- CreateIndex
CREATE INDEX "InvitacionCuenta_usuarioId_idx" ON "InvitacionCuenta"("usuarioId");

-- AddForeignKey
ALTER TABLE "Trabajo" ADD CONSTRAINT "Trabajo_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoriaNombre" ADD CONSTRAINT "CategoriaNombre_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditoriaAdministrativa" ADD CONSTRAINT "AuditoriaAdministrativa_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvitacionCuenta" ADD CONSTRAINT "InvitacionCuenta_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Populate catalog without changing historical category strings or contracting states.
INSERT INTO "Categoria" ("id", "nombre", "actualizadoEn")
SELECT md5(lower(trim("categoria"))), min(trim("categoria")), CURRENT_TIMESTAMP
FROM "Trabajo" WHERE trim("categoria") <> '' GROUP BY lower(trim("categoria"));
INSERT INTO "CategoriaNombre" ("nombre", "categoriaId")
SELECT min(trim("categoria")), md5(lower(trim("categoria"))) FROM "Trabajo" WHERE trim("categoria") <> '' GROUP BY lower(trim("categoria"));
UPDATE "Trabajo" SET "categoriaId" = md5(lower(trim("categoria"))) WHERE trim("categoria") <> '';

-- Category names cannot bypass deactivation by using different capitalization.
CREATE UNIQUE INDEX "Categoria_nombre_case_insensitive_key" ON "Categoria" (lower("nombre"));
CREATE UNIQUE INDEX "CategoriaNombre_nombre_case_insensitive_key" ON "CategoriaNombre" (lower("nombre"));
COMMIT;
