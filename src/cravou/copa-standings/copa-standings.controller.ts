import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';
import { AdminGuard } from '../admin/admin.guard';
import { CopaStandingsService } from './copa-standings.service';

@Controller('cravou/copa')
export class CopaStandingsController {
  constructor(private readonly standingsService: CopaStandingsService) {}

  @Get('groups')
  getAllGroups() {
    return this.standingsService.getAllGroups();
  }

  @Get('groups/:letter')
  getGroup(@Param('letter') letter: string) {
    return this.standingsService.getGroupWithMatches(letter);
  }

  @Get('standings/thirds')
  getThirds() {
    return this.standingsService.getThirdsRanking();
  }

  @Get('standings/qualified')
  getQualified() {
    return this.standingsService.getQualified();
  }

  @Patch('admin/standings/:group/positions')
  @UseGuards(JwtAuthGuard, AdminGuard)
  overridePositions(
    @Param('group') group: string,
    @Body() body: { positions: { teamName: string; position: number; isQualified: boolean }[] },
  ) {
    return this.standingsService.overridePositions(group, body.positions);
  }
}
