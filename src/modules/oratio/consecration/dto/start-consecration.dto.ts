import { IsNotEmpty, Matches } from 'class-validator';

export class StartConsecrationDto {

  // yyyy-mm-dd — o controller monta a Date localmente a partir das 3 partes,
  // então validamos o formato aqui em vez de aceitar qualquer IsDateString.
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'consecrationDate deve estar no formato AAAA-MM-DD',
  })
  consecrationDate: string;

}
