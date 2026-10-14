import 'dotenv/config';
import { PrismaService } from '../src/prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { createInterface } from 'node:readline/promises';
class BootstrapError extends Error {}
async function bootstrap() {
  const correo = process.argv[2]?.trim().toLowerCase();
  if (!correo)
    throw new BootstrapError(
      'Uso: npm run admin:bootstrap -- correo-verificado',
    );
  const prompt = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const confirmation = await prompt.question(
    `Promover la cuenta verificada ${correo} como primer administrador. Escribe PROMOVER: `,
  );
  prompt.close();
  if (confirmation !== 'PROMOVER')
    throw new BootstrapError('Operación cancelada.');
  const prisma = new PrismaService();
  try {
    await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(736291)`;
        if (await tx.usuario.count({ where: { rol: 'ADMIN' } }))
          throw new BootstrapError(
            'Ya existe un administrador. Usa el panel para gestionar permisos.',
          );
        const user = await tx.usuario.findUnique({
          where: { correo },
          select: {
            id: true,
            activo: true,
            correoVerificadoEn: true,
            contrasena: true,
          },
        });
        if (!user?.activo || !user.correoVerificadoEn || !user.contrasena)
          throw new BootstrapError(
            'Se requiere una cuenta local activa, con contraseña y correo verificado mediante el registro existente.',
          );
        await tx.usuario.update({
          where: { id: user.id },
          data: { rol: 'ADMIN', versionSesion: { increment: 1 } },
        });
        await tx.auditoriaAdministrativa.create({
          data: {
            actorId: user.id,
            accion: 'PRIMER_ADMINISTRADOR',
            recurso: 'Usuario',
            recursoId: user.id,
            motivo: 'Promoción local confirmada por operador del backend',
            cambios: { rol: 'ADMIN' },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    console.log(
      'Primer administrador creado. Inicia una sesión nueva en el panel.',
    );
  } finally {
    await prisma.$disconnect();
  }
}
bootstrap().catch((error: unknown) => {
  console.error(
    error instanceof BootstrapError
      ? error.message
      : 'No se completó la promoción. Comprueba la conexión y las migraciones del backend; no se muestran diagnósticos de conexión para proteger su configuración.',
  );
  process.exitCode = 1;
});
