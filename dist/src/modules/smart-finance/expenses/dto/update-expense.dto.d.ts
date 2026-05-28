import { Category, PaymentMethod } from '@prisma/client';
export declare class UpdateExpenseDto {
    title?: string;
    amount?: number;
    expenseDate?: string;
    category: Category;
    paymentMethod: PaymentMethod;
}
