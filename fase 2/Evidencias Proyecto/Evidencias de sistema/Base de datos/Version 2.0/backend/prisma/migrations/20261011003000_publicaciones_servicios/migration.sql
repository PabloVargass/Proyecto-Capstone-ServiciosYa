CREATE TYPE "TipoPublicacion" AS ENUM ('OPORTUNIDAD', 'SERVICIO');

ALTER TABLE "Trabajo"
  ADD COLUMN "tipo" "TipoPublicacion" NOT NULL DEFAULT 'OPORTUNIDAD',
  ADD COLUMN "venceEn" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP + interval '24 hours'),
  ADD COLUMN "servicioOrigenId" TEXT;

CREATE TABLE "OfertaServicio" (
  "id" TEXT NOT NULL,
  "servicioId" TEXT NOT NULL,
  "solicitanteId" TEXT NOT NULL,
  "importe" INTEGER NOT NULL,
  "estado" "EstadoPostulacion" NOT NULL DEFAULT 'PENDIENTE',
  "trabajoId" TEXT NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OfertaServicio_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OfertaServicio_importe_check" CHECK ("importe" > 0)
);
CREATE UNIQUE INDEX "OfertaServicio_trabajoId_key" ON "OfertaServicio"("trabajoId");
CREATE UNIQUE INDEX "OfertaServicio_servicioId_solicitanteId_key" ON "OfertaServicio"("servicioId", "solicitanteId");
ALTER TABLE "Trabajo" ADD CONSTRAINT "Trabajo_servicioOrigenId_fkey" FOREIGN KEY ("servicioOrigenId") REFERENCES "Trabajo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OfertaServicio" ADD CONSTRAINT "OfertaServicio_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Trabajo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OfertaServicio" ADD CONSTRAINT "OfertaServicio_solicitanteId_fkey" FOREIGN KEY ("solicitanteId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OfertaServicio" ADD CONSTRAINT "OfertaServicio_trabajoId_fkey" FOREIGN KEY ("trabajoId") REFERENCES "Trabajo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
