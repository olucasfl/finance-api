import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePredictionDto {
  @IsString()
  @IsUUID()
  matchId: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  homeScore: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  awayScore: number;

  @IsOptional()
  @IsString()
  penaltyWinner?: string;
}
