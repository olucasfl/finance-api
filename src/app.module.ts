import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScheduleModule } from "@nestjs/schedule"

import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { BudgetsModule } from './modules/smart-finance/budgets/budgets.module';
import { ExpensesModule } from './modules/smart-finance/expenses/expenses.module';
import { ConsecrationModule } from './modules/oratio/consecration/consecration.module';
import { LiturgiaModule } from './modules/oratio/liturgia/liturgia.module';
import { VoxAiModule } from './modules/oratio/voxai/voxai.module';
import { PrayersModule } from './modules/oratio/prayers/prayers.module';
import { RosaryModule } from './modules/rosary/rosary.module';
import { ActivityModule } from './modules/oratio/activity/activity.module';
import { JourneyModule } from './modules/oratio/journey/journey.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    UsersModule,
    AuthModule,
    BudgetsModule,
    ExpensesModule,
    ConsecrationModule,
    LiturgiaModule,
    VoxAiModule,
    PrayersModule,
    RosaryModule,
    ActivityModule,
    JourneyModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}