import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';
import { CreateGroupDto } from './dto/create-group.dto';
import { JoinGroupDto } from './dto/join-group.dto';
import { GroupsService } from './groups.service';

@Controller('cravou/groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

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

  @Get(':id')
  getGroup(@Param('id') id: string, @Req() req: any) {
    return this.groupsService.getGroup(id, req.user.userId);
  }
}
