import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

interface M {
  n: number;
  phase: string;
  group?: string;
  round?: number;
  home: string;
  away: string;
  date: Date;
  stadium: string;
  // For knockout slots: bracket slot number and round
  slotNumber?: number;
}

// BRT = UTC-3 → UTC = BRT + 3
// For 00:00 BRT "last game of the night": pass the NEXT calendar date, time='00:00'
function d(dateStr: string, brtTime: string): Date {
  const [h, m] = brtTime.split(':').map(Number);
  const utcH = h + 3;
  const base = new Date(`${dateStr}T00:00:00Z`);
  if (utcH >= 24) {
    base.setUTCDate(base.getUTCDate() + 1);
    base.setUTCHours(utcH - 24, m, 0, 0);
  } else {
    base.setUTCHours(utcH, m, 0, 0);
  }
  return base;
}

const MATCHES: M[] = [
  // ── FASE DE GRUPOS – RODADA 1 ─────────────────────────────────────────────
  { n:  1, phase:'group_stage', group:'A', round:1, home:'México',             away:'África do Sul',    date:d('2026-06-11','16:00'), stadium:'Estadio Azteca' },
  { n:  2, phase:'group_stage', group:'A', round:1, home:'Coreia do Sul',      away:'Tchéquia',         date:d('2026-06-11','23:00'), stadium:'Estadio Akron' },
  { n:  3, phase:'group_stage', group:'B', round:1, home:'Canadá',             away:'Bósnia-Herzegovina', date:d('2026-06-12','16:00'), stadium:'BMO Field' },
  { n:  4, phase:'group_stage', group:'D', round:1, home:'EUA',                away:'Paraguai',         date:d('2026-06-12','22:00'), stadium:'SoFi Stadium' },
  { n:  5, phase:'group_stage', group:'B', round:1, home:'Catar',              away:'Suíça',            date:d('2026-06-13','16:00'), stadium:"Levi's Stadium" },
  { n:  6, phase:'group_stage', group:'C', round:1, home:'Brasil',             away:'Marrocos',         date:d('2026-06-13','19:00'), stadium:'MetLife Stadium' },
  { n:  7, phase:'group_stage', group:'C', round:1, home:'Haiti',              away:'Escócia',          date:d('2026-06-13','22:00'), stadium:'Gillette Stadium' },
  { n:  8, phase:'group_stage', group:'D', round:1, home:'Austrália',          away:'Turquia',          date:d('2026-06-14','01:00'), stadium:'BC Place' },
  { n:  9, phase:'group_stage', group:'E', round:1, home:'Alemanha',           away:'Curaçao',          date:d('2026-06-14','14:00'), stadium:'NRG Stadium' },
  { n: 10, phase:'group_stage', group:'F', round:1, home:'Holanda',            away:'Japão',            date:d('2026-06-14','17:00'), stadium:'AT&T Stadium' },
  { n: 11, phase:'group_stage', group:'E', round:1, home:'Costa do Marfim',    away:'Equador',          date:d('2026-06-14','20:00'), stadium:'Lincoln Financial Field' },
  { n: 12, phase:'group_stage', group:'F', round:1, home:'Suécia',             away:'Tunísia',          date:d('2026-06-14','23:00'), stadium:'Estadio BBVA' },
  { n: 13, phase:'group_stage', group:'H', round:1, home:'Espanha',            away:'Cabo Verde',       date:d('2026-06-15','13:00'), stadium:'Mercedes-Benz Stadium' },
  { n: 14, phase:'group_stage', group:'G', round:1, home:'Bélgica',            away:'Egito',            date:d('2026-06-15','16:00'), stadium:'Lumen Field' },
  { n: 15, phase:'group_stage', group:'H', round:1, home:'Arábia Saudita',     away:'Uruguai',          date:d('2026-06-15','19:00'), stadium:'Hard Rock Stadium' },
  { n: 16, phase:'group_stage', group:'G', round:1, home:'Irã',                away:'Nova Zelândia',    date:d('2026-06-15','22:00'), stadium:'SoFi Stadium' },
  { n: 17, phase:'group_stage', group:'I', round:1, home:'França',             away:'Senegal',          date:d('2026-06-16','16:00'), stadium:'MetLife Stadium' },
  { n: 18, phase:'group_stage', group:'I', round:1, home:'Iraque',             away:'Noruega',          date:d('2026-06-16','19:00'), stadium:'Gillette Stadium' },
  { n: 19, phase:'group_stage', group:'J', round:1, home:'Argentina',          away:'Argélia',          date:d('2026-06-16','22:00'), stadium:'Arrowhead Stadium' },
  { n: 20, phase:'group_stage', group:'J', round:1, home:'Áustria',            away:'Jordânia',         date:d('2026-06-17','01:00'), stadium:"Levi's Stadium" },
  { n: 21, phase:'group_stage', group:'K', round:1, home:'Portugal',           away:'RD Congo',  date:d('2026-06-17','14:00'), stadium:'NRG Stadium' },
  { n: 22, phase:'group_stage', group:'L', round:1, home:'Inglaterra',         away:'Croácia',          date:d('2026-06-17','17:00'), stadium:'AT&T Stadium' },
  { n: 23, phase:'group_stage', group:'L', round:1, home:'Gana',               away:'Panamá',           date:d('2026-06-17','20:00'), stadium:'BMO Field' },
  { n: 24, phase:'group_stage', group:'K', round:1, home:'Uzbequistão',        away:'Colômbia',         date:d('2026-06-17','23:00'), stadium:'Estadio Azteca' },

  // ── FASE DE GRUPOS – RODADA 2 ─────────────────────────────────────────────
  { n: 25, phase:'group_stage', group:'A', round:2, home:'Tchéquia',           away:'África do Sul',    date:d('2026-06-18','13:00'), stadium:'Mercedes-Benz Stadium' },
  { n: 26, phase:'group_stage', group:'B', round:2, home:'Suíça',              away:'Bósnia-Herzegovina', date:d('2026-06-18','16:00'), stadium:'SoFi Stadium' },
  { n: 27, phase:'group_stage', group:'B', round:2, home:'Canadá',             away:'Catar',            date:d('2026-06-18','19:00'), stadium:'BC Place' },
  { n: 28, phase:'group_stage', group:'A', round:2, home:'México',             away:'Coreia do Sul',    date:d('2026-06-18','22:00'), stadium:'Estadio Akron' },
  { n: 29, phase:'group_stage', group:'D', round:2, home:'EUA',                away:'Austrália',        date:d('2026-06-19','16:00'), stadium:'Lumen Field' },
  { n: 30, phase:'group_stage', group:'C', round:2, home:'Escócia',            away:'Marrocos',         date:d('2026-06-19','19:00'), stadium:'Gillette Stadium' },
  { n: 31, phase:'group_stage', group:'C', round:2, home:'Brasil',             away:'Haiti',            date:d('2026-06-19','21:30'), stadium:'Lincoln Financial Field' },
  { n: 32, phase:'group_stage', group:'D', round:2, home:'Turquia',            away:'Paraguai',         date:d('2026-06-20','00:00'), stadium:"Levi's Stadium" },
  { n: 33, phase:'group_stage', group:'F', round:2, home:'Holanda',            away:'Suécia',           date:d('2026-06-20','14:00'), stadium:'NRG Stadium' },
  { n: 34, phase:'group_stage', group:'E', round:2, home:'Alemanha',           away:'Costa do Marfim',  date:d('2026-06-20','17:00'), stadium:'BMO Field' },
  { n: 35, phase:'group_stage', group:'E', round:2, home:'Equador',            away:'Curaçao',          date:d('2026-06-20','21:00'), stadium:'Arrowhead Stadium' },
  { n: 36, phase:'group_stage', group:'F', round:2, home:'Tunísia',            away:'Japão',            date:d('2026-06-21','01:00'), stadium:'Estadio BBVA' },
  { n: 37, phase:'group_stage', group:'H', round:2, home:'Espanha',            away:'Arábia Saudita',   date:d('2026-06-21','13:00'), stadium:'Mercedes-Benz Stadium' },
  { n: 38, phase:'group_stage', group:'G', round:2, home:'Bélgica',            away:'Irã',              date:d('2026-06-21','16:00'), stadium:'SoFi Stadium' },
  { n: 39, phase:'group_stage', group:'H', round:2, home:'Uruguai',            away:'Cabo Verde',       date:d('2026-06-21','19:00'), stadium:'Hard Rock Stadium' },
  { n: 40, phase:'group_stage', group:'G', round:2, home:'Nova Zelândia',      away:'Egito',            date:d('2026-06-21','22:00'), stadium:'BC Place' },
  { n: 41, phase:'group_stage', group:'J', round:2, home:'Argentina',          away:'Áustria',          date:d('2026-06-22','14:00'), stadium:'AT&T Stadium' },
  { n: 42, phase:'group_stage', group:'I', round:2, home:'França',             away:'Iraque',           date:d('2026-06-22','18:00'), stadium:'Lincoln Financial Field' },
  { n: 43, phase:'group_stage', group:'I', round:2, home:'Noruega',            away:'Senegal',          date:d('2026-06-22','21:00'), stadium:'MetLife Stadium' },
  { n: 44, phase:'group_stage', group:'J', round:2, home:'Jordânia',           away:'Argélia',          date:d('2026-06-23','00:00'), stadium:"Levi's Stadium" },
  { n: 45, phase:'group_stage', group:'K', round:2, home:'Portugal',           away:'Uzbequistão',      date:d('2026-06-23','14:00'), stadium:'NRG Stadium' },
  { n: 46, phase:'group_stage', group:'L', round:2, home:'Inglaterra',         away:'Gana',             date:d('2026-06-23','17:00'), stadium:'Gillette Stadium' },
  { n: 47, phase:'group_stage', group:'L', round:2, home:'Panamá',             away:'Croácia',          date:d('2026-06-23','20:00'), stadium:'BMO Field' },
  { n: 48, phase:'group_stage', group:'K', round:2, home:'Colômbia',           away:'RD Congo',  date:d('2026-06-23','23:00'), stadium:'Estadio Akron' },

  // ── FASE DE GRUPOS – RODADA 3 (simultâneos) ───────────────────────────────
  { n: 49, phase:'group_stage', group:'B', round:3, home:'Suíça',              away:'Canadá',           date:d('2026-06-24','16:00'), stadium:'BC Place' },
  { n: 50, phase:'group_stage', group:'B', round:3, home:'Bósnia-Herzegovina', away:'Catar',            date:d('2026-06-24','16:00'), stadium:'Lumen Field' },
  { n: 51, phase:'group_stage', group:'C', round:3, home:'Escócia',            away:'Brasil',           date:d('2026-06-24','19:00'), stadium:'Hard Rock Stadium' },
  { n: 52, phase:'group_stage', group:'C', round:3, home:'Marrocos',           away:'Haiti',            date:d('2026-06-24','19:00'), stadium:'Mercedes-Benz Stadium' },
  { n: 53, phase:'group_stage', group:'A', round:3, home:'Tchéquia',           away:'México',           date:d('2026-06-24','22:00'), stadium:'Estadio Azteca' },
  { n: 54, phase:'group_stage', group:'A', round:3, home:'África do Sul',      away:'Coreia do Sul',    date:d('2026-06-24','22:00'), stadium:'Estadio BBVA' },
  { n: 55, phase:'group_stage', group:'E', round:3, home:'Curaçao',            away:'Costa do Marfim',  date:d('2026-06-25','17:00'), stadium:'Lincoln Financial Field' },
  { n: 56, phase:'group_stage', group:'E', round:3, home:'Equador',            away:'Alemanha',         date:d('2026-06-25','17:00'), stadium:'MetLife Stadium' },
  { n: 57, phase:'group_stage', group:'F', round:3, home:'Japão',              away:'Suécia',           date:d('2026-06-25','20:00'), stadium:'AT&T Stadium' },
  { n: 58, phase:'group_stage', group:'F', round:3, home:'Tunísia',            away:'Holanda',          date:d('2026-06-25','20:00'), stadium:'Arrowhead Stadium' },
  { n: 59, phase:'group_stage', group:'D', round:3, home:'Turquia',            away:'EUA',              date:d('2026-06-25','23:00'), stadium:'SoFi Stadium' },
  { n: 60, phase:'group_stage', group:'D', round:3, home:'Paraguai',           away:'Austrália',        date:d('2026-06-25','23:00'), stadium:"Levi's Stadium" },
  { n: 61, phase:'group_stage', group:'I', round:3, home:'Noruega',            away:'França',           date:d('2026-06-26','16:00'), stadium:'Gillette Stadium' },
  { n: 62, phase:'group_stage', group:'I', round:3, home:'Senegal',            away:'Iraque',           date:d('2026-06-26','16:00'), stadium:'BMO Field' },
  { n: 63, phase:'group_stage', group:'H', round:3, home:'Cabo Verde',         away:'Arábia Saudita',   date:d('2026-06-26','21:00'), stadium:'NRG Stadium' },
  { n: 64, phase:'group_stage', group:'H', round:3, home:'Uruguai',            away:'Espanha',          date:d('2026-06-26','21:00'), stadium:'Estadio Akron' },
  { n: 65, phase:'group_stage', group:'G', round:3, home:'Egito',              away:'Irã',              date:d('2026-06-27','00:00'), stadium:'Lumen Field' },
  { n: 66, phase:'group_stage', group:'G', round:3, home:'Nova Zelândia',      away:'Bélgica',          date:d('2026-06-27','00:00'), stadium:'BC Place' },
  { n: 67, phase:'group_stage', group:'L', round:3, home:'Panamá',             away:'Inglaterra',       date:d('2026-06-27','18:00'), stadium:'MetLife Stadium' },
  { n: 68, phase:'group_stage', group:'L', round:3, home:'Croácia',            away:'Gana',             date:d('2026-06-27','18:00'), stadium:'Lincoln Financial Field' },
  { n: 69, phase:'group_stage', group:'K', round:3, home:'Colômbia',           away:'Portugal',         date:d('2026-06-27','20:30'), stadium:'Hard Rock Stadium' },
  { n: 70, phase:'group_stage', group:'K', round:3, home:'RD Congo',    away:'Uzbequistão',      date:d('2026-06-27','20:30'), stadium:'Mercedes-Benz Stadium' },
  { n: 71, phase:'group_stage', group:'J', round:3, home:'Argélia',            away:'Áustria',          date:d('2026-06-27','23:00'), stadium:'Arrowhead Stadium' },
  { n: 72, phase:'group_stage', group:'J', round:3, home:'Jordânia',           away:'Argentina',        date:d('2026-06-27','23:00'), stadium:'AT&T Stadium' },

  // ── 16 AVOS (Round of 32) ─────────────────────────────────────────────────
  // Slot numbers match r32-mapping.data.ts (slot = jogo - 72)
  { n: 73, phase:'round_of_32', slotNumber:1,  home:'2º Grupo A',    away:'2º Grupo B',    date:d('2026-06-28','16:00'), stadium:'SoFi Stadium' },
  { n: 74, phase:'round_of_32', slotNumber:2,  home:'1º Grupo E',    away:'Melhor 3º',     date:d('2026-06-29','17:30'), stadium:'Gillette Stadium' },
  { n: 75, phase:'round_of_32', slotNumber:3,  home:'1º Grupo F',    away:'2º Grupo C',    date:d('2026-06-29','22:00'), stadium:'Estadio BBVA' },
  { n: 76, phase:'round_of_32', slotNumber:4,  home:'1º Grupo C',    away:'2º Grupo F',    date:d('2026-06-29','14:00'), stadium:'NRG Stadium' },
  { n: 77, phase:'round_of_32', slotNumber:5,  home:'1º Grupo I',    away:'Melhor 3º',     date:d('2026-06-30','18:00'), stadium:'MetLife Stadium' },
  { n: 78, phase:'round_of_32', slotNumber:6,  home:'2º Grupo E',    away:'2º Grupo I',    date:d('2026-06-30','14:00'), stadium:'AT&T Stadium' },
  { n: 79, phase:'round_of_32', slotNumber:7,  home:'1º Grupo A',    away:'Melhor 3º',     date:d('2026-06-30','22:00'), stadium:'Estadio Azteca' },
  { n: 80, phase:'round_of_32', slotNumber:8,  home:'1º Grupo L',    away:'Melhor 3º',     date:d('2026-07-01','13:00'), stadium:'Mercedes-Benz Stadium' },
  { n: 81, phase:'round_of_32', slotNumber:9,  home:'1º Grupo D',    away:'Melhor 3º',     date:d('2026-07-01','21:00'), stadium:"Levi's Stadium" },
  { n: 82, phase:'round_of_32', slotNumber:10, home:'1º Grupo G',    away:'Melhor 3º',     date:d('2026-07-01','17:00'), stadium:'Lumen Field' },
  { n: 83, phase:'round_of_32', slotNumber:11, home:'2º Grupo K',    away:'2º Grupo L',    date:d('2026-07-02','20:00'), stadium:'BMO Field' },
  { n: 84, phase:'round_of_32', slotNumber:12, home:'1º Grupo H',    away:'2º Grupo J',    date:d('2026-07-02','16:00'), stadium:'SoFi Stadium' },
  { n: 85, phase:'round_of_32', slotNumber:13, home:'1º Grupo B',    away:'Melhor 3º',     date:d('2026-07-03','00:00'), stadium:'BC Place' },
  { n: 86, phase:'round_of_32', slotNumber:14, home:'1º Grupo J',    away:'2º Grupo H',    date:d('2026-07-03','19:00'), stadium:'Hard Rock Stadium' },
  { n: 87, phase:'round_of_32', slotNumber:15, home:'1º Grupo K',    away:'Melhor 3º',     date:d('2026-07-03','22:30'), stadium:'Arrowhead Stadium' },
  { n: 88, phase:'round_of_32', slotNumber:16, home:'2º Grupo D',    away:'2º Grupo G',    date:d('2026-07-03','15:00'), stadium:'AT&T Stadium' },

  // ── OITAVAS DE FINAL (Round of 16) ────────────────────────────────────────
  // Slot numbers = R16 slot (1-8)
  { n: 89, phase:'round_of_16', slotNumber:1, home:'Venc. 16av-2',  away:'Venc. 16av-5',  date:d('2026-07-04','18:00'), stadium:'NRG Stadium' },
  { n: 90, phase:'round_of_16', slotNumber:2, home:'Venc. 16av-1',  away:'Venc. 16av-3',  date:d('2026-07-04','14:00'), stadium:'Lincoln Financial Field' },
  { n: 91, phase:'round_of_16', slotNumber:3, home:'Venc. 16av-4',  away:'Venc. 16av-6',  date:d('2026-07-05','17:00'), stadium:'MetLife Stadium' },
  { n: 92, phase:'round_of_16', slotNumber:4, home:'Venc. 16av-7',  away:'Venc. 16av-8',  date:d('2026-07-05','21:00'), stadium:'Estadio Azteca' },
  { n: 93, phase:'round_of_16', slotNumber:5, home:'Venc. 16av-11', away:'Venc. 16av-12', date:d('2026-07-06','16:00'), stadium:'AT&T Stadium' },
  { n: 94, phase:'round_of_16', slotNumber:6, home:'Venc. 16av-9',  away:'Venc. 16av-10', date:d('2026-07-06','21:00'), stadium:'Lumen Field' },
  { n: 95, phase:'round_of_16', slotNumber:7, home:'Venc. 16av-14', away:'Venc. 16av-16', date:d('2026-07-07','13:00'), stadium:'Mercedes-Benz Stadium' },
  { n: 96, phase:'round_of_16', slotNumber:8, home:'Venc. 16av-13', away:'Venc. 16av-15', date:d('2026-07-07','17:00'), stadium:'BC Place' },

  // ── QUARTAS DE FINAL ──────────────────────────────────────────────────────
  { n: 97,  phase:'quarterfinal', slotNumber:1, home:'Venc. Oitavas-1', away:'Venc. Oitavas-2', date:d('2026-07-09','17:00'), stadium:'Gillette Stadium' },
  { n: 98,  phase:'quarterfinal', slotNumber:2, home:'Venc. Oitavas-5', away:'Venc. Oitavas-6', date:d('2026-07-10','16:00'), stadium:'SoFi Stadium' },
  { n: 99,  phase:'quarterfinal', slotNumber:3, home:'Venc. Oitavas-3', away:'Venc. Oitavas-4', date:d('2026-07-11','18:00'), stadium:'Hard Rock Stadium' },
  { n: 100, phase:'quarterfinal', slotNumber:4, home:'Venc. Oitavas-7', away:'Venc. Oitavas-8', date:d('2026-07-11','22:00'), stadium:'Arrowhead Stadium' },

  // ── SEMIFINAIS ────────────────────────────────────────────────────────────
  { n: 101, phase:'semifinal', slotNumber:1, home:'Venc. Quartas-1', away:'Venc. Quartas-2', date:d('2026-07-14','16:00'), stadium:'AT&T Stadium' },
  { n: 102, phase:'semifinal', slotNumber:2, home:'Venc. Quartas-3', away:'Venc. Quartas-4', date:d('2026-07-15','16:00'), stadium:'Mercedes-Benz Stadium' },

  // ── DISPUTA DE 3º LUGAR ───────────────────────────────────────────────────
  { n: 103, phase:'third_place', slotNumber:1, home:'Perd. Semi-1', away:'Perd. Semi-2', date:d('2026-07-18','18:00'), stadium:'Hard Rock Stadium' },

  // ── GRANDE FINAL ──────────────────────────────────────────────────────────
  { n: 104, phase:'final', slotNumber:1, home:'Venc. Semi-1', away:'Venc. Semi-2', date:d('2026-07-19','16:00'), stadium:'MetLife Stadium' },
];

