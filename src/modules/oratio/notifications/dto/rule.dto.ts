import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateRuleDto {
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

  @IsInt()
  @Min(0)
  @Max(23)
  @IsOptional()
  hour?: number;

  @IsString()
  @IsOptional()
  @MaxLength(60)
  condition?: string;
}

export class UpdateRuleDto {
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  title?: string;

  // null permitido para limpar o campo
  @IsString()
  @IsOptional()
  @MaxLength(500)
  body?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  url?: string | null;

  @IsInt()
  @Min(0)
  @Max(23)
  @IsOptional()
  hour?: number | null;
}
