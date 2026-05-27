import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { BracketModule } from './bracket/bracket.module';
import { CopaStandingsModule } from './copa-standings/copa-standings.module';
import { GroupsModule } from './groups/groups.module';
import { MatchesModule } from './matches/matches.module';
import { PredictionsModule } from './predictions/predictions.module';
import { RankingModule } from './ranking/ranking.module';
import { RealtimeModule } from './realtime/realtime.module';
import { ScheduledModule } from './scheduled/scheduled.module';
import { ScoringModule } from './scoring/scoring.module';

@Module({
  imports: [
    AdminModule,
    RealtimeModule,
    ScoringModule,
    MatchesModule,
    PredictionsModule,
    RankingModule,
    GroupsModule,
    CopaStandingsModule,
    BracketModule,
    ScheduledModule,
  ],
})
export class CravouModule {}
