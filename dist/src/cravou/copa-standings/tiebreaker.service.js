"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TiebreakerService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let TiebreakerService = class TiebreakerService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async sort(teams) {
        if (teams.length <= 1) {
            return teams.map((t, i) => ({ ...t, position: i + 1 }));
        }
        const sorted = [...teams].sort((a, b) => {
            if (b.points !== a.points)
                return b.points - a.points;
            if (b.goalDifference !== a.goalDifference)
                return b.goalDifference - a.goalDifference;
            return b.goalsFor - a.goalsFor;
        });
        const result = [];
        let positionCounter = 1;
        let i = 0;
        while (i < sorted.length) {
            const tiedGroup = [sorted[i]];
            let j = i + 1;
            while (j < sorted.length &&
                sorted[j].points === sorted[i].points &&
                sorted[j].goalDifference === sorted[i].goalDifference &&
                sorted[j].goalsFor === sorted[i].goalsFor) {
                tiedGroup.push(sorted[j]);
                j++;
            }
            if (tiedGroup.length === 1) {
                result.push({ ...tiedGroup[0], position: positionCounter });
                positionCounter++;
            }
            else {
                const resolved = await this.resolveByHeadToHead(tiedGroup, positionCounter);
                result.push(...resolved);
                positionCounter += tiedGroup.length;
            }
            i = j;
        }
        return result;
    }
    async resolveByHeadToHead(teams, startPosition) {
        const group = teams[0].group;
        const teamNames = teams.map((t) => t.teamName);
        const matches = await this.prisma.cravouMatch.findMany({
            where: {
                groupName: group,
                status: 'finished',
                homeTeam: { in: teamNames },
                awayTeam: { in: teamNames },
            },
        });
        const expectedMatches = (teamNames.length * (teamNames.length - 1)) / 2;
        if (matches.length < expectedMatches) {
            return teams.map((t) => ({ ...t, position: null }));
        }
        const h2h = new Map();
        for (const name of teamNames)
            h2h.set(name, { points: 0, gd: 0, gf: 0 });
        for (const m of matches) {
            if (m.homeScore === null || m.awayScore === null)
                continue;
            const home = h2h.get(m.homeTeam);
            const away = h2h.get(m.awayTeam);
            home.gf += m.homeScore;
            home.gd += m.homeScore - m.awayScore;
            away.gf += m.awayScore;
            away.gd += m.awayScore - m.homeScore;
            if (m.homeScore > m.awayScore) {
                home.points += 3;
            }
            else if (m.homeScore === m.awayScore) {
                home.points += 1;
                away.points += 1;
            }
            else {
                away.points += 3;
            }
        }
        const sortedByH2H = [...teams].sort((a, b) => {
            const ha = h2h.get(a.teamName);
            const hb = h2h.get(b.teamName);
            if (hb.points !== ha.points)
                return hb.points - ha.points;
            if (hb.gd !== ha.gd)
                return hb.gd - ha.gd;
            if (hb.gf !== ha.gf)
                return hb.gf - ha.gf;
            return 0;
        });
        const stillTied = sortedByH2H.some((t, idx) => {
            if (idx === 0)
                return false;
            const prev = sortedByH2H[idx - 1];
            const hp = h2h.get(t.teamName);
            const hprev = h2h.get(prev.teamName);
            return hp.points === hprev.points && hp.gd === hprev.gd && hp.gf === hprev.gf;
        });
        if (stillTied) {
            return sortedByH2H.map((t) => ({ ...t, position: null }));
        }
        return sortedByH2H.map((t, idx) => ({ ...t, position: startPosition + idx }));
    }
};
exports.TiebreakerService = TiebreakerService;
exports.TiebreakerService = TiebreakerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TiebreakerService);
//# sourceMappingURL=tiebreaker.service.js.map