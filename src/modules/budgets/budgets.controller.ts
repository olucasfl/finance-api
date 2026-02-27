import { Body, Controller, UseGuards, Post, Req, Get, Param, Delete, Put } from '@nestjs/common';
import { BudgetsService } from './budgets.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

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

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    findOne(@Req() req: any, @Param('id') id: string) {
        return this.budgetService.findOne(req.user.userId, id)
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    delete(@Req() req: any,@Param('id') id: string,) {
        return this.budgetService.delete(req.user.userId, id);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard)
    update(@Req() req: any, @Param('id') id: string, @Body() body: UpdateBudgetDto) {
        return this.budgetService.update(req.user.userId, id, body);
    }
}
