import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyEmailDto {

  @IsString({ message: 'Token é obrigatório' })
  @IsNotEmpty({ message: 'Token é obrigatório' })
  token: string;

}
