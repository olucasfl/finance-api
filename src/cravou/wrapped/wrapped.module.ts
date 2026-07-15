import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { WrappedAdminController } from './wrapped.admin.controller';
import { WrappedController } from './wrapped.controller';
import { WrappedService } from './wrapped.service';

@Module({
  imports: [AdminModule, RealtimeModule],
  providers: [WrappedService],
  controllers: [WrappedController, WrappedAdminController],
})
export class WrappedModule {}
