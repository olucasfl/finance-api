import { VoxAiService } from "./voxai.service";
import { VoxAiDto } from "./dto/voxai.dto";
import { PrismaService } from "src/prisma/prisma.service";
export declare class VoxAiController {
    private readonly voxAiService;
    private prisma;
    constructor(voxAiService: VoxAiService, prisma: PrismaService);
    chat(body: VoxAiDto): Promise<{
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
    getActiveConversation(req: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string | null;
        hasMessages: boolean;
    }>;
    createConversation(req: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string | null;
        hasMessages: boolean;
    }>;
    getConversations(req: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string | null;
        hasMessages: boolean;
    }[]>;
    getMessages(id: string, req: any): Promise<{
        id: string;
        createdAt: Date;
        content: string;
        conversationId: string;
        role: string;
    }[] | {
        error: string;
    }>;
    deleteConversation(id: string, req: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string | null;
        hasMessages: boolean;
    }>;
    renameConversation(id: string, title: string, req: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string | null;
        hasMessages: boolean;
    }>;
}
