import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

export interface StandingRow {
  teamName: string;
  group: string;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

@Injectable()
export class TiebreakerService {
  constructor(private readonly prisma: PrismaService) {}

  async sort(teams: StandingRow[]): Promise<(StandingRow & { position: number | null })[]> {
    if (teams.length <= 1) {
      return teams.map((t, i) => ({ ...t, position: i + 1 }));
    }

    // Ordena por critérios 1-3 primeiro
    const sorted = [...teams].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });

    // Agrupa times com mesma pontuação para verificar critério 4 (confronto direto)
    const result: (StandingRow & { position: number | null })[] = [];
    let positionCounter = 1;
    let i = 0;

    while (i < sorted.length) {
      // Encontra grupo de times empatados nos critérios 1-3
      const tiedGroup = [sorted[i]];
      let j = i + 1;

      while (
        j < sorted.length &&
        sorted[j].points === sorted[i].points &&
        sorted[j].goalDifference === sorted[i].goalDifference &&
        sorted[j].goalsFor === sorted[i].goalsFor
      ) {
        tiedGroup.push(sorted[j]);
        j++;
      }

      if (tiedGroup.length === 1) {
        result.push({ ...tiedGroup[0], position: positionCounter });
        positionCounter++;
      } else {
        // Aplica critério 4: confronto direto entre os empatados
        const resolved = await this.resolveByHeadToHead(tiedGroup, positionCounter);
        result.push(...resolved);
        positionCounter += tiedGroup.length;
      }

      i = j;
    }

    return result;
  }

  private async resolveByHeadToHead(
    teams: StandingRow[],
    startPosition: number,
  ): Promise<(StandingRow & { position: number | null })[]> {
    const group = teams[0].group;
    const teamNames = teams.map((t) => t.teamName);

    // Busca todas as partidas finalizadas entre os times empatados
    const matches = await this.prisma.cravouMatch.findMany({
      where: {
        groupName: group,
        status: 'finished',
        homeTeam: { in: teamNames },
        awayTeam: { in: teamNames },
      },
    });

    // Verifica se todos os times empatados se enfrentaram entre si
    const expectedMatches = (teamNames.length * (teamNames.length - 1)) / 2;
    if (matches.length < expectedMatches) {
      // Confronto direto não se aplica (nem todos se enfrentaram) → position null, admin resolve
      return teams.map((t) => ({ ...t, position: null }));
    }

    // Calcula mini-tabela de confronto direto
    const h2h = new Map<string, { points: number; gd: number; gf: number }>();
    for (const name of teamNames) h2h.set(name, { points: 0, gd: 0, gf: 0 });

    for (const m of matches) {
      if (m.homeScore === null || m.awayScore === null) continue;
      const home = h2h.get(m.homeTeam)!;
      const away = h2h.get(m.awayTeam)!;

      home.gf += m.homeScore;
      home.gd += m.homeScore - m.awayScore;
      away.gf += m.awayScore;
      away.gd += m.awayScore - m.homeScore;

      if (m.homeScore > m.awayScore) {
        home.points += 3;
      } else if (m.homeScore === m.awayScore) {
        home.points += 1;
        away.points += 1;
      } else {
        away.points += 3;
      }
    }

    const sortedByH2H = [...teams].sort((a, b) => {
      const ha = h2h.get(a.teamName)!;
      const hb = h2h.get(b.teamName)!;
      if (hb.points !== ha.points) return hb.points - ha.points;
      if (hb.gd !== ha.gd) return hb.gd - ha.gd;
      if (hb.gf !== ha.gf) return hb.gf - ha.gf;
      return 0; // Ainda empatado → position null, admin resolve via FIFA draw
    });

    // Verifica se ainda há empate após H2H
    const stillTied = sortedByH2H.some((t, idx) => {
      if (idx === 0) return false;
      const prev = sortedByH2H[idx - 1];
      const hp = h2h.get(t.teamName)!;
      const hprev = h2h.get(prev.teamName)!;
      return hp.points === hprev.points && hp.gd === hprev.gd && hp.gf === hprev.gf;
    });

    if (stillTied) {
      return sortedByH2H.map((t) => ({ ...t, position: null }));
    }

    return sortedByH2H.map((t, idx) => ({ ...t, position: startPosition + idx }));
  }
}
