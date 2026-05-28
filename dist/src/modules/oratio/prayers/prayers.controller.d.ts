import { PrayersService } from './prayers.service';
export declare class PrayersController {
    private readonly service;
    constructor(service: PrayersService);
    createCategory(body: any): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        slug: string;
    }>;
    getCategories(): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        slug: string;
    }[]>;
    createPrayer(body: any): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        content: string;
        categoryId: string;
    }>;
    getPrayers(slug: string): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        content: string;
        categoryId: string;
    }[]>;
    getPrayer(id: string): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        content: string;
        categoryId: string;
    }>;
    completePrayer(req: any): Promise<{
        success: boolean;
    }>;
}
