import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBudgetDto } from './dto/create-budget.dto';

@Injectable()
export class BudgetsService {

    constructor(private readonly prisma: PrismaService) {}

    async create(userId: string, data: CreateBudgetDto) {

        return this.prisma.budget.create({
            data: {
                name: data.name,
                limit: data.limit,
                userId,
            },
        })
    }

    async findAll(userId: string) {
        return this.prisma.budget.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        })
    }
}
