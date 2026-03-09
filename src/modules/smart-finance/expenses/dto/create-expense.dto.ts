import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { Type } from "class-transformer";
import { Category, PaymentMethod } from "@prisma/client";


export class CreateExpenseDto {

    @IsString()
    title: string;

    @Type(() => Number)
    @IsNumber()
    amount: number

    @IsOptional()
    @IsDateString()
    expenseDate?: string

    @IsEnum(Category)
    category: Category

    @IsEnum(PaymentMethod)
    paymentMethod: PaymentMethod
}