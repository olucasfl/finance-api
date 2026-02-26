import { IsNumber, IsString } from "class-validator";


export class CreateExpenseDto{

    @IsString()
    title: string;

    @IsNumber()
    amount: number
}