import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScheduleModule } from "@nestjs/schedule"

import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { ConsecrationModule } from './modules/oratio/consecration/consecration.module';
import { LiturgiaModule } from './modules/oratio/liturgia/liturgia.module';
import { VoxAiModule } from './modules/oratio/voxai/voxai.module';
import { PrayersModule } from './modules/oratio/prayers/prayers.module';
import { RosaryModule } from './modules/rosary/rosary.module';
import { ActivityModule } from './modules/oratio/activity/activity.module';
import { SystemLogModule } from './system-log/system-log.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    UsersModule,
    AuthModule,
    ConsecrationModule,
    LiturgiaModule,
    VoxAiModule,
    PrayersModule,
    RosaryModule,
    ActivityModule,
    SystemLogModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}