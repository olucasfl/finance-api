import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';
import { MatchesService } from './matches.service';

@Controller('cravou/matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get()
  findAll(@Query('phase') phase?: string, @Query('status') status?: string) {
    return this.matchesService.findAll(phase, status);
  }

  @Get('finished')
  @UseGuards(JwtAuthGuard)
  getFinishedMatches() {
    return this.matchesService.getFinishedMatches();
  }

  @Get('palpitavel')
  @UseGuards(JwtAuthGuard)
  getPalpitavelMatches() {
    return this.matchesService.getPalpitavelMatches();
  }

  @Get(':id/palpites')
  @UseGuards(JwtAuthGuard)
  getMatchPalpites(@Param('id') id: string) {
    return this.matchesService.getMatchPalpites(id);
  }

  @Get(':id/palpites-live')
  @UseGuards(JwtAuthGuard)
  getMatchPalpitesLive(@Param('id') id: string) {
    return this.matchesService.getMatchPalpitesLive(id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.matchesService.findOne(id, req.user.userId);
  }
}
