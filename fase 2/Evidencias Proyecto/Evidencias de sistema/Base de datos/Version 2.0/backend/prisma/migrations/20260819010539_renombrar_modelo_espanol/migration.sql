-- =========================================================
-- RENOMBRAR ENUM DE TRABAJO SIN PERDER DATOS
-- =========================================================

ALTER TYPE "JobStatus" RENAME TO "EstadoTrabajo";

ALTER TYPE "EstadoTrabajo" RENAME VALUE 'PUBLISHED' TO 'PUBLICADO';
ALTER TYPE "EstadoTrabajo" RENAME VALUE 'MATCHED' TO 'ASIGNADO';
ALTER TYPE "EstadoTrabajo" RENAME VALUE 'IN_PROGRESS' TO 'EN_PROCESO';
ALTER TYPE "EstadoTrabajo" RENAME VALUE 'COMPLETED' TO 'COMPLETADO';
ALTER TYPE "EstadoTrabajo" RENAME VALUE 'CANCELLED' TO 'CANCELADO';


-- =========================================================
-- RENOMBRAR TABLA USER -> USUARIO
-- =========================================================

ALTER TABLE "User" RENAME TO "Usuario";

ALTER TABLE "Usuario" RENAME COLUMN "name" TO "nombre";
ALTER TABLE "Usuario" RENAME COLUMN "email" TO "correo";
ALTER TABLE "Usuario" RENAME COLUMN "phone" TO "telefono";
ALTER TABLE "Usuario" RENAME COLUMN "password" TO "contrasena";
ALTER TABLE "Usuario" RENAME COLUMN "createdAt" TO "creadoEn";
ALTER TABLE "Usuario" RENAME COLUMN "updatedAt" TO "actualizadoEn";

ALTER TABLE "Usuario"
RENAME CONSTRAINT "User_pkey" TO "Usuario_pkey";

ALTER INDEX "User_email_key"
RENAME TO "Usuario_correo_key";


-- =========================================================
-- RENOMBRAR TABLA JOB -> TRABAJO
-- =========================================================

ALTER TABLE "Job" RENAME TO "Trabajo";

ALTER TABLE "Trabajo" RENAME COLUMN "title" TO "titulo";
ALTER TABLE "Trabajo" RENAME COLUMN "description" TO "descripcion";
ALTER TABLE "Trabajo" RENAME COLUMN "category" TO "categoria";
ALTER TABLE "Trabajo" RENAME COLUMN "commune" TO "comuna";
ALTER TABLE "Trabajo" RENAME COLUMN "budget" TO "presupuesto";
ALTER TABLE "Trabajo" RENAME COLUMN "scheduledAt" TO "fechaTrabajo";
ALTER TABLE "Trabajo" RENAME COLUMN "status" TO "estado";
ALTER TABLE "Trabajo" RENAME COLUMN "createdAt" TO "creadoEn";
ALTER TABLE "Trabajo" RENAME COLUMN "updatedAt" TO "actualizadoEn";
ALTER TABLE "Trabajo" RENAME COLUMN "ownerId" TO "propietarioId";

ALTER TABLE "Trabajo"
RENAME CONSTRAINT "Job_pkey" TO "Trabajo_pkey";

ALTER TABLE "Trabajo"
RENAME CONSTRAINT "Job_ownerId_fkey" TO "Trabajo_propietarioId_fkey";


-- =========================================================
-- CREAR ENUM PARA LAS POSTULACIONES
-- =========================================================

CREATE TYPE "EstadoPostulacion" AS ENUM (
  'PENDIENTE',
  'ACEPTADA',
  'RECHAZADA',
  'CANCELADA'
);


-- =========================================================
-- CREAR TABLA POSTULACION
-- =========================================================

CREATE TABLE "Postulacion" (
    "id" TEXT NOT NULL,
    "estado" "EstadoPostulacion" NOT NULL DEFAULT 'PENDIENTE',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "trabajoId" TEXT NOT NULL,

    CONSTRAINT "Postulacion_pkey" PRIMARY KEY ("id")
);


-- =========================================================
-- EVITAR DOBLE POSTULACION AL MISMO TRABAJO
-- =========================================================

CREATE UNIQUE INDEX "Postulacion_usuarioId_trabajoId_key"
ON "Postulacion"("usuarioId", "trabajoId");


-- =========================================================
-- RELACIONES
-- =========================================================

ALTER TABLE "Postulacion"
ADD CONSTRAINT "Postulacion_usuarioId_fkey"
FOREIGN KEY ("usuarioId")
REFERENCES "Usuario"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "Postulacion"
ADD CONSTRAINT "Postulacion_trabajoId_fkey"
FOREIGN KEY ("trabajoId")
REFERENCES "Trabajo"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;