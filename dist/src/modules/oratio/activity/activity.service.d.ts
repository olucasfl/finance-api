import { PrismaService } from 'src/prisma/prisma.service';
export declare class ActivityService {
    private prisma;
    constructor(prisma: PrismaService);
    private getBrazilDateString;
    updateLoginStreak(userId: string): Promise<void>;
    log(userId: string, type: string, action: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        type: string;
        action: string;
    }>;
}
