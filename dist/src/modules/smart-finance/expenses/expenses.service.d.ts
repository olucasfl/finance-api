import { PrismaService } from 'src/prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
export declare class ExpensesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(userId: string, budgetId: string, data: CreateExpenseDto): Promise<{
        id: string;
        createdAt: Date;
        budgetId: string;
        amount: number;
        title: string;
        expenseDate: Date;
        category: import(".prisma/client").$Enums.Category;
        paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
    }>;
    findAll(userId: string, budgetId: string): Promise<{
        id: string;
        createdAt: Date;
        budgetId: string;
        amount: number;
        title: string;
        expenseDate: Date;
        category: import(".prisma/client").$Enums.Category;
        paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
    }[]>;
    delete(userId: string, budgetId: string, expenseId: string): Promise<{
        id: string;
        createdAt: Date;
        budgetId: string;
        amount: number;
        title: string;
        expenseDate: Date;
        category: import(".prisma/client").$Enums.Category;
        paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
    }>;
    update(userId: string, budgetId: string, expenseId: string, data: UpdateExpenseDto): Promise<{
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
