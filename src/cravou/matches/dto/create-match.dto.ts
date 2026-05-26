import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

const PHASES = ['group_stage', 'round_of_32', 'round_of_16', 'quarterfinal', 'semifinal', 'third_place', 'final'];

export class CreateMatchDto {
  @IsString()
  @MinLength(2)
  homeTeam: string;

  @IsString()
  @MinLength(2)
  awayTeam: string;

  @IsDateString()
  matchDate: string;

  @IsIn(PHASES)
  phase: string;

  @IsOptional()
  @IsString()
  groupName?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  groupRound?: number;

  @IsOptional()
  @IsString()
  stadium?: string;
}
