import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateMatchScoreDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  homeScore: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  awayScore: number;
}
