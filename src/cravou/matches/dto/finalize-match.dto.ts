import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class FinalizeMatchDto {
  @IsInt()
  @Min(0)
  @Max(99)
  homeScore!: number;

  @IsInt()
  @Min(0)
  @Max(99)
  awayScore!: number;

  @IsOptional()
  @IsString()
  penaltyWinner?: string;
}
