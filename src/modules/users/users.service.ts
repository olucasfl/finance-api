import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { MailService } from '../mail/mail.service';
import { AppType } from 'src/enums/app-type.enum';

@Injectable()
export class UsersService {

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  /*
  =============================
  CREATE USER
  =============================
  */

  async create(data: CreateUserDto, app?: string) {

    if (data.password !== data.confirmPassword) {
      throw new ConflictException('Passwords do not match');
    }

    const emailExists = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (emailExists) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const token = randomBytes(32).toString('hex');

    const user = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        emailVerificationToken: token,
      },
    });

    if (app === AppType.ORATIO) {

      await this.mailService.sendOratioVerificationEmail(
        user.email,
        token
      );

    } else {

      await this.mailService.sendVerificationEmail(
        user.email,
        token
      );

    }

    const { password, refreshToken, ...userWithoutPassword } = user;

    return userWithoutPassword;
  }

  /*
  =============================
  GET USER PROFILE
  =============================
  */

  async getProfile(userId: string) {

  const user = await this.prisma.user.findUnique({

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
    completedConsecrationDays: {
      select: { id: true }
    }
    }

  })

  if (!user) {
    throw new NotFoundException("User not found")
  }

  return {

    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    emailVerified: user.emailVerified,
    isAdmin: user.isAdmin,

    spiritualProgress: {

    consecrationStarted: user.consecrations.length > 0,

    daysCompleted: user.completedConsecrationDays.length,

    prayersPrayed: user.spiritualStats?.prayersPrayed || 0,

    rosariesPrayed: user.spiritualStats?.rosariesPrayed || 0,

    lastPrayerDate: user.spiritualStats?.lastPrayerDate || null,

    prayerStreak: user.spiritualStats?.prayerStreak || 0

    }

  }

  }

  /*
  =============================
  UPDATE NAME
  =============================
  */

  async updateProfile(userId: string, name: string) {

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { name },
    });

    const { password, refreshToken, ...safeUser } = user;

    return safeUser;
  }

  /*
  =============================
  DELETE ACCOUNT
  =============================
  */

  async deleteAccount(userId: string) {

    await this.prisma.user.delete({
      where: { id: userId },
    });

    return {
      message: 'Account deleted successfully',
    };
  }

  async assertAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });

    if (!user?.isAdmin) {
      throw new ForbiddenException('Admin access required');
    }
  }

  async getAllUsers(userId: string, filters?: { search?: string; isAdmin?: boolean; emailVerified?: boolean; activeLastDays?: number }) {
    await this.assertAdmin(userId);

    const where: any = {};

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

  async getUserDetail(userId: string, targetUserId: string) {
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
      throw new NotFoundException('User not found');
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

  async deleteUserAdmin(userId: string, targetUserId: string) {
    await this.assertAdmin(userId);

    if (userId === targetUserId) {
      throw new ForbiddenException('Cannot delete your own account');
    }

    await this.prisma.user.delete({
      where: { id: targetUserId },
    });

    return { message: 'User deleted successfully' };
  }

  async getUserActivity(userId: string, targetUserId: string) {
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

  async getAdminStats(userId: string) {
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

  async setAdminStatus(
    userId: string,
    targetUserId: string,
    isAdmin: boolean,
    adminPassword: string
  ) {
    await this.assertAdmin(userId);

    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      throw new ForbiddenException("Senha de admin inválida");
    }

    if (userId === targetUserId && isAdmin === false) {
      throw new ForbiddenException("Você não pode remover seu próprio admin");
    }

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { isAdmin },
      select: { id: true, isAdmin: true },
    });
  }

}
