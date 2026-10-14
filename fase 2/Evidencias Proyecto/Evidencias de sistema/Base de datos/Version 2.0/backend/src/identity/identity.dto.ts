import { IsIn, IsString, MaxLength } from 'class-validator';

export class SubmitIdentityDto {
  @IsString() @MaxLength(15) rut!: string;
  @IsIn(['true']) consentimiento!: string;
}
