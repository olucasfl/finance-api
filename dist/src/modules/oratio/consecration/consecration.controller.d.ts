import { ConsecrationService } from './consecration.service';
export declare class ConsecrationController {
    private readonly service;
    constructor(service: ConsecrationService);
    start(req: any, body: {
        consecrationDate: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        startDate: Date;
    }>;
    progress(req: any): Promise<{
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
    getDay(day: string): Promise<{
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
    createStage(body: any): Promise<{
        id: string;
        description: string | null;
        days: number;
        title: string;
        order: number;
    }>;
    createDay(body: any): Promise<{
        id: string;
        dayNumber: number;
        title: string | null;
        stageId: string;
    }>;
    createPrayer(body: any): Promise<{
        id: string;
        title: string;
        content: string;
    }>;
    addPrayerToDay(body: any): Promise<{
        id: string;
        order: number;
        dayId: string;
        prayerId: string;
    }>;
    updateDayPrayer(id: string, body: {
        order: number;
    }): Promise<{
        id: string;
        order: number;
        dayId: string;
        prayerId: string;
    }>;
    updatePrayer(id: string, body: {
        title?: string;
        content?: string;
    }): Promise<{
        id: string;
        title: string;
        content: string;
    }>;
    getAll(): Promise<({
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
    today(req: any): Promise<({
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
    reset(req: any): Promise<{
        success: boolean;
    }>;
    complete(req: any, day: string): Promise<{
        id: string;
        createdAt: Date;
        dayNumber: number;
        userId: string;
    }>;
    updateStartDate(req: any, body: {
        consecrationDate: string;
    }): Promise<{
        success: boolean;
    }>;
    getStageDays(stageId: string): Promise<{
        id: string;
        dayNumber: number;
        title: string | null;
        stageId: string;
    }[]>;
    uncompleteDay(req: any, day: string): Promise<{
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
