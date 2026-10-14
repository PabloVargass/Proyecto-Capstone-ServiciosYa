/*
  Warnings:

  - A unique constraint covering the columns `[googleId]` on the table `Usuario` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ProveedorAutenticacion" AS ENUM ('LOCAL', 'GOOGLE');

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "googleId" TEXT,
ADD COLUMN     "proveedor" "ProveedorAutenticacion" NOT NULL DEFAULT 'LOCAL',
ALTER COLUMN "telefono" DROP NOT NULL,
ALTER COLUMN "contrasena" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_googleId_key" ON "Usuario"("googleId");
