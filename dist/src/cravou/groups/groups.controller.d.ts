import { CreateGroupDto } from './dto/create-group.dto';
import { JoinGroupDto } from './dto/join-group.dto';
import { GroupsService } from './groups.service';
export declare class GroupsController {
    private readonly groupsService;
    constructor(groupsService: GroupsService);
    create(req: any, dto: CreateGroupDto): Promise<{
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
    join(req: any, dto: JoinGroupDto): Promise<{
        message: string;
        groupId: string;
        groupName: string;
    }>;
    getMyGroups(req: any): import(".prisma/client").Prisma.PrismaPromise<({
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
    getGroup(id: string, req: any): Promise<{
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
