import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
export declare class BudgetsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(userId: string, data: CreateBudgetDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        userId: string;
        limit: number;
    }>;
    findAll(userId: string): Promise<{
        id: string;
        name: string;
        limit: number;
        totalSpent: number;
        remaining: number;
    }[]>;
    findOne(userId: string, budgetId: string): Promise<{
        id: string;
        name: string;
        limit: number;
        totalSpent: number;
        remaining: number;
        expenses: {
            id: string;
            createdAt: Date;
            budgetId: string;
            amount: number;
            title: string;
            expenseDate: Date;
            category: import(".prisma/client").$Enums.Category;
            paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
        }[];
    }>;
    delete(userId: string, budgetId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        userId: string;
        limit: number;
    }>;
    update(userId: string, budgetId: string, data: UpdateBudgetDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        userId: string;
        limit: number;
    }>;
}
