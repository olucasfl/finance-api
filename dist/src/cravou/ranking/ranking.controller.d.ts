import { RankingService } from './ranking.service';
export declare class RankingController {
    private readonly rankingService;
    constructor(rankingService: RankingService);
    getRanking(groupId: string | undefined, req: any): Promise<{
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
    }> | Promise<{
        position: number;
        userId: string;
        name: string;
        points: number;
        cravadas: number;
    }[]>;
}
