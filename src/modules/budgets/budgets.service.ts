import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@Injectable()
export class BudgetsService {

    constructor(private readonly prisma: PrismaService) {}

    async create(userId: string, data: CreateBudgetDto) {

        return this.prisma.budget.create({
            data: {
                name: data.name,
                limit: data.limit,
                userId,
            },
        })
    }

    async findAll(userId: string) {
        return this.prisma.budget.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        })
    }

    async findOne(userId: string, budgetId: string) {
        const budget = await this.prisma.budget.findUnique({
            where: { id: budgetId }
        })

        if (!budget) {
            throw new NotFoundException("Budget not found")
        }

        if (budget.userId !== userId) {
            throw new ForbiddenException("Not allowed")
        }

        const [expenseSum, expenses] = await Promise.all([
            this.prisma.expense.aggregate({
                where: { budgetId },
                _sum: { amount: true },
            }),
            this.prisma.expense.findMany({
                where: { budgetId },
                orderBy: { createdAt: 'desc' },
            }),
        ]);

        const totalSpent = expenseSum._sum.amount ?? 0;
        const remaining = budget.limit - totalSpent;

        return {
            id: budget.id,
            name: budget.name,
            limit: budget.limit,
            totalSpent,
            remaining,
            expenses,
        };
    }

    async delete(userId: string, budgetId: string) {
        const budget = await this.prisma.budget.findUnique({
            where: { id: budgetId },
        });

        if (!budget) {
            throw new NotFoundException('Budget not found');
        }

        if (budget.userId !== userId) {
            throw new ForbiddenException('Not allowed');
        }

        return this.prisma.budget.delete({
            where: { id: budgetId },
        });
    }

    async update(userId: string, budgetId: string, data: UpdateBudgetDto) {
        const budget = await this.prisma.budget.findUnique({
            where: { id: budgetId },
        });

        if (!budget) {
            throw new NotFoundException('Budget not found');
        }

        if (budget.userId !== userId) {
            throw new ForbiddenException('Not allowed');
        }

        return this.prisma.budget.update({
            where: { id: budgetId },
            data,
        });
    }
}
