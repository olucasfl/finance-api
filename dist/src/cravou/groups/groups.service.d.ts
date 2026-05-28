import { PrismaService } from 'src/prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { JoinGroupDto } from './dto/join-group.dto';
export declare class GroupsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(userId: string, dto: CreateGroupDto): Promise<{
        members: {
            id: string;
            userId: string;
            joinedAt: Date;
            groupId: string;
        }[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        description: string | null;
        inviteCode: string;
        ownerId: string;
    }>;
    join(userId: string, dto: JoinGroupDto): Promise<{
        message: string;
        groupId: string;
        groupName: string;
    }>;
    getMyGroups(userId: string): import(".prisma/client").Prisma.PrismaPromise<({
        _count: {
            members: number;
        };
    } & {
        id: string;
        name: string;
        createdAt: Date;
        description: string | null;
        inviteCode: string;
        ownerId: string;
    })[]>;
    getGroup(groupId: string, userId: string): Promise<{
        group: {
            id: string;
            name: string;
            description: string | null;
            inviteCode: string;
            ownerId: string;
            memberCount: number;
        };
        ranking: {
            userId: string;
            name: string;
            email: string;
            points: number;
            position: number;
        }[];
    }>;
}
