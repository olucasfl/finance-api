import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { BracketModule } from '../bracket/bracket.module';
import { CopaStandingsModule } from '../copa-standings/copa-standings.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { ScoringModule } from '../scoring/scoring.module';
import { CalendarSeedService } from './calendar-seed.service';
import { MatchesAdminController } from './matches.admin.controller';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';

@Module({
  imports: [AdminModule, ScoringModule, RealtimeModule, CopaStandingsModule, BracketModule],
  providers: [MatchesService, CalendarSeedService],
  controllers: [MatchesController, MatchesAdminController],
  exports: [MatchesService],
})
export class MatchesModule {}
