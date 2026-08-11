import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { AdminNotificationsController } from './admin-notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsSendService } from './notifications-send.service';
import { PushService } from './push.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { AdminGuard } from '../../auth/admin.guard';

@Module({
  controllers: [NotificationsController, AdminNotificationsController],
  providers: [
    NotificationsService,
    NotificationsSendService,
    PushService,
    PrismaService,
    AdminGuard,
  ],
  exports: [PushService, NotificationsService, NotificationsSendService],
})
export class NotificationsModule {}
