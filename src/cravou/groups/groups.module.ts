import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

@Module({
  imports: [RealtimeModule],
  providers: [GroupsService],
  controllers: [GroupsController],
})
export class GroupsModule {}
