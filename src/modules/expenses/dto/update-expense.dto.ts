import { IsString, IsNumber, Min, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { Category, PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';

export class UpdateExpenseDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;

    @IsOptional()
    @IsDateString()
    expenseDate?: string

  @IsEnum(Category)
  category: Category;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}