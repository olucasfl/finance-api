import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';
import { CreateGroupDto } from './dto/create-group.dto';
import { EditGroupDto } from './dto/edit-group.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { JoinGroupDto } from './dto/join-group.dto';
import { RespondInviteDto } from './dto/respond-invite.dto';
import { GroupsService } from './groups.service';

@Controller('cravou/groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  // ─── Grupos ──────────────────────────────────────────────────────────────────

  @Post()
  create(@Req() req: any, @Body() dto: CreateGroupDto) {
    return this.groupsService.create(req.user.userId, dto);
  }

  @Post('join')
  join(@Req() req: any, @Body() dto: JoinGroupDto) {
    return this.groupsService.join(req.user.userId, dto);
  }

  @Get('my')
  getMyGroups(@Req() req: any) {
    return this.groupsService.getMyGroups(req.user.userId);
  }

  @Patch(':id')
  editGroup(@Param('id') id: string, @Req() req: any, @Body() dto: EditGroupDto) {
    return this.groupsService.editGroup(id, req.user.userId, dto);
  }

  @Delete(':id')
  deleteGroup(@Param('id') id: string, @Req() req: any) {
    return this.groupsService.deleteGroup(id, req.user.userId);
  }

  @Delete(':id/leave')
  leaveGroup(@Param('id') id: string, @Req() req: any) {
    return this.groupsService.leaveGroup(id, req.user.userId);
  }

  @Delete(':id/members/:userId')
  removeMember(@Param('id') id: string, @Param('userId') targetUserId: string, @Req() req: any) {
    return this.groupsService.removeMember(id, req.user.userId, targetUserId);
  }

  // ─── Convites ─────────────────────────────────────────────────────────────────

  @Get('search-users')
  searchUsers(@Query('q') q: string, @Query('groupId') groupId: string, @Req() req: any) {
    return this.groupsService.searchUsers(q, groupId, req.user.userId);
  }

  @Post(':id/invite')
  sendInvite(@Param('id') id: string, @Req() req: any, @Body() dto: InviteMemberDto) {
    return this.groupsService.sendInvite(id, req.user.userId, dto);
  }

  @Get('invites/pending')
  getPendingInvites(@Req() req: any) {
    return this.groupsService.getPendingInvites(req.user.userId);
  }

  @Patch('invites/:inviteId')
  respondToInvite(@Param('inviteId') inviteId: string, @Req() req: any, @Body() dto: RespondInviteDto) {
    return this.groupsService.respondToInvite(inviteId, req.user.userId, dto);
  }

  // ─── Palpites do grupo ───────────────────────────────────────────────────────

  @Get(':id/finished-matches')
  getGroupFinishedMatches(@Param('id') id: string, @Req() req: any) {
    return this.groupsService.getGroupFinishedMatches(id, req.user.userId);
  }

  @Get(':id/palpitavel-matches')
  getGroupPalpitavelMatches(@Param('id') id: string, @Req() req: any) {
    return this.groupsService.getGroupPalpitavelMatches(id, req.user.userId);
  }

  @Get(':id/matches/:matchId/palpites')
  getGroupMatchPalpites(@Param('id') id: string, @Param('matchId') matchId: string, @Req() req: any) {
    return this.groupsService.getGroupMatchPalpites(id, matchId, req.user.userId);
  }

  // ─── Detalhe (deve ficar por último para não conflitar com rotas acima) ───────

  @Get(':id')
  getGroup(@Param('id') id: string, @Req() req: any) {
    return this.groupsService.getGroup(id, req.user.userId);
  }
}
