import { IsNotEmpty, IsString } from 'class-validator';

export class CreatePrayerDto {

  @IsString({ message: 'O título é obrigatório' })
  @IsNotEmpty({ message: 'O título é obrigatório' })
  title: string;

  @IsString({ message: 'O conteúdo é obrigatório' })
  @IsNotEmpty({ message: 'O conteúdo é obrigatório' })
  content: string;

  @IsString({ message: 'A categoria é obrigatória' })
  @IsNotEmpty({ message: 'A categoria é obrigatória' })
  categoryId: string;

}
