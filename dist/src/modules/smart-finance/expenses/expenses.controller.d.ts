import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
export declare class ExpensesController {
    private readonly expensesService;
    constructor(expensesService: ExpensesService);
    create(req: any, budgetId: string, body: CreateExpenseDto): Promise<{
        id: string;
        createdAt: Date;
        budgetId: string;
        amount: number;
        title: string;
        expenseDate: Date;
        category: import(".prisma/client").$Enums.Category;
        paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
    }>;
    findAll(req: any, budgetId: string): Promise<{
        id: string;
        createdAt: Date;
        budgetId: string;
        amount: number;
        title: string;
        expenseDate: Date;
        category: import(".prisma/client").$Enums.Category;
        paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
    }[]>;
    delete(req: any, budgetId: string, expenseId: string): Promise<{
        id: string;
        createdAt: Date;
        budgetId: string;
        amount: number;
        title: string;
        expenseDate: Date;
        category: import(".prisma/client").$Enums.Category;
        paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
    }>;
    update(req: any, budgetId: string, expenseId: string, body: UpdateExpenseDto): Promise<{
        id: string;
        createdAt: Date;
        budgetId: string;
        amount: number;
        title: string;
        expenseDate: Date;
        category: import(".prisma/client").$Enums.Category;
        paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
    }>;
}
