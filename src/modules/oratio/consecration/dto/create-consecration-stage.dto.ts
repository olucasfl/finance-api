import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateConsecrationStageDto {

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(1)
  order: number;

  @IsInt()
  @Min(1)
  days: number;

}
