import { IsIn, IsString } from 'class-validator';

export class UpdateMatchStatusDto {
  @IsString()
  @IsIn(['upcoming', 'live', 'finished', 'locked', 'awaiting_result'])
  status!: 'upcoming' | 'live' | 'finished' | 'locked' | 'awaiting_result';
}
