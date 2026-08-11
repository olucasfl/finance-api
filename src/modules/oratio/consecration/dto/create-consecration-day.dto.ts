import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateConsecrationDayDto {

  @IsInt()
  @Min(1)
  dayNumber: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  @IsNotEmpty()
  stageId: string;

}
