import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { GroupsModule } from './groups/groups.module';
import { MatchesModule } from './matches/matches.module';
import { PredictionsModule } from './predictions/predictions.module';
import { RankingModule } from './ranking/ranking.module';
import { RealtimeModule } from './realtime/realtime.module';
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
  ],
})
export class CravouModule {}
