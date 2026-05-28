import { PrismaService } from 'src/prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
export declare class ScheduledService {
    private readonly prisma;
    private readonly gateway;
    private readonly logger;
    constructor(prisma: PrismaService, gateway: RealtimeGateway);
    handleMatchLifecycle(): Promise<void>;
    private autoLockPredictions;
    private setMatchesLive;
    private setMatchesAwaitingResult;
}
