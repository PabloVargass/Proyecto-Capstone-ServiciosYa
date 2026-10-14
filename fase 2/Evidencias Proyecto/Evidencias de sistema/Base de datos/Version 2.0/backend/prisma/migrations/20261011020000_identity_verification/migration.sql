CREATE TYPE "EstadoIdentidad" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA');
CREATE TABLE "SolicitudIdentidad" (
  "id" TEXT NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "estado" "EstadoIdentidad" NOT NULL DEFAULT 'PENDIENTE',
  "foto" BYTEA NOT NULL,
  "fotoTipo" TEXT NOT NULL,
  "certificado" BYTEA NOT NULL,
  "certificadoTipo" TEXT NOT NULL,
  "consentimientoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  "revisadoEn" TIMESTAMP(3),
  "revisadoPorId" TEXT,
  "motivoRevision" TEXT,
  CONSTRAINT "SolicitudIdentidad_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SolicitudIdentidad_tipos_check" CHECK ("fotoTipo" IN ('image/jpeg','image/png') AND "certificadoTipo" IN ('image/jpeg','image/png')),
  CONSTRAINT "SolicitudIdentidad_tamano_check" CHECK (octet_length("foto") BETWEEN 1 AND 2097152 AND octet_length("certificado") BETWEEN 1 AND 2097152)
);
CREATE UNIQUE INDEX "SolicitudIdentidad_usuarioId_key" ON "SolicitudIdentidad"("usuarioId");
CREATE INDEX "SolicitudIdentidad_estado_creadoEn_idx" ON "SolicitudIdentidad"("estado", "creadoEn");
ALTER TABLE "SolicitudIdentidad" ADD CONSTRAINT "SolicitudIdentidad_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SolicitudIdentidad" ADD CONSTRAINT "SolicitudIdentidad_revisadoPorId_fkey" FOREIGN KEY ("revisadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
