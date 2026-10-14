import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty({
    message: 'El nombre es obligatorio.',
  })
  @MinLength(3, {
    message: 'El nombre debe tener al menos 3 caracteres.',
  })
  name!: string;

  @IsString()
  @IsNotEmpty({
    message: 'El RUT es obligatorio.',
  })
  rut!: string;

  @IsEmail(
    {},
    {
      message: 'El correo electrónico no es válido.',
    },
  )
  email!: string;

  @IsString()
  @Length(9, 9, {
    message: 'El teléfono debe contener 9 dígitos.',
  })
  phone!: string;

  @IsString()
  @MinLength(6, {
    message: 'La contraseña debe tener al menos 6 caracteres.',
  })
  password!: string;
}