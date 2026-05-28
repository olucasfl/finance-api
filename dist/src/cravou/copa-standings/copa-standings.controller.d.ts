import { CopaStandingsService } from './copa-standings.service';
export declare class CopaStandingsController {
    private readonly standingsService;
    constructor(standingsService: CopaStandingsService);
    getAllGroups(): Promise<{
        group: string;
        standings: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            group: string;
            teamName: string;
            matchesPlayed: number;
            wins: number;
            draws: number;
            losses: number;
            goalsFor: number;
            goalsAgainst: number;
            goalDifference: number;
            points: number;
            position: number | null;
            isQualified: boolean;
        }[];
    }[]>;
    getGroup(letter: string): Promise<{
        group: string;
        standings: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            group: string;
            teamName: string;
            matchesPlayed: number;
            wins: number;
            draws: number;
            losses: number;
            goalsFor: number;
            goalsAgainst: number;
            goalDifference: number;
            points: number;
            position: number | null;
            isQualified: boolean;
        }[];
        matches: {
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
        }[];
    }>;
    getThirds(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        group: string;
        teamName: string;
        matchesPlayed: number;
        wins: number;
        draws: number;
        losses: number;
        goalsFor: number;
        goalsAgainst: number;
        goalDifference: number;
        points: number;
        position: number | null;
        isQualified: boolean;
    }[]>;
    getQualified(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        group: string;
        teamName: string;
        matchesPlayed: number;
        wins: number;
        draws: number;
        losses: number;
        goalsFor: number;
        goalsAgainst: number;
        goalDifference: number;
        points: number;
        position: number | null;
        isQualified: boolean;
    }[]>;
    overridePositions(group: string, body: {
        positions: {
            teamName: string;
            position: number;
            isQualified: boolean;
        }[];
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        group: string;
        teamName: string;
        matchesPlayed: number;
        wins: number;
        draws: number;
        losses: number;
        goalsFor: number;
        goalsAgainst: number;
        goalDifference: number;
        points: number;
        position: number | null;
        isQualified: boolean;
    }[]>;
}
