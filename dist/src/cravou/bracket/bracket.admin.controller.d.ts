import { BracketService } from './bracket.service';
export declare class BracketAdminController {
    private readonly bracketService;
    constructor(bracketService: BracketService);
    initializeAll(): Promise<{
        created: number;
        existing: number;
    }>;
    mountR32(): Promise<{
        slots: any[];
        thirds: any;
    }>;
    setResult(slotId: string, body: {
        winnerTeam: string;
    }): Promise<any>;
    overrideTeams(slotId: string, body: {
        homeTeam?: string | null;
        awayTeam?: string | null;
    }): Promise<any>;
    syncR32Teams(): Promise<void>;
    resetResult(slotId: string): Promise<any>;
    createMatch(slotId: string, body: {
        matchDate: string;
    }): Promise<any>;
}
