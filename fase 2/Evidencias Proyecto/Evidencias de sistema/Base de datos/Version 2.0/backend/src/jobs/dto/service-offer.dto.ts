import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ServiceOfferDto {
  @IsBoolean()
  acceptPublishedPrice!: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2147483647)
  amount?: number;
}
