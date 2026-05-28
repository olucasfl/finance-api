import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
export declare class PrayersService {
    private readonly prisma;
    private activityService;
    constructor(prisma: PrismaService, activityService: ActivityService);
    createCategory(data: any): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        slug: string;
    }>;
    getCategories(): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        slug: string;
    }[]>;
    createPrayer(data: any): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        content: string;
        categoryId: string;
    }>;
    getPrayersByCategory(slug: string): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        content: string;
        categoryId: string;
    }[]>;
    getPrayer(id: string): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        content: string;
        categoryId: string;
    }>;
    completePrayer(userId: string): Promise<{
        success: boolean;
    }>;
}
