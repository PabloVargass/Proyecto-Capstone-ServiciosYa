import { Test, TestingModule } from '@nestjs/testing';
import { PostulacionesService } from './postulaciones.service';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/jwt-auth.guard';
import { PostulacionesController } from './postulaciones.controller';

describe('PostulacionesController', () => {
  let controller: PostulacionesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostulacionesController],
      providers: [{ provide: PostulacionesService, useValue: {} }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(OptionalJwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PostulacionesController>(PostulacionesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
