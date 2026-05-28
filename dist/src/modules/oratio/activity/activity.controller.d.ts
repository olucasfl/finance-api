import { ActivityService } from './activity.service';
export declare class ActivityController {
    private activityService;
    constructor(activityService: ActivityService);
    ping(req: any): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        type: string;
        action: string;
    }>;
}
