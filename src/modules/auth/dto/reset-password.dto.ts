import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class ResetPasswordDto {

  @IsString({ message: 'Token é obrigatório' })
  @IsNotEmpty({ message: 'Token é obrigatório' })
  token: string;

  @MinLength(8, { message: 'A senha deve ter pelo menos 8 caracteres' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'A senha deve conter pelo menos uma letra e um número',
  })
  password: string;

}
