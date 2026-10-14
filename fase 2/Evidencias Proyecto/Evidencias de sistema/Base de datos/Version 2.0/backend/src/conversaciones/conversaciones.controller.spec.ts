import { Test, TestingModule } from '@nestjs/testing';
import { ConversacionesService } from './conversaciones.service';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/jwt-auth.guard';
import { ConversacionesController } from './conversaciones.controller';

describe('ConversacionesController', () => {
  let controller: ConversacionesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConversacionesController],
      providers: [{ provide: ConversacionesService, useValue: {} }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(OptionalJwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ConversacionesController>(ConversacionesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
