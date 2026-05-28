import { PrismaService } from "src/prisma/prisma.service";
export declare class JourneyService {
    private prisma;
    constructor(prisma: PrismaService);
    createJourney(userId: string, partnerEmail: string): Promise<{
        members: ({
            user: {
                id: string;
                name: string;
                email: string;
                isAdmin: boolean;
            };
        } & {
            id: string;
            createdAt: Date;
            userId: string;
            role: import(".prisma/client").$Enums.JourneyRole;
            journeyId: string;
            totalPoints: number;
            currentStreak: number;
            bestStreak: number;
        })[];
    } & {
        id: string;
        createdAt: Date;
    }>;
    getJourney(userId: string): Promise<{
        weekKey: string;
        goal: number;
        members: {
            id: string;
            name: string;
            email: string;
            role: import(".prisma/client").$Enums.JourneyRole;
            totalPoints: number;
            currentStreak: number;
            bestStreak: number;
            rosariesCompleted: number;
            goalReached: boolean;
        }[];
        intents: {
            id: string;
            text: string;
            createdAt: Date;
            canDelete: boolean;
            user: {
                id: string;
                name: string;
            };
        }[];
    } | null>;
    incrementWeeklyProgress(userId: string): Promise<void>;
    getHistory(userId: string): Promise<{
        id: string;
        createdAt: Date;
        memberId: string;
        weekKey: string;
        rosariesCompleted: number;
        goalReached: boolean;
        rewardCollected: boolean;
    }[]>;
    deleteJourney(userId: string): Promise<{
        success: boolean;
    }>;
    createIntent(userId: string, text: string): Promise<{
        user: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        journeyId: string;
        weekKey: string;
        text: string;
    }>;
    deleteIntent(userId: string, intentId: string): Promise<{
        success: boolean;
    }>;
}
