import { IsIn, IsString } from 'class-validator';

export class UpdateMatchStatusDto {
  @IsString()
  @IsIn(['upcoming', 'live', 'finished', 'locked'])
  status: 'upcoming' | 'live' | 'finished' | 'locked';
}
