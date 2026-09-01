import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export const HIGHLIGHT_COLORS = ['amber', 'green', 'blue', 'pink', 'purple'] as const;

export class UpsertBibleMarkDto {
  // Nome do livro em português, como vem do JSON estático da Bíblia e
  // como aparece nas URLs do frontend (/oratio/biblia/:book/:chapter).
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

  // Rótulo pronto pra exibir ("João 3,16"). Snapshot — o backend não
  // monta isso, o cliente manda.
  @IsString()
  @IsNotEmpty({ message: 'A referência é obrigatória' })
  @MaxLength(60)
  reference: string;

  // Texto do versículo (snapshot). Evita o backend precisar do texto
  // bíblico, que só existe no bundle do frontend.
  @IsString()
  @IsNotEmpty({ message: 'O texto do versículo é obrigatório' })
  @MaxLength(4000)
  text: string;

  @IsOptional()
  @IsBoolean()
  highlighted?: boolean;

  // Cor do grifo. Ignorada quando highlighted é false.
  @IsOptional()
  @IsIn(HIGHLIGHT_COLORS, { message: 'Cor de grifo inválida' })
  highlightColor?: (typeof HIGHLIGHT_COLORS)[number];

  @IsOptional()
  @IsBoolean()
  favorite?: boolean;

  // Ausente = não mexe na nota atual. String vazia = apaga a nota.
  @IsOptional()
  @IsString()
  @MaxLength(5000, { message: 'Anotação muito longa (máximo 5000 caracteres).' })
  note?: string;
}
