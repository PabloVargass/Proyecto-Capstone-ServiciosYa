-- CreateTable
CREATE TABLE "Conversacion" (
    "id" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "trabajoId" TEXT NOT NULL,
    "postulacionId" TEXT NOT NULL,
    "propietarioId" TEXT NOT NULL,
    "trabajadorId" TEXT NOT NULL,

    CONSTRAINT "Conversacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mensaje" (
    "id" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "leido" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conversacionId" TEXT NOT NULL,
    "remitenteId" TEXT NOT NULL,

    CONSTRAINT "Mensaje_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Conversacion_trabajoId_key" ON "Conversacion"("trabajoId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversacion_postulacionId_key" ON "Conversacion"("postulacionId");

-- AddForeignKey
ALTER TABLE "Conversacion" ADD CONSTRAINT "Conversacion_trabajoId_fkey" FOREIGN KEY ("trabajoId") REFERENCES "Trabajo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversacion" ADD CONSTRAINT "Conversacion_postulacionId_fkey" FOREIGN KEY ("postulacionId") REFERENCES "Postulacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversacion" ADD CONSTRAINT "Conversacion_propietarioId_fkey" FOREIGN KEY ("propietarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversacion" ADD CONSTRAINT "Conversacion_trabajadorId_fkey" FOREIGN KEY ("trabajadorId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mensaje" ADD CONSTRAINT "Mensaje_conversacionId_fkey" FOREIGN KEY ("conversacionId") REFERENCES "Conversacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mensaje" ADD CONSTRAINT "Mensaje_remitenteId_fkey" FOREIGN KEY ("remitenteId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
