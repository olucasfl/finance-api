"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpensesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
let ExpensesService = class ExpensesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(userId, budgetId, data) {
        const budget = await this.prisma.budget.findUnique({
            where: { id: budgetId },
        });
        if (!budget) {
            throw new common_1.NotFoundException('Budget not found');
        }
        if (budget.userId !== userId) {
            throw new common_1.ForbiddenException('Not Allowed');
        }
        return this.prisma.expense.create({
            data: {
                title: data.title,
                amount: data.amount,
                budgetId,
                category: data.category,
                paymentMethod: data.paymentMethod,
                expenseDate: data.expenseDate
                    ? new Date(`${data.expenseDate}T12:00:00`)
                    : new Date()
            },
        });
    }
    async findAll(userId, budgetId) {
        const budget = await this.prisma.budget.findUnique({
            where: { id: budgetId },
        });
        if (!budget) {
            throw new common_1.NotFoundException('Budget not found');
        }
        if (budget.userId !== userId) {
            throw new common_1.ForbiddenException('Not allowed');
        }
        return this.prisma.expense.findMany({
            where: { budgetId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async delete(userId, budgetId, expenseId) {
        const budget = await this.prisma.budget.findUnique({
            where: { id: budgetId },
        });
        if (!budget) {
            throw new common_1.NotFoundException('Budget not found');
        }
        if (budget.userId !== userId) {
            throw new common_1.ForbiddenException('Not allowed');
        }
        const expense = await this.prisma.expense.findUnique({
            where: { id: expenseId },
        });
        if (!expense || expense.budgetId !== budgetId) {
            throw new common_1.NotFoundException('Expense not found');
        }
        return this.prisma.expense.delete({
            where: { id: expenseId },
        });
    }
    async update(userId, budgetId, expenseId, data) {
        const budget = await this.prisma.budget.findUnique({
            where: { id: budgetId },
        });
        if (!budget) {
            throw new common_1.NotFoundException('Budget not found');
        }
        if (budget.userId !== userId) {
            throw new common_1.ForbiddenException('Not allowed');
        }
        const expense = await this.prisma.expense.findUnique({
            where: { id: expenseId },
        });
        if (!expense || expense.budgetId !== budgetId) {
            throw new common_1.NotFoundException('Expense not found');
        }
        return this.prisma.expense.update({
            where: { id: expenseId },
            data: {
                title: data.title,
                amount: data.amount,
                category: data.category,
                paymentMethod: data.paymentMethod,
                expenseDate: data.expenseDate
                    ? new Date(`${data.expenseDate}T12:00:00`)
                    : new Date()
            }
        });
    }
};
exports.ExpensesService = ExpensesService;
exports.ExpensesService = ExpensesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ExpensesService);
//# sourceMappingURL=expenses.service.js.map