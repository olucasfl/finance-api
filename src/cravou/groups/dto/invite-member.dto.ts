import { IsString, IsNotEmpty } from 'class-validator';

export class InviteMemberDto {
  @IsString()
  @IsNotEmpty()
  inviteeId: string;
}
