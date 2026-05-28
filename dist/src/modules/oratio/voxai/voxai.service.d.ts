import { PrismaService } from "src/prisma/prisma.service";
import { VoxAiDto } from "./dto/voxai.dto";
import { VoxRateLimiter } from "./guards/vox.rate-limiter";
import { LiturgicalCalendarService } from "./services/liturgical-calendar.service";
import { ActivityService } from '../activity/activity.service';
export declare class VoxAiService {
    private rateLimiter;
    private prisma;
    private liturgicalCalendarService;
    private activityService;
    constructor(rateLimiter: VoxRateLimiter, prisma: PrismaService, liturgicalCalendarService: LiturgicalCalendarService, activityService: ActivityService);
    private apiKey;
    private url;
    private generateTitle;
    private formatLiturgicalForAI;
    private extractDateWithAI;
    getOrCreateActiveConversation(userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string | null;
        hasMessages: boolean;
    }>;
    chat(data: VoxAiDto): Promise<{
        success: boolean;
        error: string;
        message: string | undefined;
        response?: undefined;
    } | {
        success: boolean;
        response: any;
        error?: undefined;
        message?: undefined;
    }>;
    deleteConversation(userId: string, conversationId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string | null;
        hasMessages: boolean;
    }>;
    renameConversation(userId: string, conversationId: string, title: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string | null;
        hasMessages: boolean;
    }>;
}
