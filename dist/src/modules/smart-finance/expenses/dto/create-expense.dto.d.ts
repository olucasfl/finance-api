import { Category, PaymentMethod } from "@prisma/client";
export declare class CreateExpenseDto {
    title: string;
    amount: number;
    expenseDate?: string;
    category: Category;
    paymentMethod: PaymentMethod;
}
