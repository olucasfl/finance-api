/**
 * Seed Copa do Mundo 2026
 * Run: npm run seed:cravou
 *
 * O que faz:
 *   1. Apaga palpites, partidas, classificações e bracket
 *   2. Zera pontos dos usuários
 *   3. Cria 72 partidas da fase de grupos (datas/horários/estádios corretos em BRT→UTC)
 *   4. Cria 48 registros de classificação por grupo
 *   5. Cria 32 slots do chaveamento eliminatório (vazios, sem times)
 */
import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
dotenv.config()

const prisma = new PrismaClient()

// BRT = UTC-3 → UTC = BRT + 3
function d(dateStr: string, brtTime: string): Date {
  const [h, m] = brtTime.split(':').map(Number)
  const utcH = h + 3
  const base = new Date(`${dateStr}T00:00:00Z`)
  if (utcH >= 24) {
    base.setUTCDate(base.getUTCDate() + 1)
    base.setUTCHours(utcH - 24, m, 0, 0)
  } else {
    base.setUTCHours(utcH, m, 0, 0)
  }
  return base
}

interface M {
  n: number
  group: string
  round: number
  home: string
  away: string
  date: Date
  stadium: string
}

// ── 72 partidas da fase de grupos ──────────────────────────────────────────────
// Fonte: calendário oficial FIFA 2026, horários em BRT (UTC-3)
const MATCHES: M[] = [
  // ── RODADA 1 ─────────────────────────────────────────────────────────────────
  { n:  1, group:'A', round:1, home:'México',             away:'África do Sul',      date:d('2026-06-11','16:00'), stadium:'Estadio Azteca' },
  { n:  2, group:'A', round:1, home:'Coreia do Sul',      away:'Tchéquia',           date:d('2026-06-11','23:00'), stadium:'Estadio Akron' },
  { n:  3, group:'B', round:1, home:'Canadá',             away:'Bósnia-Herzegovina', date:d('2026-06-12','16:00'), stadium:'BMO Field' },
  { n:  4, group:'D', round:1, home:'EUA',                away:'Paraguai',           date:d('2026-06-12','22:00'), stadium:'SoFi Stadium' },
  { n:  5, group:'B', round:1, home:'Catar',              away:'Suíça',              date:d('2026-06-13','16:00'), stadium:"Levi's Stadium" },
  { n:  6, group:'C', round:1, home:'Brasil',             away:'Marrocos',           date:d('2026-06-13','19:00'), stadium:'MetLife Stadium' },
  { n:  7, group:'C', round:1, home:'Haiti',              away:'Escócia',            date:d('2026-06-13','22:00'), stadium:'Gillette Stadium' },
  { n:  8, group:'D', round:1, home:'Austrália',          away:'Turquia',            date:d('2026-06-14','01:00'), stadium:'BC Place' },
  { n:  9, group:'E', round:1, home:'Alemanha',           away:'Curaçao',            date:d('2026-06-14','14:00'), stadium:'NRG Stadium' },
  { n: 10, group:'F', round:1, home:'Holanda',            away:'Japão',              date:d('2026-06-14','17:00'), stadium:'AT&T Stadium' },
  { n: 11, group:'E', round:1, home:'Costa do Marfim',    away:'Equador',            date:d('2026-06-14','20:00'), stadium:'Lincoln Financial Field' },
  { n: 12, group:'F', round:1, home:'Suécia',             away:'Tunísia',            date:d('2026-06-14','23:00'), stadium:'Estadio BBVA' },
  { n: 13, group:'H', round:1, home:'Espanha',            away:'Cabo Verde',         date:d('2026-06-15','13:00'), stadium:'Mercedes-Benz Stadium' },
  { n: 14, group:'G', round:1, home:'Bélgica',            away:'Egito',              date:d('2026-06-15','16:00'), stadium:'Lumen Field' },
  { n: 15, group:'H', round:1, home:'Arábia Saudita',     away:'Uruguai',            date:d('2026-06-15','19:00'), stadium:'Hard Rock Stadium' },
  { n: 16, group:'G', round:1, home:'Irã',                away:'Nova Zelândia',      date:d('2026-06-15','22:00'), stadium:'SoFi Stadium' },
  { n: 17, group:'I', round:1, home:'França',             away:'Senegal',            date:d('2026-06-16','16:00'), stadium:'MetLife Stadium' },
  { n: 18, group:'I', round:1, home:'Iraque',             away:'Noruega',            date:d('2026-06-16','19:00'), stadium:'Gillette Stadium' },
  { n: 19, group:'J', round:1, home:'Argentina',          away:'Argélia',            date:d('2026-06-16','22:00'), stadium:'Arrowhead Stadium' },
  { n: 20, group:'J', round:1, home:'Áustria',            away:'Jordânia',           date:d('2026-06-17','01:00'), stadium:"Levi's Stadium" },
  { n: 21, group:'K', round:1, home:'Portugal',           away:'RD Congo',    date:d('2026-06-17','14:00'), stadium:'NRG Stadium' },
  { n: 22, group:'L', round:1, home:'Inglaterra',         away:'Croácia',            date:d('2026-06-17','17:00'), stadium:'AT&T Stadium' },
  { n: 23, group:'L', round:1, home:'Gana',               away:'Panamá',             date:d('2026-06-17','20:00'), stadium:'BMO Field' },
  { n: 24, group:'K', round:1, home:'Uzbequistão',        away:'Colômbia',           date:d('2026-06-17','23:00'), stadium:'Estadio Azteca' },

  // ── RODADA 2 ─────────────────────────────────────────────────────────────────
  { n: 25, group:'A', round:2, home:'Tchéquia',           away:'África do Sul',      date:d('2026-06-18','13:00'), stadium:'Mercedes-Benz Stadium' },
  { n: 26, group:'B', round:2, home:'Suíça',              away:'Bósnia-Herzegovina', date:d('2026-06-18','16:00'), stadium:'SoFi Stadium' },
  { n: 27, group:'B', round:2, home:'Canadá',             away:'Catar',              date:d('2026-06-18','19:00'), stadium:'BC Place' },
  { n: 28, group:'A', round:2, home:'México',             away:'Coreia do Sul',      date:d('2026-06-18','22:00'), stadium:'Estadio Akron' },
  { n: 29, group:'D', round:2, home:'EUA',                away:'Austrália',          date:d('2026-06-19','16:00'), stadium:'Lumen Field' },
  { n: 30, group:'C', round:2, home:'Escócia',            away:'Marrocos',           date:d('2026-06-19','19:00'), stadium:'Gillette Stadium' },
  { n: 31, group:'C', round:2, home:'Brasil',             away:'Haiti',              date:d('2026-06-19','21:30'), stadium:'Lincoln Financial Field' },
  { n: 32, group:'D', round:2, home:'Turquia',            away:'Paraguai',           date:d('2026-06-20','00:00'), stadium:"Levi's Stadium" },
  { n: 33, group:'F', round:2, home:'Holanda',            away:'Suécia',             date:d('2026-06-20','14:00'), stadium:'NRG Stadium' },
  { n: 34, group:'E', round:2, home:'Alemanha',           away:'Costa do Marfim',    date:d('2026-06-20','17:00'), stadium:'BMO Field' },
  { n: 35, group:'E', round:2, home:'Equador',            away:'Curaçao',            date:d('2026-06-20','21:00'), stadium:'Arrowhead Stadium' },
  { n: 36, group:'F', round:2, home:'Tunísia',            away:'Japão',              date:d('2026-06-21','01:00'), stadium:'Estadio BBVA' },
  { n: 37, group:'H', round:2, home:'Espanha',            away:'Arábia Saudita',     date:d('2026-06-21','13:00'), stadium:'Mercedes-Benz Stadium' },
  { n: 38, group:'G', round:2, home:'Bélgica',            away:'Irã',                date:d('2026-06-21','16:00'), stadium:'SoFi Stadium' },
  { n: 39, group:'H', round:2, home:'Uruguai',            away:'Cabo Verde',         date:d('2026-06-21','19:00'), stadium:'Hard Rock Stadium' },
  { n: 40, group:'G', round:2, home:'Nova Zelândia',      away:'Egito',              date:d('2026-06-21','22:00'), stadium:'BC Place' },
  { n: 41, group:'J', round:2, home:'Argentina',          away:'Áustria',            date:d('2026-06-22','14:00'), stadium:'AT&T Stadium' },
  { n: 42, group:'I', round:2, home:'França',             away:'Iraque',             date:d('2026-06-22','18:00'), stadium:'Lincoln Financial Field' },
  { n: 43, group:'I', round:2, home:'Noruega',            away:'Senegal',            date:d('2026-06-22','21:00'), stadium:'MetLife Stadium' },
  { n: 44, group:'J', round:2, home:'Jordânia',           away:'Argélia',            date:d('2026-06-23','00:00'), stadium:"Levi's Stadium" },
  { n: 45, group:'K', round:2, home:'Portugal',           away:'Uzbequistão',        date:d('2026-06-23','14:00'), stadium:'NRG Stadium' },
  { n: 46, group:'L', round:2, home:'Inglaterra',         away:'Gana',               date:d('2026-06-23','17:00'), stadium:'Gillette Stadium' },
  { n: 47, group:'L', round:2, home:'Panamá',             away:'Croácia',            date:d('2026-06-23','20:00'), stadium:'BMO Field' },
  { n: 48, group:'K', round:2, home:'Colômbia',           away:'RD Congo',    date:d('2026-06-23','23:00'), stadium:'Estadio Akron' },

  // ── RODADA 3 (simultâneas por grupo) ─────────────────────────────────────────
  { n: 49, group:'B', round:3, home:'Suíça',              away:'Canadá',             date:d('2026-06-24','16:00'), stadium:'BC Place' },
  { n: 50, group:'B', round:3, home:'Bósnia-Herzegovina', away:'Catar',              date:d('2026-06-24','16:00'), stadium:'Lumen Field' },
  { n: 51, group:'C', round:3, home:'Escócia',            away:'Brasil',             date:d('2026-06-24','19:00'), stadium:'Hard Rock Stadium' },
  { n: 52, group:'C', round:3, home:'Marrocos',           away:'Haiti',              date:d('2026-06-24','19:00'), stadium:'Mercedes-Benz Stadium' },
  { n: 53, group:'A', round:3, home:'Tchéquia',           away:'México',             date:d('2026-06-24','22:00'), stadium:'Estadio Azteca' },
  { n: 54, group:'A', round:3, home:'África do Sul',      away:'Coreia do Sul',      date:d('2026-06-24','22:00'), stadium:'Estadio BBVA' },
  { n: 55, group:'E', round:3, home:'Curaçao',            away:'Costa do Marfim',    date:d('2026-06-25','17:00'), stadium:'Lincoln Financial Field' },
  { n: 56, group:'E', round:3, home:'Equador',            away:'Alemanha',           date:d('2026-06-25','17:00'), stadium:'MetLife Stadium' },
  { n: 57, group:'F', round:3, home:'Japão',              away:'Suécia',             date:d('2026-06-25','20:00'), stadium:'AT&T Stadium' },
  { n: 58, group:'F', round:3, home:'Tunísia',            away:'Holanda',            date:d('2026-06-25','20:00'), stadium:'Arrowhead Stadium' },
  { n: 59, group:'D', round:3, home:'Turquia',            away:'EUA',                date:d('2026-06-25','23:00'), stadium:'SoFi Stadium' },
  { n: 60, group:'D', round:3, home:'Paraguai',           away:'Austrália',          date:d('2026-06-25','23:00'), stadium:"Levi's Stadium" },
  { n: 61, group:'I', round:3, home:'Noruega',            away:'França',             date:d('2026-06-26','16:00'), stadium:'Gillette Stadium' },
  { n: 62, group:'I', round:3, home:'Senegal',            away:'Iraque',             date:d('2026-06-26','16:00'), stadium:'BMO Field' },
  { n: 63, group:'H', round:3, home:'Cabo Verde',         away:'Arábia Saudita',     date:d('2026-06-26','21:00'), stadium:'NRG Stadium' },
  { n: 64, group:'H', round:3, home:'Uruguai',            away:'Espanha',            date:d('2026-06-26','21:00'), stadium:'Estadio Akron' },
  { n: 65, group:'G', round:3, home:'Egito',              away:'Irã',                date:d('2026-06-27','00:00'), stadium:'Lumen Field' },
  { n: 66, group:'G', round:3, home:'Nova Zelândia',      away:'Bélgica',            date:d('2026-06-27','00:00'), stadium:'BC Place' },
  { n: 67, group:'L', round:3, home:'Panamá',             away:'Inglaterra',         date:d('2026-06-27','18:00'), stadium:'MetLife Stadium' },
  { n: 68, group:'L', round:3, home:'Croácia',            away:'Gana',               date:d('2026-06-27','18:00'), stadium:'Lincoln Financial Field' },
  { n: 69, group:'K', round:3, home:'Colômbia',           away:'Portugal',           date:d('2026-06-27','20:30'), stadium:'Hard Rock Stadium' },
  { n: 70, group:'K', round:3, home:'RD Congo',    away:'Uzbequistão',        date:d('2026-06-27','20:30'), stadium:'Mercedes-Benz Stadium' },
  { n: 71, group:'J', round:3, home:'Argélia',            away:'Áustria',            date:d('2026-06-27','23:00'), stadium:'Arrowhead Stadium' },
  { n: 72, group:'J', round:3, home:'Jordânia',           away:'Argentina',          date:d('2026-06-27','23:00'), stadium:'AT&T Stadium' },
]

