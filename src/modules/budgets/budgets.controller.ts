import { Body, Controller, UseGuards, Post, Req, Get } from '@nestjs/common';
import { BudgetsService } from './budgets.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateBudgetDto } from './dto/create-budget.dto';

@Controller('budgets')
export class BudgetsController {
    constructor(private readonly budgetService: BudgetsService) {}

    @Post()
    @UseGuards(JwtAuthGuard)
    create(@Req() req: any, @Body() body: CreateBudgetDto) {

        return this.budgetService.create(req.user.userId, body)
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    findAll(@Req() req: any) {
        return this.budgetService.findAll(req.user.userId)
    }
}
