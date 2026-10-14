import { BadRequestException } from '@nestjs/common';
import {
  IdentityService,
  validateIdentityImage,
  validateIdentityCertificate,
} from './identity.service';
import { PDFDocument } from 'pdf-lib';
import { PrismaService } from '../prisma/prisma.service';

describe('Privacidad y validación de identidad', () => {
  async function pdfFile(pages = 1) {
    const document = await PDFDocument.create();
    if (pages) document.addPage();
    const buffer = Buffer.from(await document.save({ addDefaultPage: false }));
    return { buffer, size: buffer.length, mimetype: 'application/pdf' };
  }
  it('acepta un certificado PDF legible y conserva su tipo', async () => {
    const file = await pdfFile();
    expect(await validateIdentityCertificate(file)).toBe(file);
  });
  it('no acepta PDF como foto de rostro y cédula', async () => {
    const file = await pdfFile();
    expect(() => validateIdentityImage(file)).toThrow(BadRequestException);
  });
  it('rechaza un PDF falso aunque tenga cabecera y final', async () => {
    const buffer = Buffer.from('%PDF-1.7\ntexto falso\n%%EOF');
    await expect(
      validateIdentityCertificate({
        buffer,
        size: buffer.length,
        mimetype: 'application/pdf',
      }),
    ).rejects.toThrow(BadRequestException);
  });
  it('rechaza un certificado PDF sin páginas', async () => {
    await expect(validateIdentityCertificate(await pdfFile(0))).rejects.toThrow(
      BadRequestException,
    );
  });
  it('rechaza PDF marcado como cifrado en lugar de ignorar la contraseña', async () => {
    const document = await PDFDocument.create();
    document.addPage();
    document.context.trailerInfo.Encrypt = document.context.register(
      document.context.obj({ Filter: 'Standard' }),
    );
    const buffer = Buffer.from(await document.save());
    await expect(
      validateIdentityCertificate({
        buffer,
        size: buffer.length,
        mimetype: 'application/pdf',
      }),
    ).rejects.toThrow(
      'El certificado PDF debe ser legible y no tener contraseña.',
    );
  });
  it('rechaza PDF truncado, MIME falso y exceso de tamaño', async () => {
    const file = await pdfFile();
    const truncated = file.buffer.subarray(0, 30);
    await expect(
      validateIdentityCertificate({
        ...file,
        buffer: truncated,
        size: truncated.length,
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      validateIdentityCertificate({ ...file, mimetype: 'image/jpeg' }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      validateIdentityCertificate({ ...file, size: 2097153 }),
    ).rejects.toThrow(BadRequestException);
  });
  it('rechaza documentos ausentes y mayores de 2 MB', () => {
    expect(() => validateIdentityImage()).toThrow(BadRequestException);
    expect(() =>
      validateIdentityImage({
        buffer: Buffer.alloc(2097153),
        size: 2097153,
        mimetype: 'image/jpeg',
      }),
    ).toThrow(BadRequestException);
  });
  it('rechaza contenido que no coincide con el tipo declarado', () => {
    const buffer = Buffer.from('documento falso');
    expect(() =>
      validateIdentityImage({
        buffer,
        size: buffer.length,
        mimetype: 'image/jpeg',
      }),
    ).toThrow(BadRequestException);
  });
  it('limita la consulta del documento al propietario autenticado', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const identity = new IdentityService({
      solicitudIdentidad: { findFirst },
    } as unknown as PrismaService);
    await expect(
      identity.document('id', 'foto', 'propietario'),
    ).rejects.toThrow('Documento no encontrado.');
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'id', usuarioId: 'propietario' },
      select: { foto: true, fotoTipo: true },
    });
  });
  it.each([
    ['USUARIO', null, false],
    ['USUARIO', { estado: 'PENDIENTE' }, false],
    ['USUARIO', { estado: 'RECHAZADA' }, false],
    ['USUARIO', { estado: 'APROBADA' }, true],
    ['ADMIN', null, true],
  ])(
    'calcula permiso de publicación con rol %s e identidad %s',
    async (rol, identidad, expected) => {
      const service = new IdentityService({
        usuario: {
          findUniqueOrThrow: jest
            .fn()
            .mockResolvedValue({ rut: '12345678-5', rol, identidad }),
        },
      } as unknown as PrismaService);
      expect((await service.mine('user')).canPublish).toBe(expected);
    },
  );
});
