import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateGroupDto } from './dto/create-group.dto';
import { EditGroupDto } from './dto/edit-group.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { JoinGroupDto } from './dto/join-group.dto';
import { RespondInviteDto } from './dto/respond-invite.dto';

const BRAZIL_MATCH_FILTER = {
  OR: [
    { homeTeam: { equals: 'brasil', mode: 'insensitive' as const } },
    { awayTeam: { equals: 'brasil', mode: 'insensitive' as const } },
  ],
};

const BRAZIL_PREDICTION_FILTER = { match: BRAZIL_MATCH_FILTER };

@Injectable()
export class GroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  // ─── Criar grupo ────────────────────────────────────────────────────────────

  async create(userId: string, dto: CreateGroupDto) {
    return this.prisma.cravouGroup.create({
      data: {
        name: dto.name,
        description: dto.description,
        brazilOnly: dto.brazilOnly ?? false,
        ownerId: userId,
        members: { create: { userId } },
      },
      include: { _count: { select: { members: true } } },
    });
  }

  // ─── Entrar via código ───────────────────────────────────────────────────────

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

    // Se havia convite pendente, marca como aceito
    await this.prisma.cravouGroupInvite.updateMany({
      where: { groupId: group.id, inviteeId: userId, status: 'pending' },
      data: { status: 'accepted' },
    });

    return { message: 'Entrou no grupo com sucesso', groupId: group.id, groupName: group.name };
  }

  // ─── Meus grupos ─────────────────────────────────────────────────────────────

  async getMyGroups(userId: string) {
    const groups = await this.prisma.cravouGroup.findMany({
      where: { members: { some: { userId } } },
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: 'desc' },
    });

    // Para cada grupo, calcular pontos do usuário e posição
    const result = await Promise.all(
      groups.map(async (g) => {
        const memberIds = (await this.prisma.cravouGroupMember.findMany({ where: { groupId: g.id }, select: { userId: true } })).map((m) => m.userId);
        const predictions = await this.prisma.cravouPrediction.findMany({
          where: {
            userId: { in: memberIds },
            points: { not: null },
            ...(g.brazilOnly ? BRAZIL_PREDICTION_FILTER : {}),
          },
          select: { userId: true, points: true },
        });

        const totals = new Map<string, number>();
        for (const p of predictions) {
          totals.set(p.userId, (totals.get(p.userId) ?? 0) + (p.points ?? 0));
        }

        const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
        const myPos = sorted.findIndex(([uid]) => uid === userId) + 1;
        const myPoints = totals.get(userId) ?? 0;

        return {
          id: g.id,
          name: g.name,
          description: g.description,
          inviteCode: g.inviteCode,
          ownerId: g.ownerId,
          brazilOnly: g.brazilOnly,
          memberCount: g._count.members,
          myPoints,
          myPosition: myPos > 0 ? myPos : g._count.members,
        };
      }),
    );

    return result;
  }

  // ─── Detalhes do grupo ────────────────────────────────────────────────────────

  async getGroup(groupId: string, userId: string) {
    const group = await this.prisma.cravouGroup.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group) throw new NotFoundException('Grupo não encontrado');

    const isMember = group.members.some((m) => m.userId === userId);
    if (!isMember) throw new ForbiddenException('Você não faz parte deste grupo');

    const memberUserIds = group.members.map((m) => m.userId);

    const [predictions, users] = await Promise.all([
      this.prisma.cravouPrediction.findMany({
        where: {
          userId: { in: memberUserIds },
          points: { not: null },
          ...(group.brazilOnly ? BRAZIL_PREDICTION_FILTER : {}),
        },
        select: { userId: true, points: true, matchId: true, homeScore: true, awayScore: true, match: { select: { phase: true } } },
      }),
      this.prisma.user.findMany({
        where: { id: { in: memberUserIds } },
        select: { id: true, name: true },
      }),
    ]);

    const totals = new Map<string, number>();
    const cravadas = new Map<string, number>();
    for (const p of predictions) {
      totals.set(p.userId, (totals.get(p.userId) ?? 0) + (p.points ?? 0));
      if (p.points === 15 || (p.points === 10 && p.match.phase === 'group_stage')) {
        cravadas.set(p.userId, (cravadas.get(p.userId) ?? 0) + 1);
      }
    }

    const ranking = users
      .map((u) => ({
        userId: u.id,
        name: u.name,
        points: totals.get(u.id) ?? 0,
        cravadas: cravadas.get(u.id) ?? 0,
      }))
      .sort((a, b) => b.points - a.points || b.cravadas - a.cravadas)
      .map((entry, index) => ({ position: index + 1, ...entry }));

    return {
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        inviteCode: group.inviteCode,
        ownerId: group.ownerId,
        brazilOnly: group.brazilOnly,
        memberCount: group.members.length,
        isOwner: group.ownerId === userId,
      },
      ranking,
    };
  }

  // ─── Editar grupo (só dono) ──────────────────────────────────────────────────

  async editGroup(groupId: string, userId: string, dto: EditGroupDto) {
    const group = await this.prisma.cravouGroup.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Grupo não encontrado');
    if (group.ownerId !== userId) throw new ForbiddenException('Apenas o dono pode editar o grupo');

    return this.prisma.cravouGroup.update({
      where: { id: groupId },
      data: { ...(dto.name && { name: dto.name }), ...(dto.description !== undefined && { description: dto.description }) },
    });
  }

  // ─── Excluir grupo (só dono) ─────────────────────────────────────────────────

  async deleteGroup(groupId: string, userId: string) {
    const group = await this.prisma.cravouGroup.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Grupo não encontrado');
    if (group.ownerId !== userId) throw new ForbiddenException('Apenas o dono pode excluir o grupo');

    await this.prisma.cravouGroup.delete({ where: { id: groupId } });
    return { message: 'Grupo excluído' };
  }

  // ─── Sair do grupo ───────────────────────────────────────────────────────────

  async leaveGroup(groupId: string, userId: string) {
    const group = await this.prisma.cravouGroup.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Grupo não encontrado');
    if (group.ownerId === userId) throw new BadRequestException('O dono não pode sair do grupo. Exclua o grupo.');

    const member = await this.prisma.cravouGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member) throw new NotFoundException('Você não é membro deste grupo');

    await this.prisma.cravouGroupMember.delete({
      where: { groupId_userId: { groupId, userId } },
    });

    return { message: 'Você saiu do grupo' };
  }

  // ─── Remover membro (só dono) ────────────────────────────────────────────────

  async removeMember(groupId: string, ownerId: string, targetUserId: string) {
    const group = await this.prisma.cravouGroup.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Grupo não encontrado');
    if (group.ownerId !== ownerId) throw new ForbiddenException('Apenas o dono pode remover membros');
    if (targetUserId === ownerId) throw new BadRequestException('O dono não pode se remover');

    const member = await this.prisma.cravouGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId: targetUserId } },
    });
    if (!member) throw new NotFoundException('Membro não encontrado');

    await this.prisma.cravouGroupMember.delete({
      where: { groupId_userId: { groupId, userId: targetUserId } },
    });

    return { message: 'Membro removido' };
  }

  // ─── Buscar usuários para convidar ───────────────────────────────────────────

  async searchUsers(query: string, groupId: string, requesterId: string) {
    if (!query || query.trim().length < 2) return [];

    const group = await this.prisma.cravouGroup.findUnique({
      where: { id: groupId },
      include: { members: true, invites: { where: { status: 'pending' } } },
    });
    if (!group) throw new NotFoundException('Grupo não encontrado');
    if (group.ownerId !== requesterId) throw new ForbiddenException('Apenas o dono pode convidar');

    const memberIds  = new Set(group.members.map((m) => m.userId));
    const pendingIds = new Set(group.invites.map((i) => i.inviteeId));

    const users = await this.prisma.user.findMany({
      where: {
        name: { contains: query.trim(), mode: 'insensitive' },
        id: { not: requesterId },
      },
      select: { id: true, name: true },
      take: 15,
    });

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      status: memberIds.has(u.id) ? 'member' : pendingIds.has(u.id) ? 'pending' : 'available',
    }));
  }

  // ─── Enviar convite ──────────────────────────────────────────────────────────

  async sendInvite(groupId: string, inviterId: string, dto: InviteMemberDto) {
    const group = await this.prisma.cravouGroup.findUnique({
      where: { id: groupId },
      include: { members: true },
    });
    if (!group) throw new NotFoundException('Grupo não encontrado');
    if (group.ownerId !== inviterId) throw new ForbiddenException('Apenas o dono pode convidar');

    const alreadyMember = group.members.some((m) => m.userId === dto.inviteeId);
    if (alreadyMember) throw new BadRequestException('Esta pessoa já é membro do grupo');

    const existing = await this.prisma.cravouGroupInvite.findUnique({
      where: { groupId_inviteeId: { groupId, inviteeId: dto.inviteeId } },
    });
    if (existing && existing.status === 'pending') {
      throw new BadRequestException('Já existe um convite pendente para esta pessoa');
    }

    const inviter = await this.prisma.user.findUnique({
      where: { id: inviterId },
      select: { name: true },
    });

    const invite = await this.prisma.cravouGroupInvite.upsert({
      where: { groupId_inviteeId: { groupId, inviteeId: dto.inviteeId } },
      create: { groupId, inviterId, inviteeId: dto.inviteeId, status: 'pending' },
      update: { status: 'pending', inviterId, createdAt: new Date() },
    });

    // Emite socket para o convidado
    this.realtime.emitGroupInviteReceived(dto.inviteeId, {
      inviteId: invite.id,
      groupId: group.id,
      groupName: group.name,
      inviterName: inviter?.name ?? '',
    });

    return { message: 'Convite enviado', inviteId: invite.id };
  }

  // ─── Convites pendentes recebidos ────────────────────────────────────────────

  async getPendingInvites(userId: string) {
    const invites = await this.prisma.cravouGroupInvite.findMany({
      where: { inviteeId: userId, status: 'pending' },
      include: { group: { select: { id: true, name: true, description: true, _count: { select: { members: true } } } } },
      orderBy: { createdAt: 'desc' },
    });

    const inviterIds = [...new Set(invites.map((i) => i.inviterId))];
    const inviters = await this.prisma.user.findMany({
      where: { id: { in: inviterIds } },
      select: { id: true, name: true },
    });
    const inviterMap = new Map(inviters.map((u) => [u.id, u.name]));

    return invites.map((i) => ({
      id: i.id,
      groupId: i.group.id,
      groupName: i.group.name,
      groupDescription: i.group.description,
      memberCount: i.group._count.members,
      inviterName: inviterMap.get(i.inviterId) ?? '',
      createdAt: i.createdAt,
    }));
  }

  // ─── Jogos finalizados do grupo ───────────────────────────────────────────────

  async getGroupFinishedMatches(groupId: string, userId: string) {
    const group = await this.prisma.cravouGroup.findUnique({
      where: { id: groupId },
      include: { members: true },
    });
    if (!group) throw new NotFoundException('Grupo não encontrado');
    const isMember = group.members.some((m) => m.userId === userId);
    if (!isMember) throw new ForbiddenException('Você não faz parte deste grupo');

    const matches = await this.prisma.cravouMatch.findMany({
      where: {
        status: 'finished',
        homeScore: { not: null },
        awayScore: { not: null },
        ...(group.brazilOnly ? BRAZIL_MATCH_FILTER : {}),
      },
      orderBy: { matchDate: 'desc' },
      select: {
        id: true,
        homeTeam: true,
        awayTeam: true,
        homeScore: true,
        awayScore: true,
        matchDate: true,
        phase: true,
        penaltyWinner: true,
      },
    });

    return { matches };
  }

  // ─── Palpites de todos os membros para um jogo ───────────────────────────────

  async getGroupMatchPalpites(groupId: string, matchId: string, userId: string) {
    const group = await this.prisma.cravouGroup.findUnique({
      where: { id: groupId },
      include: { members: true },
    });
    if (!group) throw new NotFoundException('Grupo não encontrado');
    const isMember = group.members.some((m) => m.userId === userId);
    if (!isMember) throw new ForbiddenException('Você não faz parte deste grupo');

    const match = await this.prisma.cravouMatch.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        homeTeam: true,
        awayTeam: true,
        homeScore: true,
        awayScore: true,
        matchDate: true,
        phase: true,
        penaltyWinner: true,
        status: true,
      },
    });
    if (!match) throw new NotFoundException('Jogo não encontrado');
    if (match.status !== 'finished') throw new BadRequestException('Jogo ainda não finalizado');

    const memberUserIds = group.members.map((m) => m.userId);

    const [users, predictions] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: memberUserIds } },
        select: { id: true, name: true },
      }),
      this.prisma.cravouPrediction.findMany({
        where: { matchId, userId: { in: memberUserIds } },
        select: { userId: true, homeScore: true, awayScore: true, penaltyWinner: true, points: true },
      }),
    ]);

    const predMap = new Map(predictions.map((p) => [p.userId, p]));

    const palpites = users.map((u) => {
      const pred = predMap.get(u.id);
      if (!pred) {
        return {
          userId: u.id,
          name: u.name,
          homeScore: null as number | null,
          awayScore: null as number | null,
          penaltyWinner: null as string | null,
          points: null as number | null,
          category: 'sem_palpite' as const,
        };
      }

      const pts = pred.points;
      const isGroupStage = match.phase === 'group_stage';
      let category: 'cravou' | 'resultado_bonus' | 'resultado_certo' | 'parcial' | 'errou';
      if (pts !== null && (pts >= 15 || (pts === 10 && isGroupStage))) category = 'cravou';
      else if (pts !== null && (pts === 7 || (pts === 10 && !isGroupStage))) category = 'resultado_bonus';
      else if (pts !== null && pts >= 5) category = 'resultado_certo';
      else if (pts !== null && pts >= 2) category = 'parcial';
      else category = 'errou';

      return {
        userId: u.id,
        name: u.name,
        homeScore: pred.homeScore,
        awayScore: pred.awayScore,
        penaltyWinner: pred.penaltyWinner,
        points: pts,
        category,
      };
    });

    const order: Record<string, number> = { cravou: 0, resultado_bonus: 1, resultado_certo: 2, parcial: 3, errou: 4, sem_palpite: 5 };
    palpites.sort((a, b) => order[a.category] - order[b.category] || (b.points ?? -1) - (a.points ?? -1));

    return {
      match: {
        id: match.id,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        matchDate: match.matchDate,
        phase: match.phase,
        penaltyWinner: match.penaltyWinner,
      },
      palpites,
    };
  }

  // ─── Responder convite ───────────────────────────────────────────────────────

  async respondToInvite(inviteId: string, userId: string, dto: RespondInviteDto) {
    const invite = await this.prisma.cravouGroupInvite.findUnique({
      where: { id: inviteId },
    });
    if (!invite) throw new NotFoundException('Convite não encontrado');
    if (invite.inviteeId !== userId) throw new ForbiddenException('Este convite não é para você');
    if (invite.status !== 'pending') throw new BadRequestException('Este convite já foi respondido');

    await this.prisma.cravouGroupInvite.update({
      where: { id: inviteId },
      data: { status: dto.status },
    });

    if (dto.status === 'accepted') {
      const alreadyMember = await this.prisma.cravouGroupMember.findUnique({
        where: { groupId_userId: { groupId: invite.groupId, userId } },
      });
      if (!alreadyMember) {
        await this.prisma.cravouGroupMember.create({
          data: { groupId: invite.groupId, userId },
        });
      }
      return { message: 'Você entrou no grupo', groupId: invite.groupId };
    }

    return { message: 'Convite recusado' };
  }
}
