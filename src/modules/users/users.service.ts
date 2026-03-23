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

  async getAllUsers(userId: string) {
    await this.assertAdmin(userId);

    return this.prisma.user.findMany({
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