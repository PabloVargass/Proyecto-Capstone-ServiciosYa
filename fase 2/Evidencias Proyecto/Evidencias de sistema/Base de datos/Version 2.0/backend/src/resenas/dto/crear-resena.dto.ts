import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CrearResenaDto {
  @IsString()
  @IsNotEmpty()
  trabajoId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  puntuacion: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comentario?: string;
}