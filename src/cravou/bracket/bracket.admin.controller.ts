import { Body, Controller, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';
import { AdminGuard } from '../admin/admin.guard';
import { BracketService } from './bracket.service';

@Controller('cravou/admin/bracket')
@UseGuards(JwtAuthGuard, AdminGuard)
export class BracketAdminController {
  constructor(private readonly bracketService: BracketService) {}

  @Post('initialize-all')
  initializeAll() {
    return this.bracketService.initializeAllSlots();
  }

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
    @Body() body: { homeTeam?: string | null; awayTeam?: string | null },
  ) {
    return this.bracketService.overrideSlotTeams(slotId, body);
  }

  @Post('sync-r32-teams')
  syncR32Teams() {
    return this.bracketService.refreshR32TeamsFromStandings();
  }

  @Post(':slotId/reset-result')
  resetResult(@Param('slotId') slotId: string) {
    return this.bracketService.resetKnockoutResult(slotId);
  }

  @Post(':slotId/create-match')
  createMatch(
    @Param('slotId') slotId: string,
    @Body() body: { matchDate: string },
  ) {
    return this.bracketService.createMatchFromSlot(slotId, body.matchDate);
  }

  @Post(':slotId/unlink-match')
  unlinkMatch(@Param('slotId') slotId: string) {
    return this.bracketService.unlinkMatchFromSlot(slotId);
  }
}
