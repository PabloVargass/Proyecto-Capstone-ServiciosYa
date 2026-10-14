import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export enum PublicationKind {
  OPORTUNIDAD = 'OPORTUNIDAD',
  SERVICIO = 'SERVICIO',
}

export class PublicationQueryDto {
  @IsOptional()
  @IsEnum(PublicationKind)
  kind?: PublicationKind;

  @IsOptional()
  @IsUUID()
  ownerId?: string;
}
