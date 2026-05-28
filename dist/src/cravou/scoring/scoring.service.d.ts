import { PrismaService } from 'src/prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
export declare class ScoringService {
    private readonly prisma;
    private readonly gateway;
    constructor(prisma: PrismaService, gateway: RealtimeGateway);
    reprocessMatch(matchId: string): Promise<void>;
}
