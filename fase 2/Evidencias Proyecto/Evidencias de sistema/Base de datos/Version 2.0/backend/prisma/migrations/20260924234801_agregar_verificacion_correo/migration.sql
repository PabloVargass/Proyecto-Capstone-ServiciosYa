-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "correoVerificadoEn" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TokenVerificacionCorreo" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "usadoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT NOT NULL,

    CONSTRAINT "TokenVerificacionCorreo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TokenVerificacionCorreo_tokenHash_key" ON "TokenVerificacionCorreo"("tokenHash");

-- CreateIndex
CREATE INDEX "TokenVerificacionCorreo_usuarioId_idx" ON "TokenVerificacionCorreo"("usuarioId");

-- AddForeignKey
ALTER TABLE "TokenVerificacionCorreo" ADD CONSTRAINT "TokenVerificacionCorreo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
