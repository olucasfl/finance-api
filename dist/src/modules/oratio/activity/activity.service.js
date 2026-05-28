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
exports.ActivityService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
let ActivityService = class ActivityService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    getBrazilDateString(date = new Date()) {
        return date.toLocaleDateString("en-CA", {
            timeZone: "America/Sao_Paulo"
        });
    }
    async updateLoginStreak(userId) {
        const today = this.getBrazilDateString();
        const stats = await this.prisma.spiritualStats.findUnique({
            where: { userId }
        });
        let newStreak = 1;
        if (stats) {
            const currentStreak = stats.prayerStreak || 0;
            if (stats.lastLoginDate) {
                const last = this.getBrazilDateString(new Date(stats.lastLoginDate));
                const diff = Math.floor((new Date(today).getTime() - new Date(last).getTime()) /
                    (1000 * 60 * 60 * 24));
                if (diff === 1) {
                    newStreak = currentStreak + 1;
                }
                else if (diff === 0) {
                    return;
                }
                else {
                    newStreak = 1;
                }
            }
        }
        await this.prisma.spiritualStats.upsert({
            where: { userId },
            update: {
                prayerStreak: newStreak,
                lastLoginDate: new Date()
            },
            create: {
                userId,
                prayerStreak: 1,
                lastLoginDate: new Date()
            }
        });
    }
    async log(userId, type, action) {
        const result = await this.prisma.userActivity.create({
            data: {
                userId,
                type,
                action,
            },
        });
        if (type === "LOGIN") {
            await this.updateLoginStreak(userId);
        }
        return result;
    }
};
exports.ActivityService = ActivityService;
exports.ActivityService = ActivityService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ActivityService);
//# sourceMappingURL=activity.service.js.map