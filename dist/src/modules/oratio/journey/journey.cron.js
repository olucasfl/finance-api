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
exports.JourneyCron = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../../../prisma/prisma.service");
const week_util_1 = require("./utils/week.util");
let JourneyCron = class JourneyCron {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async handleWeeklyJourney() {
        const previousWeek = new Date();
        previousWeek.setDate(previousWeek.getDate() - 7);
        const weekKey = (0, week_util_1.getWeekKey)(previousWeek);
        const progressList = await this.prisma.weeklyJourneyProgress.findMany({
            where: {
                weekKey
            },
            include: {
                member: true
            }
        });
        for (const progress of progressList) {
            if (progress.goalReached &&
                !progress.rewardCollected) {
                const streak = progress.member.currentStreak + 1;
                await this.prisma.journeyMember.update({
                    where: {
                        id: progress.member.id
                    },
                    data: {
                        totalPoints: {
                            increment: 1
                        },
                        currentStreak: streak,
                        bestStreak: streak > progress.member.bestStreak
                            ? streak
                            : progress.member.bestStreak
                    }
                });
                await this.prisma.weeklyJourneyProgress.update({
                    where: {
                        id: progress.id
                    },
                    data: {
                        rewardCollected: true
                    }
                });
            }
            if (!progress.goalReached) {
                await this.prisma.journeyMember.update({
                    where: {
                        id: progress.member.id
                    },
                    data: {
                        currentStreak: 0
                    }
                });
            }
        }
    }
};
exports.JourneyCron = JourneyCron;
__decorate([
    (0, schedule_1.Cron)("0 0 * * 0"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], JourneyCron.prototype, "handleWeeklyJourney", null);
exports.JourneyCron = JourneyCron = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], JourneyCron);
//# sourceMappingURL=journey.cron.js.map