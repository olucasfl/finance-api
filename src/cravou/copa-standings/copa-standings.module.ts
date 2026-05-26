import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AdminModule } from '../admin/admin.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { CopaStandingsController } from './copa-standings.controller';
import { CopaStandingsService } from './copa-standings.service';
import { TiebreakerService } from './tiebreaker.service';

@Module({
  imports: [PrismaModule, RealtimeModule, AdminModule],
  controllers: [CopaStandingsController],
  providers: [CopaStandingsService, TiebreakerService],
  exports: [CopaStandingsService],
})
export class CopaStandingsModule {}
