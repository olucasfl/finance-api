import { Module } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { AdminController } from './admin.controller';

@Module({
  providers: [AdminGuard],
  controllers: [AdminController],
  exports: [AdminGuard],
})
export class AdminModule {}
