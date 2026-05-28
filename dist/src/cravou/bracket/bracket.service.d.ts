import { PrismaService } from 'src/prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { ThirdPlaceService } from './third-place.service';
export declare class BracketService {
    private readonly prisma;
    private readonly thirdPlaceService;
    private readonly gateway;
    private readonly logger;
    constructor(prisma: PrismaService, thirdPlaceService: ThirdPlaceService, gateway: RealtimeGateway);
    mountR32(): Promise<{
        slots: any[];
        thirds: any;
    }>;
    private assignThirdsToSlots;
    setKnockoutResult(slotId: string, winnerTeam: string): Promise<any>;
    private propagateWinner;
    private propagateLoserToThirdPlace;
    overrideSlotTeams(slotId: string, data: {
        homeTeam?: string | null;
        awayTeam?: string | null;
    }): Promise<any>;
    refreshR32TeamsFromStandings(): Promise<void>;
    resetKnockoutResult(slotId: string): Promise<any>;
    createMatchFromSlot(slotId: string, matchDate: string): Promise<any>;
    initializeAllSlots(): Promise<{
        created: number;
        existing: number;
    }>;
    getBracket(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        homeTeam: string | null;
        awayTeam: string | null;
        round: string;
        slotNumber: number;
        homeDesc: string;
        awayDesc: string;
        winnerTeam: string | null;
        loserTeam: string | null;
        matchId: string | null;
    }[]>;
    getBracketByRound(round: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        homeTeam: string | null;
        awayTeam: string | null;
        round: string;
        slotNumber: number;
        homeDesc: string;
        awayDesc: string;
        winnerTeam: string | null;
        loserTeam: string | null;
        matchId: string | null;
    }[]>;
}
