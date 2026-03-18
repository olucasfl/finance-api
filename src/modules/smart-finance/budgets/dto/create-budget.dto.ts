import { IsNumber, IsString, Min } from "class-validator";

export class CreateBudgetDto {

    @IsString()
    name: string

    @IsNumber()
    @Min(0)
    limit: number
}