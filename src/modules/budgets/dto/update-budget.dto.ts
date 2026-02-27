import { IsNumber, IsOptional, IsString, Min } from "class-validator";

export class UpdateBudgetDto {
    
    @IsString()
    @IsOptional()
    name: string;

    @IsNumber()
    @IsOptional()
    @Min(0)
    limit: number;
}