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
exports.PrayersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const activity_service_1 = require("../activity/activity.service");
let PrayersService = class PrayersService {
    prisma;
    activityService;
    constructor(prisma, activityService) {
        this.prisma = prisma;
        this.activityService = activityService;
    }
    async createCategory(data) {
        return this.prisma.prayerCategory.create({
            data
        });
    }
    async getCategories() {
        return this.prisma.prayerCategory.findMany({
            orderBy: {
                name: "asc"
            }
        });
    }
    async createPrayer(data) {
        return this.prisma.generalPrayer.create({
            data
        });
    }
    async getPrayersByCategory(slug) {
        const prayers = await this.prisma.generalPrayer.findMany({
            where: {
                category: {
                    slug
                }
            },
            orderBy: {
                title: "asc"
            }
        });
        return prayers;
    }
    async getPrayer(id) {
        const prayer = await this.prisma.generalPrayer.findUnique({
            where: { id }
        });
        if (!prayer) {
            throw new common_1.NotFoundException("Prayer not found");
        }
        return prayer;
    }
    async completePrayer(userId) {
        const now = new Date();
        await this.prisma.spiritualStats.upsert({
            where: { userId },
            update: {
                prayersPrayed: { increment: 1 },
                lastPrayerDate: now
            },
            create: {
                userId,
                prayersPrayed: 1,
                lastPrayerDate: now
            }
        });
        await this.activityService.log(userId, "PRAYER", "Oração rezada");
        return { success: true };
    }
};
exports.PrayersService = PrayersService;
exports.PrayersService = PrayersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        activity_service_1.ActivityService])
], PrayersService);
//# sourceMappingURL=prayers.service.js.map