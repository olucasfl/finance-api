import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {

  @IsEmail({}, { message: 'Informe um email válido' })
  @Transform(({ value }) => value?.trim().toLowerCase())
  email: string;

  @IsString({ message: 'A senha é obrigatória' })
  @IsNotEmpty({ message: 'A senha é obrigatória' })
  password: string;

}