function normalize(s: string): string {
  return s.toLowerCase()
    .normalize('NFD').replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]/g, '');
}

@Injectable()
export class CalendarSeedService {
  private readonly logger = new Logger(CalendarSeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  async seedCalendar(): Promise<{
    groupUpdated: number;
    groupCreated: number;
    knockoutCreated: number;
    knockoutUpdated: number;
    slotsUpserted: number;
  }> {
    const allExtIds = MATCHES.map(m => `wc2026-M${String(m.n).padStart(3, '0')}`);

    // 3 queries up-front instead of 200+ sequential roundtrips
    const [existingByExtId, existingGroupMatches] = await Promise.all([
      this.prisma.cravouMatch.findMany({
        where: { externalId: { in: allExtIds } },
        select: { id: true, externalId: true },
      }),
      this.prisma.cravouMatch.findMany({
        where: { phase: 'group_stage' },
        select: { id: true, homeTeam: true, awayTeam: true },
      }),
    ]);

    const extIdMap = new Map(existingByExtId.map(m => [m.externalId!, m.id]));

    const counters = { groupUpdated: 0, groupCreated: 0, knockoutCreated: 0, knockoutUpdated: 0, slotsUpserted: 0 };

    // Process all 104 matches in parallel
    await Promise.all(MATCHES.map(async m => {
      const exId = `wc2026-M${String(m.n).padStart(3, '0')}`;

      if (m.phase === 'group_stage') {
        const existingId = extIdMap.get(exId);

        if (existingId) {
          await this.prisma.cravouMatch.update({
            where: { id: existingId },
            data: { matchDate: m.date, stadium: m.stadium, groupName: m.group ?? null, groupRound: m.round ?? null },
          });
          counters.groupUpdated++;
        } else {
          // Fuzzy match in-memory (no extra DB roundtrip)
          const homeQ = normalize(m.home).substring(0, 5);
          const awayQ = normalize(m.away).substring(0, 5);
          const byTeams = existingGroupMatches.find(e =>
            normalize(e.homeTeam ?? '').includes(homeQ) && normalize(e.awayTeam ?? '').includes(awayQ),
          );

          if (byTeams) {
            await this.prisma.cravouMatch.update({
              where: { id: byTeams.id },
              data: { externalId: exId, homeTeam: m.home, awayTeam: m.away, matchDate: m.date, stadium: m.stadium, groupName: m.group ?? null, groupRound: m.round ?? null },
            });
            counters.groupUpdated++;
          } else {
            await this.prisma.cravouMatch.create({
              data: { externalId: exId, phase: m.phase, groupName: m.group ?? null, groupRound: m.round ?? null, homeTeam: m.home, awayTeam: m.away, matchDate: m.date, stadium: m.stadium },
            });
            counters.groupCreated++;
          }
        }
      } else {
        const round = m.phase;
        const slotNum = m.slotNumber!;

        // Só cria o slot (estrutura do bracket). Match record criado pelo admin quando os times forem conhecidos.
        await this.prisma.cravouBracketSlot.upsert({
          where: { round_slotNumber: { round, slotNumber: slotNum } },
          create: { round, slotNumber: slotNum, homeDesc: m.home, awayDesc: m.away },
          update: { homeDesc: m.home, awayDesc: m.away },
        });
        counters.slotsUpserted++;
      }
    }));

    this.logger.log(
      `Seed concluído: ${counters.groupUpdated} grupos atualizados, ${counters.groupCreated} grupos criados, ` +
      `${counters.knockoutCreated} knockout criados, ${counters.knockoutUpdated} knockout atualizados, ${counters.slotsUpserted} slots`,
    );

    return counters;
  }
}
