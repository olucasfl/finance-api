import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class TimezoneDto {
  @IsString()
  @IsNotEmpty({ message: 'timezone é obrigatório' })
  @MaxLength(100)
  timezone: string;
}

export class UnsubscribeDto {
  @IsString()
  @IsNotEmpty({ message: 'endpoint é obrigatório' })
  @MaxLength(1000)
  endpoint: string;
}
