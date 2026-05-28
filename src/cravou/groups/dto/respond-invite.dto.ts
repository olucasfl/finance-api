import { IsString, IsIn } from 'class-validator';

export class RespondInviteDto {
  @IsString()
  @IsIn(['accepted', 'declined'])
  status: 'accepted' | 'declined';
}
