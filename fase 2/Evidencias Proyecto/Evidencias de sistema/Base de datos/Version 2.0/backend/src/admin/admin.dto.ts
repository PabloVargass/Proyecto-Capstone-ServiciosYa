import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class ReasonDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  motivo!: string;
}
export class AccessDto extends ReasonDto {
  @IsOptional() @IsIn(['USUARIO', 'ADMIN']) rol?: 'USUARIO' | 'ADMIN';
  @IsOptional() @IsBoolean() activo?: boolean;
}
export class ProfileDto extends ReasonDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  nombre!: string;
  @IsOptional() @Matches(/^\d{9}$/) telefono?: string;
}
export class InviteDto extends ReasonDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  nombre!: string;
  @IsEmail() @MaxLength(254) correo!: string;
  @IsString() @MaxLength(15) rut!: string;
  @Matches(/^\d{9}$/) telefono!: string;
}
export class AcceptInviteDto {
  @IsEmail() correo!: string;
  @IsString() @Length(64, 64) @Matches(/^[a-f0-9]+$/) codigo!: string;
  @IsString() @MinLength(6) @MaxLength(72) password!: string;
}
export class CategoryDto extends ReasonDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre!: string;
  @IsOptional() @IsBoolean() activo?: boolean;
}
export class ModerationDto extends ReasonDto {
  @IsBoolean() oculto!: boolean;
}
export class IdentityReviewDto extends ReasonDto {
  @IsBoolean() aprobada!: boolean;
}
