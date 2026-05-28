import { JourneyService } from "./journey.service";
import { CreateJourneyDto } from "./dto/create-journey.dto";
import { CreateIntentDto } from "./dto/create-intent.dto";
export declare class JourneyController {
    private readonly service;
    constructor(service: JourneyService);
    create(req: any, dto: CreateJourneyDto): Promise<{
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
    getJourney(req: any): Promise<{
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
    getHistory(req: any): Promise<{
        id: string;
        createdAt: Date;
        memberId: string;
        weekKey: string;
        rosariesCompleted: number;
        goalReached: boolean;
        rewardCollected: boolean;
    }[]>;
    deleteJourney(req: any): Promise<{
        success: boolean;
    }>;
    createIntent(req: any, dto: CreateIntentDto): Promise<{
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
    deleteIntent(req: any, id: string): Promise<{
        success: boolean;
    }>;
}
