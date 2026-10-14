import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class VerifyEmailDto {
  @IsEmail(
    {},
    {
      message:
        'El correo electrónico no es válido.',
    },
  )
  email!: string;

  @IsString()
  @IsNotEmpty({
    message:
      'El código de verificación es obligatorio.',
  })
  @Length(6, 6, {
    message:
      'El código debe contener 6 dígitos.',
  })
  @Matches(/^\d{6}$/, {
    message:
      'El código debe contener únicamente números.',
  })
  codigo!: string;
}