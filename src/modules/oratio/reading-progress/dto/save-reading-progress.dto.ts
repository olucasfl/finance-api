import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ReadingKind } from '@prisma/client';

export class SaveReadingProgressDto {

  @IsEnum(ReadingKind, { message: 'Tipo de leitura inválido' })
  kind: ReadingKind;

  // Ponteiro que a UI usa pra navegar de volta (ex.: "genesis/3" ou a
  // página do PDF do Catecismo). Não é exibido cru pra pessoa.
  @IsString({ message: 'A referência é obrigatória' })
  @IsNotEmpty({ message: 'A referência é obrigatória' })
  @MaxLength(200)
  reference: string;

  // Texto amigável mostrado na Home ("Gênesis 3", "Catecismo · pág. 128").
  @IsString({ message: 'O rótulo é obrigatório' })
  @IsNotEmpty({ message: 'O rótulo é obrigatório' })
  @MaxLength(200)
  label: string;

}
