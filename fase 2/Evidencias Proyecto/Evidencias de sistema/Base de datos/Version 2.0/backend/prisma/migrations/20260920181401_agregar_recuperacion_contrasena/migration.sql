-- CreateTable
CREATE TABLE "TokenRecuperacion" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "usadoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT NOT NULL,

    CONSTRAINT "TokenRecuperacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TokenRecuperacion_tokenHash_key" ON "TokenRecuperacion"("tokenHash");

-- CreateIndex
CREATE INDEX "TokenRecuperacion_usuarioId_idx" ON "TokenRecuperacion"("usuarioId");

-- AddForeignKey
ALTER TABLE "TokenRecuperacion" ADD CONSTRAINT "TokenRecuperacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
