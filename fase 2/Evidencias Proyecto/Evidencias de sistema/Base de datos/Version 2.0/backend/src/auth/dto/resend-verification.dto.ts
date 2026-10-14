import {
  IsEmail,
  IsNotEmpty,
} from 'class-validator';

export class ResendVerificationDto {
  @IsNotEmpty({
    message:
      'El correo electrónico es obligatorio.',
  })
  @IsEmail(
    {},
    {
      message:
        'El correo electrónico no es válido.',
    },
  )
  email!: string;
}