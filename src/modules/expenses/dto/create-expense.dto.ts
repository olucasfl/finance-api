import { IsDateString, IsNumber, IsOptional, IsString } from "class-validator";


export class CreateExpenseDto{

    @IsString()
    title: string;

    @IsNumber()
    amount: number

    @IsOptional()
    @IsDateString()
    expenseDate?: string
}