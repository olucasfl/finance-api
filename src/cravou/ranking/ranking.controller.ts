import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';
import { RankingService } from './ranking.service';

@Controller('cravou/ranking')
@UseGuards(JwtAuthGuard)
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Get()
  getRanking(@Query('groupId') groupId: string | undefined, @Req() req: any) {
    if (groupId) {
      return this.rankingService.getGroupRanking(groupId, req.user.userId);
    }
    return this.rankingService.getGlobalRanking();
  }
}
