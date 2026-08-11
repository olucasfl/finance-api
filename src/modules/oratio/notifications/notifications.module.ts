import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, PushService, PrismaService],
  exports: [PushService, NotificationsService],
})
export class NotificationsModule {}
