import { PrismaService } from 'src/prisma/prisma.service';
export interface StandingRow {
    teamName: string;
    group: string;
    matchesPlayed: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    points: number;
}
export declare class TiebreakerService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    sort(teams: StandingRow[]): Promise<(StandingRow & {
        position: number | null;
    })[]>;
    private resolveByHeadToHead;
}
