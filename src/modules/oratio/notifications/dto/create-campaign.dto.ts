import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty({ message: 'O título é obrigatório' })
  @MaxLength(120)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  body?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  url?: string;

  @IsIn(['ALL', 'SPECIFIC'], { message: 'audience inválido' })
  audience: 'ALL' | 'SPECIFIC';

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5000)
  @IsOptional()
  userIds?: string[];
}
