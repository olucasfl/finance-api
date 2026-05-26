import { Body, Controller, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';
import { AdminGuard } from '../admin/admin.guard';
import { BracketService } from './bracket.service';

@Controller('cravou/admin/bracket')
@UseGuards(JwtAuthGuard, AdminGuard)
export class BracketAdminController {
  constructor(private readonly bracketService: BracketService) {}

  @Post('mount-r32')
  mountR32() {
    return this.bracketService.mountR32();
  }

  @Post(':slotId/result')
  setResult(
    @Param('slotId') slotId: string,
    @Body() body: { winnerTeam: string },
  ) {
    return this.bracketService.setKnockoutResult(slotId, body.winnerTeam);
  }

  @Patch(':slotId/teams')
  overrideTeams(
    @Param('slotId') slotId: string,
    @Body() body: { homeTeam?: string; awayTeam?: string },
  ) {
    return this.bracketService.overrideSlotTeams(slotId, body);
  }
}
