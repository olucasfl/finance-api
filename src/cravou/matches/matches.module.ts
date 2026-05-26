import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { CopaStandingsModule } from '../copa-standings/copa-standings.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { ScoringModule } from '../scoring/scoring.module';
import { MatchesAdminController } from './matches.admin.controller';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';

@Module({
  imports: [AdminModule, ScoringModule, RealtimeModule, CopaStandingsModule],
  providers: [MatchesService],
  controllers: [MatchesController, MatchesAdminController],
  exports: [MatchesService],
})
export class MatchesModule {}
