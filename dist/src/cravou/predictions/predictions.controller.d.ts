import { CreatePredictionDto } from './dto/create-prediction.dto';
import { PredictionsService } from './predictions.service';
export declare class PredictionsController {
    private readonly predictionsService;
    constructor(predictionsService: PredictionsService);
    upsert(req: any, dto: CreatePredictionDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        points: number | null;
        homeScore: number;
        awayScore: number;
        penaltyWinner: string | null;
        matchId: string;
        userId: string;
    }>;
    findMy(req: any): import(".prisma/client").Prisma.PrismaPromise<({
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
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        points: number | null;
        homeScore: number;
        awayScore: number;
        penaltyWinner: string | null;
        matchId: string;
        userId: string;
    })[]>;
}
