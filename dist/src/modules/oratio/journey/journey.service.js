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
exports.JourneyService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const client_1 = require("@prisma/client");
const week_util_1 = require("./utils/week.util");
let JourneyService = class JourneyService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createJourney(userId, partnerEmail) {
        const partner = await this.prisma.user.findUnique({
            where: {
                email: partnerEmail
            }
        });
        if (!partner) {
            throw new common_1.NotFoundException("Usuário não encontrado");
        }
        if (partner.id === userId) {
            throw new common_1.BadRequestException("Você não pode criar uma jornada consigo mesmo");
        }
        const alreadyInJourney = await this.prisma.journeyMember.findFirst({
            where: {
                OR: [
                    { userId },
                    { userId: partner.id }
                ]
            }
        });
        if (alreadyInJourney) {
            throw new common_1.BadRequestException("Um dos usuários já participa de uma jornada");
        }
        const journey = await this.prisma.prayerJourney.create({
            data: {
                members: {
                    create: [
                        {
                            userId,
                            role: client_1.JourneyRole.OWNER
                        },
                        {
                            userId: partner.id,
                            role: client_1.JourneyRole.MEMBER
                        }
                    ]
                }
            },
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                isAdmin: true
                            }
                        }
                    }
                }
            }
        });
        return journey;
    }
    async getJourney(userId) {
        const member = await this.prisma.journeyMember.findFirst({
            where: {
                userId
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        isAdmin: true
                    }
                },
                journey: {
                    include: {
                        members: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                        isAdmin: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        if (!member) {
            return null;
        }
        const weekKey = (0, week_util_1.getCurrentWeekKey)();
        const members = await Promise.all(member.journey.members.map(async (m) => {
            const progress = await this.prisma.weeklyJourneyProgress.findUnique({
                where: {
                    memberId_weekKey: {
                        memberId: m.id,
                        weekKey
                    }
                }
            });
            return {
                id: m.user.id,
                name: m.user.name,
                email: m.user.email,
                role: m.role,
                totalPoints: m.totalPoints,
                currentStreak: m.currentStreak,
                bestStreak: m.bestStreak,
                rosariesCompleted: progress?.rosariesCompleted || 0,
                goalReached: progress?.goalReached || false
            };
        }));
        const intentsRaw = await this.prisma.journeyPrayerIntent.findMany({
            where: {
                journeyId: member.journeyId,
                weekKey
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        });
        const intents = intentsRaw.map(intent => ({
            id: intent.id,
            text: intent.text,
            createdAt: intent.createdAt,
            canDelete: intent.userId === userId,
            user: {
                id: intent.user.id,
                name: intent.user.name
            }
        }));
        return {
            weekKey,
            goal: 4,
            members,
            intents
        };
    }
    async incrementWeeklyProgress(userId) {
        const member = await this.prisma.journeyMember.findFirst({
            where: {
                userId
            }
        });
        if (!member) {
            throw new Error("MEMBER NÃO ENCONTRADO");
        }
        const weekKey = (0, week_util_1.getCurrentWeekKey)();
        const existing = await this.prisma.weeklyJourneyProgress.findUnique({
            where: {
                memberId_weekKey: {
                    memberId: member.id,
                    weekKey
                }
            }
        });
        if (!existing) {
            await this.prisma.weeklyJourneyProgress.create({
                data: {
                    memberId: member.id,
                    weekKey,
                    rosariesCompleted: 1,
                    goalReached: false
                }
            });
            return;
        }
        const updated = await this.prisma.weeklyJourneyProgress.update({
            where: {
                memberId_weekKey: {
                    memberId: member.id,
                    weekKey
                }
            },
            data: {
                rosariesCompleted: {
                    increment: 1
                }
            }
        });
        if (updated.rosariesCompleted >= 4 &&
            !updated.goalReached) {
            await this.prisma.weeklyJourneyProgress.update({
                where: {
                    id: updated.id
                },
                data: {
                    goalReached: true
                }
            });
        }
    }
    async getHistory(userId) {
        const member = await this.prisma.journeyMember.findFirst({
            where: {
                userId
            }
        });
        if (!member) {
            return [];
        }
        return this.prisma.weeklyJourneyProgress.findMany({
            where: {
                memberId: member.id
            },
            orderBy: {
                createdAt: "desc"
            }
        });
    }
    async deleteJourney(userId) {
        const member = await this.prisma.journeyMember.findFirst({
            where: {
                userId
            }
        });
        if (!member) {
            throw new common_1.NotFoundException("Journey not found");
        }
        await this.prisma.prayerJourney.delete({
            where: {
                id: member.journeyId
            }
        });
        return {
            success: true
        };
    }
    async createIntent(userId, text) {
        const member = await this.prisma.journeyMember.findFirst({
            where: {
                userId
            }
        });
        if (!member) {
            throw new common_1.NotFoundException("Journey not found");
        }
        const weekKey = (0, week_util_1.getCurrentWeekKey)();
        return this.prisma.journeyPrayerIntent.create({
            data: {
                journeyId: member.journeyId,
                userId,
                text,
                weekKey
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });
    }
    async deleteIntent(userId, intentId) {
        const intent = await this.prisma.journeyPrayerIntent.findUnique({
            where: {
                id: intentId
            }
        });
        if (!intent) {
            throw new common_1.NotFoundException("Intent not found");
        }
        if (intent.userId !== userId) {
            throw new common_1.BadRequestException("Você não pode remover essa intenção");
        }
        await this.prisma.journeyPrayerIntent.delete({
            where: {
                id: intentId
            }
        });
        return {
            success: true
        };
    }
};
exports.JourneyService = JourneyService;
exports.JourneyService = JourneyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], JourneyService);
//# sourceMappingURL=journey.service.js.map