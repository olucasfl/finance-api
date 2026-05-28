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
exports.RosaryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const rosaryBuilder_1 = require("./rosaryBuilder");
const activity_service_1 = require("../oratio/activity/activity.service");
const sevenSorrowsBuilder_1 = require("./sevenSorrowsBuilder");
const divineMercyBuilder_1 = require("./divineMercyBuilder");
const sacredHearthBuilder_1 = require("./sacredHearthBuilder");
const StJosephBuilder_1 = require("./StJosephBuilder");
const stMichaelBuilder_1 = require("./stMichaelBuilder");
const stBenedictBuilder_1 = require("./stBenedictBuilder");
const HolySpiritBuilder_1 = require("./HolySpiritBuilder");
const tearsMaryBuilder_1 = require("./tearsMaryBuilder");
const journey_service_1 = require("../oratio/journey/journey.service");
let RosaryService = class RosaryService {
    prisma;
    activityService;
    journeyService;
    constructor(prisma, activityService, journeyService) {
        this.prisma = prisma;
        this.activityService = activityService;
        this.journeyService = journeyService;
    }
    getRosary(type) {
        const defaultRosaries = ["gozosos", "dolorosos", "gloriosos", "luminosos"];
        if (defaultRosaries.includes(type)) {
            return (0, rosaryBuilder_1.buildRosary)(type);
        }
        if (type === "sete-dores") {
            return (0, sevenSorrowsBuilder_1.buildSevenSorrows)();
        }
        if (type === "misericordia") {
            return (0, divineMercyBuilder_1.buildDivineMercy)();
        }
        if (type === "sagrado-coracao") {
            return (0, sacredHearthBuilder_1.buildSacredHeart)();
        }
        if (type === "sao-jose") {
            return (0, StJosephBuilder_1.buildStJoseph)();
        }
        if (type === "sao-miguel") {
            return (0, stMichaelBuilder_1.buildStMichael)();
        }
        if (type === "sao-bento") {
            return (0, stBenedictBuilder_1.buildStBenedict)();
        }
        if (type === "espirito-santo") {
            return (0, HolySpiritBuilder_1.buildHolySpirit)();
        }
        if (type === "coroa-lagrimas") {
            return (0, tearsMaryBuilder_1.buildTearsMary)();
        }
        throw new common_1.NotFoundException("Invalid rosary type");
    }
    async start(userId) {
        const session = await this.prisma.rosarySession.create({
            data: { userId }
        });
        await this.activityService.log(userId, "ROSARY", "Iniciou o terço");
        return session;
    }
    async getSession(userId) {
        return this.prisma.rosarySession.findFirst({
            where: {
                userId,
                completed: false
            }
        });
    }
    async nextStep(userId) {
        const session = await this.getSession(userId);
        if (!session) {
            throw new common_1.NotFoundException("Rosary session not found");
        }
        return this.prisma.rosarySession.update({
            where: { id: session.id },
            data: {
                currentStep: {
                    increment: 1
                }
            }
        });
    }
    async finish(userId) {
        const session = await this.getSession(userId);
        if (!session) {
            throw new common_1.NotFoundException("Rosary session not found");
        }
        const now = new Date();
        await this.prisma.rosarySession.update({
            where: { id: session.id },
            data: {
                completed: true,
                finishedAt: now
            }
        });
        const stats = await this.prisma.spiritualStats.findUnique({
            where: { userId }
        });
        if (!stats) {
            await this.prisma.spiritualStats.create({
                data: {
                    userId,
                    rosariesPrayed: 1,
                    lastPrayerDate: now
                }
            });
        }
        else {
            await this.prisma.spiritualStats.update({
                where: { userId },
                data: {
                    rosariesPrayed: {
                        increment: 1
                    },
                    lastPrayerDate: now
                }
            });
        }
        try {
            await this.journeyService
                .incrementWeeklyProgress(userId);
        }
        catch (error) {
            console.log(error);
        }
        await this.activityService.log(userId, "ROSARY", "Terço concluído");
        return { success: true };
    }
};
exports.RosaryService = RosaryService;
exports.RosaryService = RosaryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        activity_service_1.ActivityService,
        journey_service_1.JourneyService])
], RosaryService);
//# sourceMappingURL=rosary.service.js.map