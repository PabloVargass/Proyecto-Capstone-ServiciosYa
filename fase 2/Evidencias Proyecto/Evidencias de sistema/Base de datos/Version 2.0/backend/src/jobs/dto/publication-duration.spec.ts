import { validate } from 'class-validator';
import { CreateJobDto } from './create-job.dto';
import { UpdateJobDto } from './update-job.dto';
describe.each([CreateJobDto, UpdateJobDto])(
  'Duraciones ofrecidas en %s',
  (Dto) => {
    it.each([180, 360, 720, 1440, 120, 240, 270, 1441])(
      'valida %s minutos',
      async (minutes) => {
        const dto = Object.assign(new Dto(), {
          title: 'Prueba de publicación',
          description: 'Descripción de prueba ficticia',
          category: 'Limpieza',
          commune: 'Santiago',
          budget: 10000,
          durationMinutes: minutes,
        });
        const errors = await validate(dto);
        expect(
          errors.some((error) => error.property === 'durationMinutes'),
        ).toBe(![180, 360, 720, 1440].includes(minutes));
      },
    );
  },
);
