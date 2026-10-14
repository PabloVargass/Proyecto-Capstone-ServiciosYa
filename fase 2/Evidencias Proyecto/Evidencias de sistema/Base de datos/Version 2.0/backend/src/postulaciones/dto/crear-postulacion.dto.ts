import {
  IsNotEmpty,
  IsString,
} from 'class-validator';

export class CrearPostulacionDto {
  @IsString()
  @IsNotEmpty()
  trabajoId: string;
}