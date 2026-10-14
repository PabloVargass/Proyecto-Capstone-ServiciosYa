import {
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateProfileDto {
  // =====================================
  // NOMBRE
  // =====================================

  @IsOptional()
  @IsString({
    message:
      'El nombre debe ser un texto válido.',
  })
  @MinLength(2, {
    message:
      'El nombre debe tener al menos 2 caracteres.',
  })
  @MaxLength(100, {
    message:
      'El nombre no puede superar los 100 caracteres.',
  })
  name?: string;

  // =====================================
  // TELÉFONO
  // =====================================

  @IsOptional()
  @IsString({
    message:
      'El teléfono debe ser un texto válido.',
  })
  @Length(9, 9, {
    message:
      'El teléfono debe contener 9 dígitos.',
  })
  @Matches(/^[0-9]{9}$/, {
    message:
      'El teléfono debe contener solo números.',
  })
  phone?: string;
}