import { Module } from '@nestjs/common';
import { ScoringService } from './scoring.service';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [RealtimeModule],
  providers: [ScoringService],
  exports: [ScoringService],
})
export class ScoringModule {}
