import {
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
  Min,
  Max,
  IsIn,
  IsNotEmpty,
  IsISO8601,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { communeNames, normalizeCommune } from '../communes';

export class UpdateJobDto {
  @IsOptional()
  @IsInt()
  @Min(180)
  @Max(1440)
  @IsIn([180, 360, 720, 1440])
  durationMinutes?: number;
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(3)
  title?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(10)
  description?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsNotEmpty()
  @IsString()
  category?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) => normalizeCommune(value))
  @IsIn([...communeNames], {
    message: 'Selecciona una comuna válida de Chile.',
  })
  @IsString()
  commune?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  budget?: number;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsISO8601(
    { strict: true, strictSeparator: true },
    { message: 'La fecha del trabajo no es válida.' },
  )
  @IsString()
  scheduledAt?: string;
}
