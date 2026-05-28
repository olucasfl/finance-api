import { PrismaService } from "src/prisma/prisma.service";
import { ActivityService } from '../oratio/activity/activity.service';
import { JourneyService } from "../oratio/journey/journey.service";
export declare class RosaryService {
    private prisma;
    private activityService;
    private journeyService;
    constructor(prisma: PrismaService, activityService: ActivityService, journeyService: JourneyService);
    getRosary(type: string): any[];
    start(userId: string): Promise<{
        id: string;
        userId: string;
        currentStep: number;
        completed: boolean;
        startedAt: Date;
        finishedAt: Date | null;
    }>;
    getSession(userId: string): Promise<{
        id: string;
        userId: string;
        currentStep: number;
        completed: boolean;
        startedAt: Date;
        finishedAt: Date | null;
    } | null>;
    nextStep(userId: string): Promise<{
        id: string;
        userId: string;
        currentStep: number;
        completed: boolean;
        startedAt: Date;
        finishedAt: Date | null;
    }>;
    finish(userId: string): Promise<{
        success: boolean;
    }>;
}
