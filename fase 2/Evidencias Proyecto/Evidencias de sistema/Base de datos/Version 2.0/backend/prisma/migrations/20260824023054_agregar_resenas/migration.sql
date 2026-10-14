-- CreateTable
CREATE TABLE "Resena" (
    "id" TEXT NOT NULL,
    "puntuacion" INTEGER NOT NULL,
    "comentario" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "trabajoId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "receptorId" TEXT NOT NULL,

    CONSTRAINT "Resena_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Resena_trabajoId_autorId_receptorId_key" ON "Resena"("trabajoId", "autorId", "receptorId");

-- AddForeignKey
ALTER TABLE "Resena" ADD CONSTRAINT "Resena_trabajoId_fkey" FOREIGN KEY ("trabajoId") REFERENCES "Trabajo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resena" ADD CONSTRAINT "Resena_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resena" ADD CONSTRAINT "Resena_receptorId_fkey" FOREIGN KEY ("receptorId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
