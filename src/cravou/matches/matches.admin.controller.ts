import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';
import { AdminGuard } from '../admin/admin.guard';
import { ScoringService } from '../scoring/scoring.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchScoreDto } from './dto/update-match-score.dto';
import { UpdateMatchStatusDto } from './dto/update-match-status.dto';
import { MatchesService } from './matches.service';

@Controller('cravou/admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class MatchesAdminController {
  constructor(
    private readonly matchesService: MatchesService,
    private readonly scoringService: ScoringService,
  ) {}

  @Post('import-matches')
  importMatches() {
    return this.matchesService.importMatches();
  }

  @Post('matches')
  create(@Body() dto: CreateMatchDto) {
    return this.matchesService.createMatch(dto);
  }

  @Post('matches/bulk')
  createBulk(@Body() body: { matches: CreateMatchDto[] }) {
    return this.matchesService.createMatchesBulk(body.matches);
  }

  @Get('matches')
  findAll() {
    return this.matchesService.findAll();
  }

  @Patch('matches/:id/score')
  updateScore(@Param('id') id: string, @Body() dto: UpdateMatchScoreDto) {
    return this.matchesService.updateScore(id, dto);
  }

  @Patch('matches/:id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateMatchStatusDto) {
    return this.matchesService.updateStatus(id, dto);
  }

  @Post('matches/:id/reprocess')
  reprocess(@Param('id') id: string) {
    return this.scoringService.reprocessMatch(id);
  }

  @Post('matches/:id/lock')
  lock(@Param('id') id: string) {
    return this.matchesService.lockMatch(id);
  }

  @Delete('matches/:id')
  remove(@Param('id') id: string) {
    return this.matchesService.removeMatch(id);
  }
}
