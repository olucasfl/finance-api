import { IsNotEmpty, IsString } from 'class-validator';

export class CreatePrayerCategoryDto {

  @IsString({ message: 'O nome é obrigatório' })
  @IsNotEmpty({ message: 'O nome é obrigatório' })
  name: string;

  @IsString({ message: 'O slug é obrigatório' })
  @IsNotEmpty({ message: 'O slug é obrigatório' })
  slug: string;

}
