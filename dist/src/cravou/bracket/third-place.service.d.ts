import { PrismaService } from 'src/prisma/prisma.service';
export interface ThirdPlaceEntry {
    teamName: string;
    group: string;
    points: number;
    goalDifference: number;
    goalsFor: number;
    isQualified: boolean;
}
export declare class ThirdPlaceService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    selectBest8(): Promise<{
        qualifiers: ThirdPlaceEntry[];
        eliminated: ThirdPlaceEntry[];
    }>;
    getQualifiedThirds(): Promise<{
        teamName: string;
        group: string;
    }[]>;
}
