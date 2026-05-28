"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const prisma = new client_1.PrismaClient();
const GRUPOS = {
    A: ['México', 'África do Sul', 'Coreia do Sul', 'República Tcheca'],
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
};
const CALENDARIO = {
    A: [
        { m1: '2026-06-11T16:00:00Z', m2: '2026-06-11T19:00:00Z' },
        { m1: '2026-06-17T16:00:00Z', m2: '2026-06-17T19:00:00Z' },
        { m1: '2026-06-23T22:00:00Z', m2: '2026-06-23T22:00:00Z' },
    ],
    B: [
        { m1: '2026-06-11T22:00:00Z', m2: '2026-06-12T01:00:00Z' },
        { m1: '2026-06-17T22:00:00Z', m2: '2026-06-18T01:00:00Z' },
        { m1: '2026-06-24T01:00:00Z', m2: '2026-06-24T01:00:00Z' },
    ],
    C: [
        { m1: '2026-06-12T16:00:00Z', m2: '2026-06-12T19:00:00Z' },
        { m1: '2026-06-18T16:00:00Z', m2: '2026-06-18T19:00:00Z' },
        { m1: '2026-06-24T22:00:00Z', m2: '2026-06-24T22:00:00Z' },
    ],
    D: [
        { m1: '2026-06-12T22:00:00Z', m2: '2026-06-13T01:00:00Z' },
        { m1: '2026-06-18T22:00:00Z', m2: '2026-06-19T01:00:00Z' },
        { m1: '2026-06-25T01:00:00Z', m2: '2026-06-25T01:00:00Z' },
    ],
    E: [
        { m1: '2026-06-13T16:00:00Z', m2: '2026-06-13T19:00:00Z' },
        { m1: '2026-06-19T16:00:00Z', m2: '2026-06-19T19:00:00Z' },
        { m1: '2026-06-25T22:00:00Z', m2: '2026-06-25T22:00:00Z' },
    ],
    F: [
        { m1: '2026-06-13T22:00:00Z', m2: '2026-06-14T01:00:00Z' },
        { m1: '2026-06-19T22:00:00Z', m2: '2026-06-20T01:00:00Z' },
        { m1: '2026-06-26T01:00:00Z', m2: '2026-06-26T01:00:00Z' },
    ],
    G: [
        { m1: '2026-06-14T16:00:00Z', m2: '2026-06-14T19:00:00Z' },
        { m1: '2026-06-20T16:00:00Z', m2: '2026-06-20T19:00:00Z' },
        { m1: '2026-06-26T22:00:00Z', m2: '2026-06-26T22:00:00Z' },
    ],
    H: [
        { m1: '2026-06-14T22:00:00Z', m2: '2026-06-15T01:00:00Z' },
        { m1: '2026-06-20T22:00:00Z', m2: '2026-06-21T01:00:00Z' },
        { m1: '2026-06-27T01:00:00Z', m2: '2026-06-27T01:00:00Z' },
    ],
    I: [
        { m1: '2026-06-15T16:00:00Z', m2: '2026-06-15T19:00:00Z' },
        { m1: '2026-06-21T16:00:00Z', m2: '2026-06-21T19:00:00Z' },
        { m1: '2026-06-27T22:00:00Z', m2: '2026-06-27T22:00:00Z' },
    ],
    J: [
        { m1: '2026-06-15T22:00:00Z', m2: '2026-06-16T01:00:00Z' },
        { m1: '2026-06-21T22:00:00Z', m2: '2026-06-22T01:00:00Z' },
        { m1: '2026-06-28T01:00:00Z', m2: '2026-06-28T01:00:00Z' },
    ],
    K: [
        { m1: '2026-06-16T16:00:00Z', m2: '2026-06-16T19:00:00Z' },
        { m1: '2026-06-22T16:00:00Z', m2: '2026-06-22T19:00:00Z' },
        { m1: '2026-06-28T22:00:00Z', m2: '2026-06-28T22:00:00Z' },
    ],
    L: [
        { m1: '2026-06-16T22:00:00Z', m2: '2026-06-17T01:00:00Z' },
        { m1: '2026-06-22T22:00:00Z', m2: '2026-06-23T01:00:00Z' },
        { m1: '2026-06-29T01:00:00Z', m2: '2026-06-29T01:00:00Z' },
    ],
};
async function main() {
    console.log('🔄 Iniciando seed Copa 2026...');
    console.log('🗑️  Limpando dados anteriores...');
    await prisma.cravouPrediction.deleteMany();
    await prisma.cravouMatch.deleteMany();
    await prisma.cravouGroupStanding.deleteMany();
    await prisma.cravouBracketSlot.deleteMany();
    await prisma.user.updateMany({ data: { bolaoPoints: 0, cravadas: 0 } });
    console.log('✅ Dados anteriores removidos');
    console.log('📊 Criando tabela de classificação...');
    for (const [grupo, times] of Object.entries(GRUPOS)) {
        for (const time of times) {
            await prisma.cravouGroupStanding.create({
                data: {
                    group: grupo,
                    teamName: time,
                    matchesPlayed: 0,
                    wins: 0,
                    draws: 0,
                    losses: 0,
                    goalsFor: 0,
                    goalsAgainst: 0,
                    goalDifference: 0,
                    points: 0,
                    position: null,
                    isQualified: false,
                },
            });
        }
    }
    console.log('✅ 48 seleções na tabela');
    console.log('⚽ Criando partidas...');
    let total = 0;
    for (const [grupo, times] of Object.entries(GRUPOS)) {
        const [t1, t2, t3, t4] = times;
        const cal = CALENDARIO[grupo];
        const partidas = [
            { round: 1, home: t1, away: t2, date: cal[0].m1 },
            { round: 1, home: t3, away: t4, date: cal[0].m2 },
            { round: 2, home: t1, away: t3, date: cal[1].m1 },
            { round: 2, home: t2, away: t4, date: cal[1].m2 },
            { round: 3, home: t1, away: t4, date: cal[2].m1 },
            { round: 3, home: t2, away: t3, date: cal[2].m2 },
        ];
        for (let i = 0; i < partidas.length; i++) {
            const p = partidas[i];
            const matchIdx = i + 1;
            const externalId = `group-${grupo}-r${p.round}-m${matchIdx}`;
            await prisma.cravouMatch.upsert({
                where: { externalId },
                create: {
                    externalId,
                    phase: 'group_stage',
                    groupName: grupo,
                    groupRound: p.round,
                    homeTeam: p.home,
                    awayTeam: p.away,
                    matchDate: new Date(p.date),
                    status: 'upcoming',
                    predictionsLocked: false,
                },
                update: {
                    homeTeam: p.home,
                    awayTeam: p.away,
                    matchDate: new Date(p.date),
                    status: 'upcoming',
                    predictionsLocked: false,
                    homeScore: null,
                    awayScore: null,
                    penaltyWinner: null,
                },
            });
            total++;
        }
    }
    console.log(`✅ ${total} partidas criadas (12 grupos × 6 jogos)`);
    console.log('🏆 Criando slots do chaveamento...');
    const ROUNDS = [
        { round: 'round_of_32', count: 16 },
        { round: 'round_of_16', count: 8 },
        { round: 'quarterfinal', count: 4 },
        { round: 'semifinal', count: 2 },
        { round: 'third_place', count: 1 },
        { round: 'final', count: 1 },
    ];
    let slots = 0;
    for (const { round, count } of ROUNDS) {
        for (let i = 1; i <= count; i++) {
            await prisma.cravouBracketSlot.create({
                data: { round, slotNumber: i, homeDesc: 'A definir', awayDesc: 'A definir' },
            });
            slots++;
        }
    }
    console.log(`✅ ${slots} slots do chaveamento criados`);
    console.log('🏆 Seed concluído!');
}
main()
    .catch(e => { console.error('❌ Erro no seed:', e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
//# sourceMappingURL=seed-cravou.js.map