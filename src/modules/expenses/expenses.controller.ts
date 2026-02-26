import { Body, Controller, Post, UseGuards, Req, Param, Get } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateExpenseDto } from './dto/create-expense.dto';

@Controller('budgets/:budgetId/expenses')
export class ExpensesController {
constructor(private readonly expensesService: ExpensesService) {}

    @Post()
    @UseGuards(JwtAuthGuard)
    create(@Req() req: any, @Param('budgetId') budgetId: string, @Body() body: CreateExpenseDto) {
        return this.expensesService.create(req.user.userId, budgetId, body)
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    findAll(@Req() req: any, @Param('budgetId') budgetId: string) {
        return this.expensesService.findAll(req.user.userId, budgetId)
    }
}
