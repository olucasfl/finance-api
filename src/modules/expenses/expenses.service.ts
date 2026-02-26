import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';

@Injectable()
export class ExpensesService {
    constructor(private readonly prisma: PrismaService) {}

    async create(userId: string, budgetId: string, data: CreateExpenseDto) {

        const budget = await this.prisma.budget.findUnique({
            where: { id: budgetId },
        })

        if (!budget) {
            throw new NotFoundException('Budget not found')
        }

        if(budget.userId !== userId) {
            throw new ForbiddenException('Not Allowed')
        }

        return this.prisma.expense.create({
            data: {
                title: data.title,
                amount: data.amount,
                budgetId,
            },
        })
    }

    async findAll(userId: string, budgetId: string) {

        const budget = await this.prisma.budget.findUnique({
            where: { id:budgetId },
        })

        if (!budget) {
            throw new NotFoundException('Budget not found')
        }

        if (budget.userId !== userId) {
            throw new ForbiddenException('Not allowed')
        }

        return this.prisma.expense.findMany({
            where: { budgetId },
            orderBy: { createdAt: 'desc' },
        })
    }
}
