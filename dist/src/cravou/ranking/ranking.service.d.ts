import { PrismaService } from 'src/prisma/prisma.service';
export declare class RankingService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getGlobalRanking(): Promise<{
        position: number;
        userId: string;
        name: string;
        points: number;
        cravadas: number;
    }[]>;
    getGroupRanking(groupId: string, userId: string): Promise<{
        group: {
            id: string;
            name: string;
        };
        ranking: {
            userId: string;
            name: string;
            email: string;
            points: number;
            cravadas: number;
            position: number;
        }[];
    }>;
}
