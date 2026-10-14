import { Test, TestingModule } from '@nestjs/testing';
import { ResenasService } from './resenas.service';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/jwt-auth.guard';
import { ResenasController } from './resenas.controller';

describe('ResenasController', () => {
  let controller: ResenasController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResenasController],
      providers: [{ provide: ResenasService, useValue: {} }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(OptionalJwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ResenasController>(ResenasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
