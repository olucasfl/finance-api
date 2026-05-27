import { IsDateString } from 'class-validator';

export class UpdateMatchDateDto {
  @IsDateString()
  matchDate!: string;
}
