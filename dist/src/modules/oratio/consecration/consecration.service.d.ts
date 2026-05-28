import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
export declare class ConsecrationService {
    private readonly prisma;
    private activityService;
    constructor(prisma: PrismaService, activityService: ActivityService);
    private getTodayBrazil;
    private toLocalDate;
    private diffDays;
    private formatLocalDate;
    start(userId: string, startDate: Date): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        startDate: Date;
    }>;
    progress(userId: string): Promise<{
        started: boolean;
        stages: {
            id: string;
            description: string | null;
            days: number;
            title: string;
            order: number;
        }[];
        startDate?: undefined;
        consecrationDate?: undefined;
        currentDay?: undefined;
        startedToday?: undefined;
        daysUntilStart?: undefined;
        completedDays?: undefined;
        progress?: undefined;
    } | {
        started: boolean;
        startDate: string;
        consecrationDate: string;
        currentDay: number;
        startedToday: boolean;
        daysUntilStart: number;
        completedDays: number;
        progress: number;
        stages: {
            id: string;
            description: string | null;
            days: number;
            title: string;
            order: number;
        }[];
    }>;
    findDay(dayNumber: number): Promise<{
        stage: {
            id: string;
            description: string | null;
            days: number;
            title: string;
            order: number;
        };
        prayers: ({
            prayer: {
                id: string;
                title: string;
                content: string;
            };
        } & {
            id: string;
            order: number;
            dayId: string;
            prayerId: string;
        })[];
    } & {
        id: string;
        dayNumber: number;
        title: string | null;
        stageId: string;
    }>;
    createStage(data: any): Promise<{
        id: string;
        description: string | null;
        days: number;
        title: string;
        order: number;
    }>;
    createDay(data: any): Promise<{
        id: string;
        dayNumber: number;
        title: string | null;
        stageId: string;
    }>;
    createPrayer(data: any): Promise<{
        id: string;
        title: string;
        content: string;
    }>;
    addPrayerToDay(data: any): Promise<{
        id: string;
        order: number;
        dayId: string;
        prayerId: string;
    }>;
    updateDayPrayer(id: string, order: number): Promise<{
        id: string;
        order: number;
        dayId: string;
        prayerId: string;
    }>;
    updatePrayer(prayerId: string, data: {
        title?: string;
        content?: string;
    }): Promise<{
        id: string;
        title: string;
        content: string;
    }>;
    getFullConsecration(): Promise<({
        daysContent: ({
            prayers: ({
                prayer: {
                    id: string;
                    title: string;
                    content: string;
                };
            } & {
                id: string;
                order: number;
                dayId: string;
                prayerId: string;
            })[];
        } & {
            id: string;
            dayNumber: number;
            title: string | null;
            stageId: string;
        })[];
    } & {
        id: string;
        description: string | null;
        days: number;
        title: string;
        order: number;
    })[]>;
    today(userId: string): Promise<({
        stage: {
            id: string;
            description: string | null;
            days: number;
            title: string;
            order: number;
        };
        prayers: ({
            prayer: {
                id: string;
                title: string;
                content: string;
            };
        } & {
            id: string;
            order: number;
            dayId: string;
            prayerId: string;
        })[];
    } & {
        id: string;
        dayNumber: number;
        title: string | null;
        stageId: string;
    }) | null>;
    reset(userId: string): Promise<{
        success: boolean;
    }>;
    completeDay(userId: string, dayNumber: number): Promise<{
        id: string;
        createdAt: Date;
        dayNumber: number;
        userId: string;
    }>;
    updateStartDate(userId: string, startDate: Date): Promise<{
        success: boolean;
    }>;
    getStageDays(stageId: string): Promise<{
        id: string;
        dayNumber: number;
        title: string | null;
        stageId: string;
    }[]>;
    uncompleteDay(userId: string, dayNumber: number): Promise<{
        id: string;
        createdAt: Date;
        dayNumber: number;
        userId: string;
    }>;
    getAllDays(): Promise<({
        stage: {
            id: string;
            description: string | null;
            days: number;
            title: string;
            order: number;
        };
        prayers: ({
            prayer: {
                id: string;
                title: string;
                content: string;
            };
        } & {
            id: string;
            order: number;
            dayId: string;
            prayerId: string;
        })[];
    } & {
        id: string;
        dayNumber: number;
        title: string | null;
        stageId: string;
    })[]>;
}
