import { IsNumber, IsString } from "class-validator";

export class CreateBudgetDto {

    @IsString()
    name: string

    @IsNumber()
    limit: number
}