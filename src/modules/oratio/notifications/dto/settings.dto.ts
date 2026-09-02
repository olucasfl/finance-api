import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

// PATCH parcial do bloco de config do funil. Todos os campos são opcionais
// (o admin manda só o que mudou). As faixas evitam valores que quebrariam
// o scheduler (hora fora de 0–23, teto negativo, etc.). Campos fora desta
// lista são rejeitados pelo ValidationPipe global (`forbidNonWhitelisted`).
export class UpdateSettingsDto {
  @IsInt()
  @Min(0)
  @Max(10)
  @IsOptional()
  maxPerDay?: number;

  @IsInt()
  @Min(0)
  @Max(10)
  @IsOptional()
  maxNudgesPerDay?: number;

  @IsInt()
  @Min(0)
  @Max(23)
  @IsOptional()
  quietStart?: number;

  @IsInt()
  @Min(0)
  @Max(23)
  @IsOptional()
  quietEnd?: number;

  @IsInt()
  @Min(0)
  @Max(24)
  @IsOptional()
  spacingHours?: number;

  @IsBoolean()
  @IsOptional()
  restGapEnabled?: boolean;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  urgentThreshold?: number;
}
