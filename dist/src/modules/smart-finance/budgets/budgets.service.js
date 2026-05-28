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
exports.BudgetsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
let BudgetsService = class BudgetsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(userId, data) {
        return this.prisma.budget.create({
            data: {
                name: data.name,
                limit: data.limit,
                userId,
            },
        });
    }
    async findAll(userId) {
        const budgets = await this.prisma.budget.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
        const budgetsWithTotals = await Promise.all(budgets.map(async (budget) => {
            const expenseSum = await this.prisma.expense.aggregate({
                where: { budgetId: budget.id },
                _sum: { amount: true },
            });
            const totalSpent = expenseSum._sum.amount ?? 0;
            const remaining = budget.limit - totalSpent;
            return {
                id: budget.id,
                name: budget.name,
                limit: budget.limit,
                totalSpent,
                remaining,
            };
        }));
        return budgetsWithTotals;
    }
    async findOne(userId, budgetId) {
        const budget = await this.prisma.budget.findUnique({
            where: { id: budgetId }
        });
        if (!budget) {
            throw new common_1.NotFoundException("Budget not found");
        }
        if (budget.userId !== userId) {
            throw new common_1.ForbiddenException("Not allowed");
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
    async delete(userId, budgetId) {
        const budget = await this.prisma.budget.findUnique({
            where: { id: budgetId },
        });
        if (!budget) {
            throw new common_1.NotFoundException('Budget not found');
        }
        if (budget.userId !== userId) {
            throw new common_1.ForbiddenException('Not allowed');
        }
        return this.prisma.budget.delete({
            where: { id: budgetId },
        });
    }
    async update(userId, budgetId, data) {
        const budget = await this.prisma.budget.findUnique({
            where: { id: budgetId },
        });
        if (!budget) {
            throw new common_1.NotFoundException('Budget not found');
        }
        if (budget.userId !== userId) {
            throw new common_1.ForbiddenException('Not allowed');
        }
        return this.prisma.budget.update({
            where: { id: budgetId },
            data,
        });
    }
};
exports.BudgetsService = BudgetsService;
exports.BudgetsService = BudgetsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BudgetsService);
//# sourceMappingURL=budgets.service.js.map