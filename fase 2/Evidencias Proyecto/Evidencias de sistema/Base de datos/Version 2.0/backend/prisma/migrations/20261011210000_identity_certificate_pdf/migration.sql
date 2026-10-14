-- Amplía solo el tipo del certificado. Las fotos y límites existentes se conservan.
ALTER TABLE "SolicitudIdentidad" DROP CONSTRAINT "SolicitudIdentidad_tipos_check";
ALTER TABLE "SolicitudIdentidad" ADD CONSTRAINT "SolicitudIdentidad_tipos_check"
  CHECK ("fotoTipo" IN ('image/jpeg', 'image/png')
    AND "certificadoTipo" IN ('image/jpeg', 'image/png', 'application/pdf'));
