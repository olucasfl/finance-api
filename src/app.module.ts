import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { BudgetsModule } from './modules/smart-finance/budgets/budgets.module';
import { ExpensesModule } from './modules/smart-finance/expenses/expenses.module';
import { ConsecrationModule } from './modules/oratio/consecration/consecration.module';
import { LiturgiaModule } from './modules/oratio/liturgia/liturgia.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    UsersModule,
    AuthModule,
    BudgetsModule,
    ExpensesModule,
    ConsecrationModule,
    LiturgiaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}