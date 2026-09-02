import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateVariantDto {
  @IsString()
  @IsOptional()
  @MaxLength(120)
  title?: string | null;

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
  @Max(99)
  @IsOptional()
  order?: number;
}

export class UpdateVariantDto extends CreateVariantDto {
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}
