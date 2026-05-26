import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AdminModule } from '../admin/admin.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { BracketAdminController } from './bracket.admin.controller';
import { BracketController } from './bracket.controller';
import { BracketService } from './bracket.service';
import { ThirdPlaceService } from './third-place.service';

@Module({
  imports: [PrismaModule, RealtimeModule, AdminModule],
  controllers: [BracketController, BracketAdminController],
  providers: [BracketService, ThirdPlaceService],
  exports: [BracketService],
})
export class BracketModule {}
