import { PrismaService } from "src/prisma/prisma.service";
export declare class JourneyCron {
    private prisma;
    constructor(prisma: PrismaService);
    handleWeeklyJourney(): Promise<void>;
}
