import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

export interface ThirdPlaceEntry {
  teamName: string;
  group: string;
  points: number;
  goalDifference: number;
  goalsFor: number;
  isQualified: boolean;
}

@Injectable()
export class ThirdPlaceService {
  private readonly logger = new Logger(ThirdPlaceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async selectBest8(): Promise<{ qualifiers: ThirdPlaceEntry[]; eliminated: ThirdPlaceEntry[] }> {
    const thirds = await this.prisma.cravouGroupStanding.findMany({
      where: { position: 3 },
      orderBy: [{ points: 'desc' }, { goalDifference: 'desc' }, { goalsFor: 'desc' }],
    });

    if (thirds.length < 12) {
      this.logger.warn(`Apenas ${thirds.length} terceiros disponíveis — aguardando todos os grupos`);
    }

    const qualifiers = thirds.slice(0, 8);
    const eliminated = thirds.slice(8);

    // Atualiza isQualified para os 8 melhores
    for (const q of qualifiers) {
      await this.prisma.cravouGroupStanding.update({
        where: { group_teamName: { group: q.group, teamName: q.teamName } },
        data: { isQualified: true },
      });
    }

    for (const e of eliminated) {
      await this.prisma.cravouGroupStanding.update({
        where: { group_teamName: { group: e.group, teamName: e.teamName } },
        data: { isQualified: false },
      });
    }

    this.logger.log(`8 melhores terceiros selecionados: ${qualifiers.map((q) => q.teamName).join(', ')}`);

    return {
      qualifiers: qualifiers.map((q) => ({
        teamName: q.teamName,
        group: q.group,
        points: q.points,
        goalDifference: q.goalDifference,
        goalsFor: q.goalsFor,
        isQualified: true,
      })),
      eliminated: eliminated.map((e) => ({
        teamName: e.teamName,
        group: e.group,
        points: e.points,
        goalDifference: e.goalDifference,
        goalsFor: e.goalsFor,
        isQualified: false,
      })),
    };
  }

  // Retorna os 8 qualificados já selecionados (para o mapeamento R32)
  async getQualifiedThirds(): Promise<{ teamName: string; group: string }[]> {
    const thirds = await this.prisma.cravouGroupStanding.findMany({
      where: { position: 3, isQualified: true },
      select: { teamName: true, group: true },
    });
    return thirds;
  }
}
