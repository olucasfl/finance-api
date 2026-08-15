import { IsString, MaxLength } from 'class-validator';

export class SavePenanceDto {

  // Texto livre: a pessoa anota o que se propôs a oferecer nos 40 dias
  // (jejum, renúncias, esmola...). Vazio é válido — é como ela apaga.
  @IsString({ message: 'As penitências precisam ser um texto.' })
  @MaxLength(4000, { message: 'Texto muito longo (máximo 4000 caracteres).' })
  content: string;

}
