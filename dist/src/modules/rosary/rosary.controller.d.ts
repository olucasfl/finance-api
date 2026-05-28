import { RosaryService } from "./rosary.service";
export declare class RosaryController {
    private service;
    constructor(service: RosaryService);
    session(req: any): Promise<{
        id: string;
        userId: string;
        currentStep: number;
        completed: boolean;
        startedAt: Date;
        finishedAt: Date | null;
    } | null>;
    start(req: any): Promise<{
        id: string;
        userId: string;
        currentStep: number;
        completed: boolean;
        startedAt: Date;
        finishedAt: Date | null;
    }>;
    next(req: any): Promise<{
        id: string;
        userId: string;
        currentStep: number;
        completed: boolean;
        startedAt: Date;
        finishedAt: Date | null;
    }>;
    finish(req: any): Promise<{
        success: boolean;
    }>;
    getRosary(type: string): any[];
}
