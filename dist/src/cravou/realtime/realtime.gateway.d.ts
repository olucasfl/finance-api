import { Server } from 'socket.io';
export declare class RealtimeGateway {
    server: Server;
    emitMatchUpdated(match: object): void;
    emitMatchLocked(matchId: string): void;
    emitRankingUpdated(): void;
    emitGroupClassified(group: string, standings: object[]): void;
    emitAllGroupsComplete(): void;
    emitThirdsSelected(qualifiers: object[]): void;
    emitBracketUpdated(round: string, slots: object[]): void;
}
