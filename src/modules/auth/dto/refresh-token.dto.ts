import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {

  @IsString({ message: 'Refresh token é obrigatório' })
  @IsNotEmpty({ message: 'Refresh token é obrigatório' })
  refresh_token: string;

}
