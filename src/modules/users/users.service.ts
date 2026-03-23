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

    lastPrayerDate: user.spiritualStats?.lastPrayerDate || null

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
      where.updatedAt = { gte: daysAgo };
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

    const activities: any[] = [];

    // Rosário sessions
    const rosarySessions = await this.prisma.rosarySession.findMany({
      where: {
        userId: targetUserId,
        startedAt: { gte: sevenDaysAgo },
      },
      select: {
        startedAt: true,
        completed: true,
      },
    });

    rosarySessions.forEach((session) => {
      activities.push({
        type: 'rosary',
        action: session.completed ? 'Terço concluído' : 'Terço iniciado',
        timestamp: session.startedAt,
      });
    });

    // Orações rezadas (via spiritualStats)
    const spiritualStats = await this.prisma.spiritualStats.findUnique({
      where: { userId: targetUserId },
      select: {
        lastPrayerDate: true,
        prayersPrayed: true,
      },
    });

    if (spiritualStats?.lastPrayerDate) {
      const lastPrayerTime = new Date(spiritualStats.lastPrayerDate);
      if (lastPrayerTime >= sevenDaysAgo) {
        activities.push({
          type: 'prayer',
          action: 'Oração rezada',
          timestamp: lastPrayerTime,
        });
      }
    }

    // Consagração iniciada
    const consecration = await this.prisma.consecrationProgress.findFirst({
      where: {
        userId: targetUserId,
        startDate: { gte: sevenDaysAgo },
      },
      select: {
        startDate: true,
      },
      orderBy: {
        startDate: 'desc',
      },
    });

    if (consecration) {
      activities.push({
        type: 'consecration',
        action: 'Consagração iniciada',
        timestamp: consecration.startDate,
      });
    }

    // Dias de consagração completados
    const completedDays = await this.prisma.consecrationCompletedDay.findMany({
      where: {
        userId: targetUserId,
        createdAt: { gte: sevenDaysAgo },
      },
      select: {
        dayNumber: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    completedDays.forEach((day) => {
      activities.push({
        type: 'consecration_day',
        action: `Dia ${day.dayNumber}/33 concluído`,
        timestamp: day.createdAt,
      });
    });

    // Intenção de logins (pela atualização do updatedAt)
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { updatedAt: true },
    });

    if (user && user.updatedAt >= sevenDaysAgo) {
      activities.push({
        type: 'login',
        action: 'Atividade no app',
        timestamp: user.updatedAt,
      });
    }

    // Ordenar por timestamp decrescente (mais recentes primeiro)
    activities.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return {
      targetUserId,
      activities,
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

  async setAdminStatus(userId: string, targetUserId: string, isAdmin: boolean) {
    await this.assertAdmin(userId);

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { isAdmin },
      select: { id: true, isAdmin: true },
    });
  }

}