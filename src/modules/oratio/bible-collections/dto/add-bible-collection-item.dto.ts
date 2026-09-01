import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class AddBibleCollectionItemDto {
  @IsString()
  @IsNotEmpty({ message: 'O livro é obrigatório' })
  @MaxLength(60)
  book: string;

  @IsInt()
  @Min(1)
  chapter: number;

  @IsInt()
  @Min(1)
  verse: number;

  @IsString()
  @IsNotEmpty({ message: 'A referência é obrigatória' })
  @MaxLength(60)
  reference: string;

  @IsString()
  @IsNotEmpty({ message: 'O texto do versículo é obrigatório' })
  @MaxLength(4000)
  text: string;

  // Observação da pessoa sobre este versículo dentro desta coleção.
  @IsOptional()
  @IsString()
  @MaxLength(5000, { message: 'Observação muito longa (máximo 5000 caracteres).' })
  note?: string;
}
