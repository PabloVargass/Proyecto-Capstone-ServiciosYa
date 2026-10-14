import { ValidationPipe } from '@nestjs/common';
import { CreateJobDto } from './create-job.dto';
import { UpdateJobDto } from './update-job.dto';
import { communeNames } from '../communes';

const pipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});
const valid = {
  title: 'Armado de escritorio',
  description: 'Necesito armar un escritorio',
  category: 'Armado de mueble',
  commune: 'Santiago',
  budget: 25000,
};
async function validate(
  value: object,
  metatype: typeof CreateJobDto | typeof UpdateJobDto,
): Promise<CreateJobDto | UpdateJobDto> {
  const result: unknown = await pipe.transform(value, {
    type: 'body',
    metatype,
  });
  return result as CreateJobDto | UpdateJobDto;
}
describe('Validación de publicaciones en el servidor', () => {
  it.each([CreateJobDto, UpdateJobDto])(
    'rechaza campos vacíos o inválidos al crear y editar %p',
    async (dto) => {
      for (const change of [
        { title: '   ' },
        { title: ' a ' },
        { description: '          ' },
        { category: '  ' },
        { commune: 'Comuna inexistente' },
        { commune: null },
        { title: null },
        { description: null },
        { category: null },
        { scheduledAt: 'no-es-fecha' },
        { scheduledAt: '2026-02-30T10:00:00Z' },
        { scheduledAt: null },
      ]) {
        await expect(
          validate({ ...valid, ...change }, dto),
        ).rejects.toMatchObject({ status: 400 });
      }
    },
  );
  it('limpia espacios y conserva la comuna oficial y la fecha ISO válida', async () => {
    const result = await validate(
      {
        ...valid,
        title: ' Armado de escritorio ',
        description: ' Necesito armar un escritorio ',
        commune: ' ñuñoa ',
        scheduledAt: '2026-10-15T15:00:00-03:00',
      },
      CreateJobDto,
    );
    expect(result.title).toBe(valid.title);
    expect(result.description).toBe(valid.description);
    expect(result.commune).toBe('Ñuñoa');
    expect(result.scheduledAt).toBe('2026-10-15T15:00:00-03:00');
  });
  it('acepta las 346 comunas del catálogo móvil y permite editar otro campo sin cambiar la comuna histórica', async () => {
    expect(communeNames).toHaveLength(346);
    for (const commune of communeNames)
      await expect(
        validate({ ...valid, commune }, CreateJobDto),
      ).resolves.toMatchObject({ commune });
    await expect(
      validate({ budget: 30000 }, UpdateJobDto),
    ).resolves.toMatchObject({ budget: 30000 });
  });
});
