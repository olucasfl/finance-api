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
exports.ConsecrationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const activity_service_1 = require("../activity/activity.service");
const date_fns_tz_1 = require("date-fns-tz");
const date_fns_1 = require("date-fns");
let ConsecrationService = class ConsecrationService {
    prisma;
    activityService;
    constructor(prisma, activityService) {
        this.prisma = prisma;
        this.activityService = activityService;
    }
    getTodayBrazil() {
        const now = (0, date_fns_tz_1.toZonedTime)(new Date(), "America/Sao_Paulo");
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
    toLocalDate(date) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
    }
    diffDays(start, end) {
        const msPerDay = 1000 * 60 * 60 * 24;
        const startTime = this.toLocalDate(start).getTime();
        const endTime = this.toLocalDate(end).getTime();
        return Math.round((endTime - startTime) / msPerDay);
    }
    formatLocalDate(date) {
        const local = new Date(date);
        const y = local.getFullYear();
        const m = String(local.getMonth() + 1).padStart(2, "0");
        const d = String(local.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    }
    async start(userId, startDate) {
        const existing = await this.prisma.consecrationProgress.findFirst({
            where: { userId }
        });
        if (existing) {
            return existing;
        }
        const utcStartDate = this.toLocalDate(startDate);
        const result = await this.prisma.consecrationProgress.create({
            data: {
                userId,
                startDate: utcStartDate
            }
        });
        await this.activityService.log(userId, "CONSECRATION", "Iniciou a consagração");
        return result;
    }
    async progress(userId) {
        const progress = await this.prisma.consecrationProgress.findFirst({
            where: { userId }
        });
        const stages = await this.prisma.consecrationStage.findMany({
            orderBy: { order: "asc" }
        });
        if (!progress) {
            return {
                started: false,
                stages
            };
        }
        const today = this.getTodayBrazil();
        const startRaw = new Date(progress.startDate);
        const start = this.toLocalDate(startRaw);
        const utcToday = this.toLocalDate(today);
        const diff = this.diffDays(start, utcToday) + 1;
        const currentDay = Math.min(diff, 33);
        const startedToday = diff === 1;
        const daysUntilStart = diff < 1 ? Math.abs(diff) + 1 : 0;
        const completedDays = await this.prisma.consecrationCompletedDay.count({
            where: { userId }
        });
        const progressPercent = Math.floor((completedDays / 33) * 100);
        const consecrationDate = new Date(start);
        consecrationDate.setDate(consecrationDate.getDate() + 33);
        const startZoned = (0, date_fns_tz_1.toZonedTime)(progress.startDate, "America/Sao_Paulo");
        const consecrationZoned = (0, date_fns_tz_1.toZonedTime)(consecrationDate, "America/Sao_Paulo");
        return {
            started: true,
            startDate: (0, date_fns_1.format)(startZoned, "yyyy-MM-dd"),
            consecrationDate: (0, date_fns_1.format)(consecrationZoned, "yyyy-MM-dd"),
            currentDay,
            startedToday,
            daysUntilStart,
            completedDays,
            progress: progressPercent,
            stages
        };
    }
    async findDay(dayNumber) {
        const day = await this.prisma.consecrationDay.findFirst({
            where: { dayNumber },
            include: {
                stage: true,
                prayers: {
                    include: {
                        prayer: true
                    },
                    orderBy: {
                        order: 'asc'
                    }
                }
            }
        });
        if (!day) {
            throw new common_1.NotFoundException('Day not found');
        }
        return day;
    }
    async createStage(data) {
        return this.prisma.consecrationStage.create({
            data
        });
    }
    async createDay(data) {
        return this.prisma.consecrationDay.create({
            data
        });
    }
    async createPrayer(data) {
        return this.prisma.prayer.create({
            data
        });
    }
    async addPrayerToDay(data) {
        return this.prisma.dayPrayer.create({
            data
        });
    }
    async updateDayPrayer(id, order) {
        return this.prisma.dayPrayer.update({
            where: { id },
            data: { order }
        });
    }
    async updatePrayer(prayerId, data) {
        const prayer = await this.prisma.prayer.findUnique({
            where: { id: prayerId }
        });
        if (!prayer) {
            throw new common_1.NotFoundException("Prayer not found");
        }
        return this.prisma.prayer.update({
            where: { id: prayerId },
            data
        });
    }
    async getFullConsecration() {
        return this.prisma.consecrationStage.findMany({
            orderBy: { order: 'asc' },
            include: {
                daysContent: {
                    orderBy: { dayNumber: 'asc' },
                    include: {
                        prayers: {
                            orderBy: { order: 'asc' },
                            include: {
                                prayer: true
                            }
                        }
                    }
                }
            }
        });
    }
    async today(userId) {
        const progress = await this.prisma.consecrationProgress.findFirst({
            where: { userId }
        });
        if (!progress) {
            return null;
        }
        const today = this.getTodayBrazil();
        const startRaw = new Date(progress.startDate);
        const start = this.toLocalDate(startRaw);
        const utcToday = this.toLocalDate(today);
        const diff = this.diffDays(start, utcToday) + 1;
        if (diff < 1 || diff > 33) {
            return null;
        }
        return this.findDay(diff);
    }
    async reset(userId) {
        await this.prisma.consecrationCompletedDay.deleteMany({
            where: { userId }
        });
        await this.prisma.consecrationProgress.deleteMany({
            where: { userId }
        });
        return { success: true };
    }
    async completeDay(userId, dayNumber) {
        const progress = await this.prisma.consecrationProgress.findFirst({
            where: { userId }
        });
        if (!progress) {
            throw new Error("Consagração não iniciada");
        }
        const today = this.getTodayBrazil();
        const startRaw = new Date(progress.startDate);
        const start = this.toLocalDate(startRaw);
        const utcToday = this.toLocalDate(today);
        const diff = this.diffDays(start, utcToday) + 1;
        if (dayNumber > diff) {
            throw new Error("Dia ainda não liberado");
        }
        const existing = await this.prisma.consecrationCompletedDay.findFirst({
            where: {
                userId,
                dayNumber
            }
        });
        if (existing) {
            return existing;
        }
        const previous = await this.prisma.consecrationCompletedDay.findFirst({
            where: {
                userId,
                dayNumber: dayNumber - 1
            }
        });
        if (dayNumber !== 1 && !previous) {
            throw new Error("Complete o dia anterior primeiro");
        }
        const result = await this.prisma.consecrationCompletedDay.create({
            data: {
                userId,
                dayNumber
            }
        });
        await this.activityService.log(userId, "CONSECRATION", `Dia ${dayNumber}/33 concluído`);
        return result;
    }
    async updateStartDate(userId, startDate) {
        const progress = await this.prisma.consecrationProgress.findFirst({
            where: { userId }
        });
        if (!progress) {
            throw new common_1.NotFoundException("Consagração não iniciada");
        }
        const utcStartDate = this.toLocalDate(startDate);
        await this.prisma.consecrationProgress.update({
            where: { id: progress.id },
            data: { startDate: utcStartDate }
        });
        await this.prisma.consecrationCompletedDay.deleteMany({
            where: { userId }
        });
        return { success: true };
    }
    async getStageDays(stageId) {
        const days = await this.prisma.consecrationDay.findMany({
            where: { stageId },
            orderBy: { dayNumber: "asc" }
        });
        return days;
    }
    async uncompleteDay(userId, dayNumber) {
        const day = await this.prisma.consecrationCompletedDay.findFirst({
            where: {
                userId,
                dayNumber
            }
        });
        if (!day) {
            throw new common_1.NotFoundException("Dia não está marcado como concluído");
        }
        return this.prisma.consecrationCompletedDay.delete({
            where: { id: day.id }
        });
    }
    async getAllDays() {
        return this.prisma.consecrationDay.findMany({
            include: {
                prayers: {
                    include: {
                        prayer: true
                    }
                },
                stage: true
            },
            orderBy: {
                dayNumber: "asc"
            }
        });
    }
};
exports.ConsecrationService = ConsecrationService;
exports.ConsecrationService = ConsecrationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        activity_service_1.ActivityService])
], ConsecrationService);
//# sourceMappingURL=consecration.service.js.map