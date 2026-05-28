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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const bcrypt = __importStar(require("bcrypt"));
const crypto_1 = require("crypto");
const mail_service_1 = require("../mail/mail.service");
const app_type_enum_1 = require("../../enums/app-type.enum");
let UsersService = class UsersService {
    prisma;
    mailService;
    constructor(prisma, mailService) {
        this.prisma = prisma;
        this.mailService = mailService;
    }
    async create(data, app) {
        if (data.password !== data.confirmPassword) {
            throw new common_1.ConflictException('Passwords do not match');
        }
        const emailExists = await this.prisma.user.findUnique({
            where: { email: data.email },
        });
        if (emailExists) {
            throw new common_1.ConflictException('Email already registered');
        }
        const hashedPassword = await bcrypt.hash(data.password, 10);
        const token = (0, crypto_1.randomBytes)(32).toString('hex');
        const isCravou = app === 'cravou';
        const user = await this.prisma.user.create({
            data: {
                name: data.name,
                email: data.email,
                password: hashedPassword,
                emailVerified: isCravou,
                emailVerificationToken: isCravou ? null : token,
            },
        });
        if (!isCravou) {
            if (app === app_type_enum_1.AppType.ORATIO) {
                await this.mailService.sendOratioVerificationEmail(user.email, token);
            }
            else {
                await this.mailService.sendVerificationEmail(user.email, token);
            }
        }
        const { password, refreshToken, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
    async getProfile(userId) {
        const [user, pointsAgg, cravasCount] = await Promise.all([
            this.prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    createdAt: true,
                    emailVerified: true,
                    isAdmin: true,
                    spiritualStats: true,
                    consecrations: true,
                    completedConsecrationDays: { select: { id: true } },
                },
            }),
            this.prisma.cravouPrediction.aggregate({
                where: { userId, points: { not: null } },
                _sum: { points: true },
            }),
            this.prisma.cravouPrediction.count({
                where: { userId, points: { in: [10, 15] } },
            }),
        ]);
        if (!user) {
            throw new common_1.NotFoundException("User not found");
        }
        const bolaoPoints = pointsAgg._sum.points ?? 0;
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt,
            emailVerified: user.emailVerified,
            isAdmin: user.isAdmin,
            bolaoPoints,
            cravadas: cravasCount,
            spiritualProgress: {
                consecrationStarted: user.consecrations.length > 0,
                daysCompleted: user.completedConsecrationDays.length,
                prayersPrayed: user.spiritualStats?.prayersPrayed || 0,
                rosariesPrayed: user.spiritualStats?.rosariesPrayed || 0,
                lastPrayerDate: user.spiritualStats?.lastPrayerDate || null,
                prayerStreak: user.spiritualStats?.prayerStreak || 0
            }
        };
    }
    async updateProfile(userId, name) {
        const user = await this.prisma.user.update({
            where: { id: userId },
            data: { name },
        });
        const { password, refreshToken, ...safeUser } = user;
        return safeUser;
    }
    async deleteAccount(userId) {
        await this.prisma.user.delete({
            where: { id: userId },
        });
        return {
            message: 'Account deleted successfully',
        };
    }
    async assertAdmin(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { isAdmin: true },
        });
        if (!user?.isAdmin) {
            throw new common_1.ForbiddenException('Admin access required');
        }
    }
    async getAllUsers(userId, filters) {
        await this.assertAdmin(userId);
        const where = {};
        if (filters?.search) {
            where.OR = [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { email: { contains: filters.search, mode: 'insensitive' } },
            ];
        }
        if (filters?.isAdmin !== undefined) {
            where.isAdmin = filters.isAdmin;
        }
        if (filters?.emailVerified !== undefined) {
            where.emailVerified = filters.emailVerified;
        }
        if (filters?.activeLastDays) {
            const daysAgo = new Date();
            daysAgo.setDate(daysAgo.getDate() - filters.activeLastDays);
            where.AND = [
                ...(where.AND || []),
                {
                    OR: [
                        {
                            spiritualStats: {
                                lastPrayerDate: {
                                    gte: daysAgo,
                                },
                            },
                        },
                        {
                            activities: {
                                some: {
                                    createdAt: {
                                        gte: daysAgo,
                                    },
                                },
                            },
                        },
                    ],
                },
            ];
        }
        return this.prisma.user.findMany({
            where,
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
                emailVerified: true,
                isAdmin: true,
                spiritualStats: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }
    async getUserDetail(userId, targetUserId) {
        await this.assertAdmin(userId);
        const user = await this.prisma.user.findUnique({
            where: { id: targetUserId },
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
                emailVerified: true,
                isAdmin: true,
                spiritualStats: {
                    select: {
                        prayersPrayed: true,
                        rosariesPrayed: true,
                        prayerStreak: true,
                        lastPrayerDate: true,
                    },
                },
                consecrations: true,
                completedConsecrationDays: true,
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return {
            ...user,
            consecration: {
                started: user.consecrations.length > 0,
                daysCompleted: user.completedConsecrationDays.length,
            },
            consecrations: undefined,
            completedConsecrationDays: undefined,
        };
    }
    async deleteUserAdmin(userId, targetUserId) {
        await this.assertAdmin(userId);
        if (userId === targetUserId) {
            throw new common_1.ForbiddenException('Cannot delete your own account');
        }
        await this.prisma.user.delete({
            where: { id: targetUserId },
        });
        return { message: 'User deleted successfully' };
    }
    async getUserActivity(userId, targetUserId) {
        await this.assertAdmin(userId);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const activities = await this.prisma.userActivity.findMany({
            where: {
                userId: targetUserId,
                createdAt: {
                    gte: sevenDaysAgo,
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        return {
            targetUserId,
            activities: activities.map((a) => ({
                type: a.type,
                action: a.action,
                timestamp: a.createdAt,
            })),
            total: activities.length,
        };
    }
    async getAdminStats(userId) {
        await this.assertAdmin(userId);
        const totalUsers = await this.prisma.user.count();
        const totalVerified = await this.prisma.user.count({
            where: { emailVerified: true },
        });
        const consecrationStarted = await this.prisma.consecrationProgress.count();
        const totalPrayers = await this.prisma.spiritualStats.aggregate({
            _sum: { prayersPrayed: true, rosariesPrayed: true },
        });
        return {
            totalUsers,
            totalVerified,
            consecrationStarted,
            prayersPrayed: totalPrayers._sum.prayersPrayed || 0,
            rosariesPrayed: totalPrayers._sum.rosariesPrayed || 0,
        };
    }
    async setAdminStatus(userId, targetUserId, isAdmin, adminPassword) {
        await this.assertAdmin(userId);
        if (adminPassword !== process.env.ADMIN_PASSWORD) {
            throw new common_1.ForbiddenException("Senha de admin inválida");
        }
        if (userId === targetUserId && isAdmin === false) {
            throw new common_1.ForbiddenException("Você não pode remover seu próprio admin");
        }
        return this.prisma.user.update({
            where: { id: targetUserId },
            data: { isAdmin },
            select: { id: true, isAdmin: true },
        });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        mail_service_1.MailService])
], UsersService);
//# sourceMappingURL=users.service.js.map