import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { BudgetsModule } from './modules/budgets/budgets.module';
import { ExpensesModule } from './modules/expenses/expenses.module';

@Module({
  imports: [UsersModule, AuthModule, BudgetsModule, ExpensesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
