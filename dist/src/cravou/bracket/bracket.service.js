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
var BracketService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BracketService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const realtime_gateway_1 = require("../realtime/realtime.gateway");
const r32_mapping_data_1 = require("./r32-mapping.data");
const third_place_service_1 = require("./third-place.service");
let BracketService = BracketService_1 = class BracketService {
    prisma;
    thirdPlaceService;
    gateway;
    logger = new common_1.Logger(BracketService_1.name);
    constructor(prisma, thirdPlaceService, gateway) {
        this.prisma = prisma;
        this.thirdPlaceService = thirdPlaceService;
        this.gateway = gateway;
    }
    async mountR32() {
        const thirds = await this.thirdPlaceService.selectBest8();
        const qualifiedThirds = thirds.qualifiers;
        const thirdsAssignment = this.assignThirdsToSlots(qualifiedThirds.map((q) => ({ teamName: q.teamName, group: q.group })));
        const slots = [];
        for (const def of r32_mapping_data_1.R32_SLOT_DEFINITIONS) {
            let homeTeam = null;
            let awayTeam = null;
            if (def.homeSource) {
                const standing = await this.prisma.cravouGroupStanding.findFirst({
                    where: { group: def.homeSource.group, position: def.homeSource.pos },
                });
                homeTeam = standing?.teamName ?? null;
            }
            if (!def.awayIsThird && def.awaySource) {
                const standing = await this.prisma.cravouGroupStanding.findFirst({
                    where: { group: def.awaySource.group, position: def.awaySource.pos },
                });
                awayTeam = standing?.teamName ?? null;
            }
            else if (def.awayIsThird) {
                awayTeam = thirdsAssignment.get(def.slot) ?? null;
            }
            const slot = await this.prisma.cravouBracketSlot.upsert({
                where: { round_slotNumber: { round: 'round_of_32', slotNumber: def.slot } },
                create: {
                    round: 'round_of_32',
                    slotNumber: def.slot,
                    homeDesc: def.homeDesc,
                    awayDesc: def.awayDesc,
                    homeTeam,
                    awayTeam,
                },
                update: { homeTeam, awayTeam },
            });
            slots.push(slot);
        }
        this.logger.log('Round of 32 montado');
        this.gateway.emitBracketUpdated('round_of_32', slots);
        this.gateway.emitThirdsSelected(thirds.qualifiers);
        return { slots, thirds };
    }
    assignThirdsToSlots(thirds) {
        const assignment = new Map();
        const used = new Set();
        const thirdsSlots = r32_mapping_data_1.R32_SLOT_DEFINITIONS.filter((d) => d.awayIsThird);
        for (const slotDef of thirdsSlots) {
            const eligible = thirds.find((t) => slotDef.thirdGroups.includes(t.group) && !used.has(t.teamName));
            if (eligible) {
                assignment.set(slotDef.slot, eligible.teamName);
                used.add(eligible.teamName);
            }
        }
        return assignment;
    }
    async setKnockoutResult(slotId, winnerTeam) {
        const slot = await this.prisma.cravouBracketSlot.findUnique({ where: { id: slotId } });
        if (!slot)
            throw new common_1.NotFoundException('Vaga do chaveamento não encontrada');
        if (slot.homeTeam !== winnerTeam && slot.awayTeam !== winnerTeam) {
            throw new common_1.BadRequestException(`Time "${winnerTeam}" não está nesta vaga (${slot.homeTeam} vs ${slot.awayTeam})`);
        }
        const loserTeam = winnerTeam === slot.homeTeam ? slot.awayTeam : slot.homeTeam;
        const updated = await this.prisma.cravouBracketSlot.update({
            where: { id: slotId },
            data: { winnerTeam, loserTeam },
        });
        await this.propagateWinner(slot.round, slot.slotNumber, winnerTeam);
        if (slot.round === 'semifinal' && loserTeam) {
            await this.propagateLoserToThirdPlace(loserTeam);
        }
        const allSlots = await this.getBracket();
        this.gateway.emitBracketUpdated(slot.round, allSlots);
        return updated;
    }
    async propagateWinner(currentRound, slotNumber, winner) {
        const nextRoundMap = {
            round_of_32: { nextRound: 'round_of_16', bracket: r32_mapping_data_1.R16_BRACKET },
            round_of_16: { nextRound: 'quarterfinal', bracket: r32_mapping_data_1.QF_BRACKET },
            quarterfinal: { nextRound: 'semifinal', bracket: r32_mapping_data_1.SF_BRACKET },
            semifinal: { nextRound: 'final', bracket: r32_mapping_data_1.FINAL_BRACKET },
        };
        const nextConfig = nextRoundMap[currentRound];
        if (!nextConfig)
            return;
        const nextSlotDef = nextConfig.bracket.find((b) => b.homeFromR32 === slotNumber ||
            b.homeFromR16 === slotNumber ||
            b.homeFromQF === slotNumber ||
            b.homeFromSF === slotNumber ||
            b.awayFromR32 === slotNumber ||
            b.awayFromR16 === slotNumber ||
            b.awayFromQF === slotNumber ||
            b.awayFromSF === slotNumber);
        if (!nextSlotDef)
            return;
        const isHome = nextSlotDef.homeFromR32 === slotNumber ||
            nextSlotDef.homeFromR16 === slotNumber ||
            nextSlotDef.homeFromQF === slotNumber ||
            nextSlotDef.homeFromSF === slotNumber;
        const nextSlot = await this.prisma.cravouBracketSlot.findUnique({
            where: { round_slotNumber: { round: nextConfig.nextRound, slotNumber: nextSlotDef.slot } },
        });
        if (!nextSlot) {
            const roundShort = {
                round_of_32: 'R32', round_of_16: 'R16', quarterfinal: 'QF', semifinal: 'SF',
            };
            const tag = roundShort[currentRound] ?? currentRound;
            const homeNum = nextSlotDef.homeFromR32 ?? nextSlotDef.homeFromR16 ?? nextSlotDef.homeFromQF ?? nextSlotDef.homeFromSF;
            const awayNum = nextSlotDef.awayFromR32 ?? nextSlotDef.awayFromR16 ?? nextSlotDef.awayFromQF ?? nextSlotDef.awayFromSF;
            await this.prisma.cravouBracketSlot.create({
                data: {
                    round: nextConfig.nextRound,
                    slotNumber: nextSlotDef.slot,
                    homeDesc: `Vencedor ${tag}-${homeNum}`,
                    awayDesc: `Vencedor ${tag}-${awayNum}`,
                    homeTeam: isHome ? winner : null,
                    awayTeam: !isHome ? winner : null,
                },
            });
        }
        else {
            await this.prisma.cravouBracketSlot.update({
                where: { id: nextSlot.id },
                data: isHome ? { homeTeam: winner } : { awayTeam: winner },
            });
        }
    }
    async propagateLoserToThirdPlace(loserTeam) {
        const thirdSlot = await this.prisma.cravouBracketSlot.findUnique({
            where: { round_slotNumber: { round: 'third_place', slotNumber: 1 } },
        });
        if (!thirdSlot) {
            await this.prisma.cravouBracketSlot.create({
                data: {
                    round: 'third_place',
                    slotNumber: 1,
                    homeDesc: 'Perdedor Semi 1',
                    awayDesc: 'Perdedor Semi 2',
                    homeTeam: loserTeam,
                },
            });
        }
        else {
            await this.prisma.cravouBracketSlot.update({
                where: { id: thirdSlot.id },
                data: thirdSlot.homeTeam ? { awayTeam: loserTeam } : { homeTeam: loserTeam },
            });
        }
    }
    async overrideSlotTeams(slotId, data) {
        const slot = await this.prisma.cravouBracketSlot.findUnique({ where: { id: slotId } });
        if (!slot)
            throw new common_1.NotFoundException('Vaga não encontrada');
        const updated = await this.prisma.cravouBracketSlot.update({
            where: { id: slotId },
            data: {
                ...(data.homeTeam !== undefined ? { homeTeam: data.homeTeam || null } : {}),
                ...(data.awayTeam !== undefined ? { awayTeam: data.awayTeam || null } : {}),
            },
        });
        if (slot.matchId) {
            const matchUpdate = {};
            if (data.homeTeam !== undefined && data.homeTeam)
                matchUpdate.homeTeam = data.homeTeam;
            if (data.awayTeam !== undefined && data.awayTeam)
                matchUpdate.awayTeam = data.awayTeam;
            if (Object.keys(matchUpdate).length > 0) {
                await this.prisma.cravouMatch.update({ where: { id: slot.matchId }, data: matchUpdate });
            }
        }
        this.gateway.emitBracketUpdated(slot.round, [updated]);
        return updated;
    }
    async refreshR32TeamsFromStandings() {
        for (const def of r32_mapping_data_1.R32_SLOT_DEFINITIONS) {
            const existingSlot = await this.prisma.cravouBracketSlot.findUnique({
                where: { round_slotNumber: { round: 'round_of_32', slotNumber: def.slot } },
            });
            if (!existingSlot)
                continue;
            const updateData = {};
            if (def.homeSource) {
                const standing = await this.prisma.cravouGroupStanding.findFirst({
                    where: { group: def.homeSource.group, position: def.homeSource.pos },
                });
                if (standing?.teamName)
                    updateData.homeTeam = standing.teamName;
            }
            if (!def.awayIsThird && def.awaySource) {
                const standing = await this.prisma.cravouGroupStanding.findFirst({
                    where: { group: def.awaySource.group, position: def.awaySource.pos },
                });
                if (standing?.teamName)
                    updateData.awayTeam = standing.teamName;
            }
            if (Object.keys(updateData).length > 0) {
                await this.prisma.cravouBracketSlot.update({ where: { id: existingSlot.id }, data: updateData });
            }
        }
        const allSlots = await this.getBracket();
        this.gateway.emitBracketUpdated('round_of_32', allSlots);
        this.logger.log('R32: times sincronizados com as standings');
    }
    async resetKnockoutResult(slotId) {
        const slot = await this.prisma.cravouBracketSlot.findUnique({ where: { id: slotId } });
        if (!slot)
            throw new common_1.NotFoundException('Vaga não encontrada');
        const updated = await this.prisma.cravouBracketSlot.update({
            where: { id: slotId },
            data: { winnerTeam: null, loserTeam: null },
        });
        const allSlots = await this.getBracket();
        this.gateway.emitBracketUpdated(slot.round, allSlots);
        return updated;
    }
    async createMatchFromSlot(slotId, matchDate) {
        const slot = await this.prisma.cravouBracketSlot.findUnique({ where: { id: slotId } });
        if (!slot)
            throw new common_1.NotFoundException('Vaga não encontrada');
        if (!slot.homeTeam || !slot.awayTeam) {
            throw new common_1.BadRequestException('Defina os dois times antes de criar o jogo');
        }
        const externalId = `bracket-${slot.round}-slot${slot.slotNumber}`;
        const match = await this.prisma.cravouMatch.upsert({
            where: { externalId },
            create: {
                externalId,
                phase: slot.round,
                homeTeam: slot.homeTeam,
                awayTeam: slot.awayTeam,
                matchDate: new Date(matchDate),
                status: 'upcoming',
            },
            update: {
                homeTeam: slot.homeTeam,
                awayTeam: slot.awayTeam,
                matchDate: new Date(matchDate),
            },
        });
        const updatedSlot = await this.prisma.cravouBracketSlot.update({
            where: { id: slotId },
            data: { matchId: match.id },
        });
        const allSlots = await this.getBracket();
        this.gateway.emitBracketUpdated(slot.round, allSlots);
        return { match, slot: updatedSlot };
    }
    async initializeAllSlots() {
        const ROUNDS = [
            { round: 'round_of_32', count: 16 },
            { round: 'round_of_16', count: 8 },
            { round: 'quarterfinal', count: 4 },
            { round: 'semifinal', count: 2 },
            { round: 'third_place', count: 1 },
            { round: 'final', count: 1 },
        ];
        let created = 0;
        let existing = 0;
        for (const { round, count } of ROUNDS) {
            for (let i = 1; i <= count; i++) {
                const exists = await this.prisma.cravouBracketSlot.findUnique({
                    where: { round_slotNumber: { round, slotNumber: i } },
                });
                if (!exists) {
                    await this.prisma.cravouBracketSlot.create({
                        data: { round, slotNumber: i, homeDesc: 'A definir', awayDesc: 'A definir' },
                    });
                    created++;
                }
                else {
                    existing++;
                }
            }
        }
        const allSlots = await this.getBracket();
        this.gateway.emitBracketUpdated('all', allSlots);
        this.logger.log(`Slots inicializados: ${created} criados, ${existing} já existiam`);
        return { created, existing };
    }
    async getBracket() {
        return this.prisma.cravouBracketSlot.findMany({
            orderBy: [{ round: 'asc' }, { slotNumber: 'asc' }],
        });
    }
    async getBracketByRound(round) {
        return this.prisma.cravouBracketSlot.findMany({
            where: { round },
            orderBy: { slotNumber: 'asc' },
        });
    }
};
exports.BracketService = BracketService;
exports.BracketService = BracketService = BracketService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        third_place_service_1.ThirdPlaceService,
        realtime_gateway_1.RealtimeGateway])
], BracketService);
//# sourceMappingURL=bracket.service.js.map