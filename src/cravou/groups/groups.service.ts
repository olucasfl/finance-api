import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { JoinGroupDto } from './dto/join-group.dto';

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateGroupDto) {
    const group = await this.prisma.cravouGroup.create({
      data: {
        name: dto.name,
        description: dto.description,
        ownerId: userId,
        members: {
          create: { userId },
        },
      },
      include: { members: true },
    });
    return group;
  }

  async join(userId: string, dto: JoinGroupDto) {
    const group = await this.prisma.cravouGroup.findUnique({
      where: { inviteCode: dto.inviteCode },
      include: { members: true },
    });

    if (!group) throw new NotFoundException('Grupo não encontrado com este código');

    const alreadyMember = group.members.some((m) => m.userId === userId);
    if (alreadyMember) throw new BadRequestException('Você já é membro deste grupo');

    await this.prisma.cravouGroupMember.create({
      data: { groupId: group.id, userId },
    });

    return { message: 'Entrou no grupo com sucesso', groupId: group.id, groupName: group.name };
  }

  getMyGroups(userId: string) {
    return this.prisma.cravouGroup.findMany({
      where: { members: { some: { userId } } },
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getGroup(groupId: string, userId: string) {
    const group = await this.prisma.cravouGroup.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group) throw new NotFoundException('Grupo não encontrado');

    const isMember = group.members.some((m) => m.userId === userId);
    if (!isMember) throw new ForbiddenException('Você não faz parte deste grupo');

    const memberUserIds = group.members.map((m) => m.userId);

    const predictions = await this.prisma.cravouPrediction.findMany({
      where: { userId: { in: memberUserIds }, points: { not: null } },
      select: { userId: true, points: true },
    });

    const totals = new Map<string, number>();
    for (const p of predictions) {
      totals.set(p.userId, (totals.get(p.userId) ?? 0) + (p.points ?? 0));
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: memberUserIds } },
      select: { id: true, name: true, email: true },
    });

    const ranking = users
      .map((u) => ({ userId: u.id, name: u.name, email: u.email, points: totals.get(u.id) ?? 0 }))
      .sort((a, b) => b.points - a.points)
      .map((entry, index) => ({ position: index + 1, ...entry }));

    return {
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        inviteCode: group.inviteCode,
        ownerId: group.ownerId,
        memberCount: group.members.length,
      },
      ranking,
    };
  }
}
