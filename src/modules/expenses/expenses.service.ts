import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

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
                expenseDate: data.expenseDate
                ? new Date(`${data.expenseDate}T12:00:00`)
                : new Date()
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

    async delete(userId: string, budgetId: string, expenseId: string) {

        const budget = await this.prisma.budget.findUnique({
            where: { id: budgetId },
        });

        if (!budget) {
            throw new NotFoundException('Budget not found');
        }

        if (budget.userId !== userId) {
            throw new ForbiddenException('Not allowed');
        }

        const expense = await this.prisma.expense.findUnique({
            where: { id: expenseId },
        });

        if (!expense || expense.budgetId !== budgetId) {
            throw new NotFoundException('Expense not found');
        }

        return this.prisma.expense.delete({
            where: { id: expenseId },
        });
    }

    async update(userId: string, budgetId: string, expenseId: string, data: UpdateExpenseDto) {

        const budget = await this.prisma.budget.findUnique({
            where: { id: budgetId },
        });

        if (!budget) {
            throw new NotFoundException('Budget not found');
        }

        if (budget.userId !== userId) {
            throw new ForbiddenException('Not allowed');
        }

        const expense = await this.prisma.expense.findUnique({
            where: { id: expenseId },
        });

        if (!expense || expense.budgetId !== budgetId) {
            throw new NotFoundException('Expense not found');
        }

        return this.prisma.expense.update({
            where: { id: expenseId },
            data: {
            title: data.title,
            amount: data.amount,
            createdAt: data.expenseDate
                ? new Date(`${data.expenseDate}T12:00:00`)
                : new Date()
            }
        });
    }
}
