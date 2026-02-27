import { IsString, IsNumber, Min, IsOptional } from 'class-validator';

export class UpdateExpenseDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;
}