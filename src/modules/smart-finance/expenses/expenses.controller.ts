import { Body, Controller, Post, UseGuards, Req, Param, Get, Delete, Put } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateBudgetDto } from '../budgets/dto/update-budget.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

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

    @Delete(':expenseId')
    @UseGuards(JwtAuthGuard)
    delete(@Req() req: any, @Param('budgetId') budgetId: string, @Param('expenseId') expenseId: string) {
        return this.expensesService.delete(req.user.userId, budgetId, expenseId);
    }

    @Put(':expenseId')
    @UseGuards(JwtAuthGuard)
    update(@Req() req: any, @Param('budgetId') budgetId: string, @Param('expenseId') expenseId: string, @Body() body: UpdateExpenseDto) {
        return this.expensesService.update(req.user.userId, budgetId, expenseId, body);
    }
}
