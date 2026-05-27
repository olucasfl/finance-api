import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { ScheduledService } from './scheduled.service';

@Module({
  imports: [RealtimeModule],
  providers: [ScheduledService],
})
export class ScheduledModule {}
