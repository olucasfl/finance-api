import { IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';

export class ResendVerificationDto {

  @IsEmail({}, { message: 'Informe um email válido' })
  @Transform(({ value }) => value?.trim().toLowerCase())
  email: string;

}