// ── Times por grupo (para standings) ──────────────────────────────────────────
const GROUPS: Record<string, string[]> = {
  A: ['México', 'África do Sul', 'Coreia do Sul', 'Tchéquia'],
  B: ['Canadá', 'Bósnia-Herzegovina', 'Catar', 'Suíça'],
  C: ['Brasil', 'Marrocos', 'Haiti', 'Escócia'],
  D: ['EUA', 'Paraguai', 'Austrália', 'Turquia'],
  E: ['Alemanha', 'Curaçao', 'Costa do Marfim', 'Equador'],
  F: ['Holanda', 'Japão', 'Suécia', 'Tunísia'],
  G: ['Bélgica', 'Egito', 'Irã', 'Nova Zelândia'],
  H: ['Espanha', 'Cabo Verde', 'Arábia Saudita', 'Uruguai'],
  I: ['França', 'Senegal', 'Iraque', 'Noruega'],
  J: ['Argentina', 'Argélia', 'Áustria', 'Jordânia'],
  K: ['Portugal', 'RD Congo', 'Uzbequistão', 'Colômbia'],
  L: ['Inglaterra', 'Croácia', 'Gana', 'Panamá'],
}

// ── Slots do bracket com descrições corretas ───────────────────────────────────
const BRACKET_SLOTS = [
  // Round of 32 (16 avos) — confrontações corretas FIFA 2026
  { round: 'round_of_32', slotNumber:  1, homeDesc: '2º Grupo A',  awayDesc: '2º Grupo B'  },
  { round: 'round_of_32', slotNumber:  2, homeDesc: '1º Grupo E',  awayDesc: 'Melhor 3º'   },
  { round: 'round_of_32', slotNumber:  3, homeDesc: '1º Grupo F',  awayDesc: '2º Grupo C'  },
  { round: 'round_of_32', slotNumber:  4, homeDesc: '1º Grupo C',  awayDesc: '2º Grupo F'  },
  { round: 'round_of_32', slotNumber:  5, homeDesc: '1º Grupo I',  awayDesc: 'Melhor 3º'   },
  { round: 'round_of_32', slotNumber:  6, homeDesc: '2º Grupo E',  awayDesc: '2º Grupo I'  },
  { round: 'round_of_32', slotNumber:  7, homeDesc: '1º Grupo A',  awayDesc: 'Melhor 3º'   },
  { round: 'round_of_32', slotNumber:  8, homeDesc: '1º Grupo L',  awayDesc: 'Melhor 3º'   },
  { round: 'round_of_32', slotNumber:  9, homeDesc: '1º Grupo D',  awayDesc: 'Melhor 3º'   },
  { round: 'round_of_32', slotNumber: 10, homeDesc: '1º Grupo G',  awayDesc: 'Melhor 3º'   },
  { round: 'round_of_32', slotNumber: 11, homeDesc: '2º Grupo K',  awayDesc: '2º Grupo L'  },
  { round: 'round_of_32', slotNumber: 12, homeDesc: '1º Grupo H',  awayDesc: '2º Grupo J'  },
  { round: 'round_of_32', slotNumber: 13, homeDesc: '1º Grupo B',  awayDesc: 'Melhor 3º'   },
  { round: 'round_of_32', slotNumber: 14, homeDesc: '1º Grupo J',  awayDesc: '2º Grupo H'  },
  { round: 'round_of_32', slotNumber: 15, homeDesc: '1º Grupo K',  awayDesc: 'Melhor 3º'   },
  { round: 'round_of_32', slotNumber: 16, homeDesc: '2º Grupo D',  awayDesc: '2º Grupo G'  },
  // Oitavas de Final
  { round: 'round_of_16', slotNumber: 1, homeDesc: 'Venc. 16av-2',  awayDesc: 'Venc. 16av-5'  },
  { round: 'round_of_16', slotNumber: 2, homeDesc: 'Venc. 16av-1',  awayDesc: 'Venc. 16av-3'  },
  { round: 'round_of_16', slotNumber: 3, homeDesc: 'Venc. 16av-4',  awayDesc: 'Venc. 16av-6'  },
  { round: 'round_of_16', slotNumber: 4, homeDesc: 'Venc. 16av-7',  awayDesc: 'Venc. 16av-8'  },
  { round: 'round_of_16', slotNumber: 5, homeDesc: 'Venc. 16av-11', awayDesc: 'Venc. 16av-12' },
  { round: 'round_of_16', slotNumber: 6, homeDesc: 'Venc. 16av-9',  awayDesc: 'Venc. 16av-10' },
  { round: 'round_of_16', slotNumber: 7, homeDesc: 'Venc. 16av-14', awayDesc: 'Venc. 16av-16' },
  { round: 'round_of_16', slotNumber: 8, homeDesc: 'Venc. 16av-13', awayDesc: 'Venc. 16av-15' },
  // Quartas de Final
  { round: 'quarterfinal', slotNumber: 1, homeDesc: 'Venc. Oitavas-1', awayDesc: 'Venc. Oitavas-2' },
  { round: 'quarterfinal', slotNumber: 2, homeDesc: 'Venc. Oitavas-5', awayDesc: 'Venc. Oitavas-6' },
  { round: 'quarterfinal', slotNumber: 3, homeDesc: 'Venc. Oitavas-3', awayDesc: 'Venc. Oitavas-4' },
  { round: 'quarterfinal', slotNumber: 4, homeDesc: 'Venc. Oitavas-7', awayDesc: 'Venc. Oitavas-8' },
  // Semifinais
  { round: 'semifinal', slotNumber: 1, homeDesc: 'Venc. Quartas-1', awayDesc: 'Venc. Quartas-2' },
  { round: 'semifinal', slotNumber: 2, homeDesc: 'Venc. Quartas-3', awayDesc: 'Venc. Quartas-4' },
  // 3º Lugar e Final
  { round: 'third_place', slotNumber: 1, homeDesc: 'Perd. Semi-1', awayDesc: 'Perd. Semi-2' },
  { round: 'final',       slotNumber: 1, homeDesc: 'Venc. Semi-1', awayDesc: 'Venc. Semi-2' },
]

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🗑️  Zerando tabelas...')
  await prisma.cravouPrediction.deleteMany()
  await prisma.cravouBracketSlot.deleteMany()
  await prisma.cravouGroupStanding.deleteMany()
  await prisma.cravouMatch.deleteMany()
  await prisma.user.updateMany({ data: { bolaoPoints: 0, cravadas: 0 } })
  console.log('   ✓ Tabelas limpas e pontos zerados')

  console.log('📊 Criando classificações por grupo...')
  for (const [group, teams] of Object.entries(GROUPS)) {
    for (const teamName of teams) {
      await prisma.cravouGroupStanding.create({
        data: { group, teamName, matchesPlayed: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, position: null, isQualified: false },
      })
    }
  }
  console.log('   ✓ 48 seleções criadas')

  console.log('⚽ Criando 72 partidas da fase de grupos...')
  await prisma.cravouMatch.createMany({
    data: MATCHES.map(m => ({
      externalId: `wc2026-M${String(m.n).padStart(3, '0')}`,
      phase: 'group_stage',
      groupName: m.group,
      groupRound: m.round,
      homeTeam: m.home,
      awayTeam: m.away,
      matchDate: m.date,
      stadium: m.stadium,
      status: 'upcoming',
      predictionsLocked: false,
    })),
  })
  console.log('   ✓ 72 partidas criadas')

  console.log('🏆 Criando 32 slots do chaveamento...')
  await prisma.cravouBracketSlot.createMany({ data: BRACKET_SLOTS })
  console.log('   ✓ 32 slots criados')

  console.log('\n✅ Seed concluído!')
  console.log('   72 partidas | 48 classificações | 32 slots do bracket')
}

main()
  .catch(e => { console.error('❌ Erro:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
