import { IsString, Matches, MaxLength } from 'class-validator';

export class RenameBibleCollectionDto {
  @IsString()
  @Matches(/\S/, { message: 'Dê um nome à coleção' })
  @MaxLength(60, { message: 'Nome muito longo (máximo 60 caracteres).' })
  name: string;
}
