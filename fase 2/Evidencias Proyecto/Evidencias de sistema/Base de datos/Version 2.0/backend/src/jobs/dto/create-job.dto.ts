import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
  IsEnum,
  IsIn,
  Min,
  Max,
  IsISO8601,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { communeNames, normalizeCommune } from '../communes';
import { PublicationKind } from './publication-query.dto';

export class CreateJobDto {
  @IsOptional()
  @IsEnum(PublicationKind)
  kind?: PublicationKind;

  @IsOptional()
  @IsInt()
  @Min(180)
  @Max(1440)
  @IsIn([180, 360, 720, 1440])
  durationMinutes?: number;
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  title!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  description!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  category!: string;

  @Transform(({ value }: { value: unknown }) => normalizeCommune(value))
  @IsIn([...communeNames], {
    message: 'Selecciona una comuna válida de Chile.',
  })
  @IsString()
  @IsNotEmpty()
  commune!: string;

  @IsInt()
  @IsPositive()
  budget!: number;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsISO8601(
    { strict: true, strictSeparator: true },
    { message: 'La fecha del trabajo no es válida.' },
  )
  @IsString()
  scheduledAt?: string;
}
