import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SubscribePushDto {
  @IsString()
  @IsNotEmpty({ message: 'endpoint é obrigatório' })
  @MaxLength(1000)
  endpoint: string;

  @IsString()
  @IsNotEmpty({ message: 'p256dh é obrigatório' })
  @MaxLength(500)
  p256dh: string;

  @IsString()
  @IsNotEmpty({ message: 'auth é obrigatório' })
  @MaxLength(500)
  auth: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  timezone?: string;
}
