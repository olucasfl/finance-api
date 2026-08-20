import { IsNotEmpty, IsString } from 'class-validator';

export class DeleteAccountDto {

  @IsString({ message: 'Senha é obrigatória' })
  @IsNotEmpty({ message: 'Senha é obrigatória' })
  password: string;

}
