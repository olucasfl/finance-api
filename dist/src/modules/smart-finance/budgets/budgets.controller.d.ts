import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
export declare class BudgetsController {
    private readonly budgetService;
    constructor(budgetService: BudgetsService);
    create(req: any, body: CreateBudgetDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        userId: string;
        limit: number;
    }>;
    findAll(req: any): Promise<{
        id: string;
        name: string;
        limit: number;
        totalSpent: number;
        remaining: number;
    }[]>;
    findOne(req: any, id: string): Promise<{
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
    delete(req: any, id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        userId: string;
        limit: number;
    }>;
    update(req: any, id: string, body: UpdateBudgetDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        userId: string;
        limit: number;
    }>;
}
