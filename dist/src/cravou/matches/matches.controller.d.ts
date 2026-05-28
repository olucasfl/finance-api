import { MatchesService } from './matches.service';
export declare class MatchesController {
    private readonly matchesService;
    constructor(matchesService: MatchesService);
    findAll(phase?: string, status?: string): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        externalId: string;
        phase: string;
        groupName: string | null;
        groupRound: number | null;
        homeTeam: string;
        awayTeam: string;
        homeScore: number | null;
        awayScore: number | null;
        penaltyWinner: string | null;
        matchDate: Date;
        stadium: string | null;
        status: string;
        predictionsLocked: boolean;
    }[]>;
    findOne(id: string, req: any): Promise<{
        match: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            externalId: string;
            phase: string;
            groupName: string | null;
            groupRound: number | null;
            homeTeam: string;
            awayTeam: string;
            homeScore: number | null;
            awayScore: number | null;
            penaltyWinner: string | null;
            matchDate: Date;
            stadium: string | null;
            status: string;
            predictionsLocked: boolean;
        };
        prediction?: undefined;
    } | {
        match: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            externalId: string;
            phase: string;
            groupName: string | null;
            groupRound: number | null;
            homeTeam: string;
            awayTeam: string;
            homeScore: number | null;
            awayScore: number | null;
            penaltyWinner: string | null;
            matchDate: Date;
            stadium: string | null;
            status: string;
            predictionsLocked: boolean;
        };
        prediction: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            points: number | null;
            homeScore: number;
            awayScore: number;
            penaltyWinner: string | null;
            matchId: string;
            userId: string;
        } | null;
    }>;
}
