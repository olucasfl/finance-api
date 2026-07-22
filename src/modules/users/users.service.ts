import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
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

    if (app !== AppType.ORATIO && app !== AppType.CRAVOU) {
      throw new BadRequestException('Unknown or missing app');
    }

    if (data.password !== data.confirmPassword) {
      throw new ConflictException('Passwords do not match');
    }

    const email = data.email.trim().toLowerCase();

    const emailExists = await this.prisma.user.findUnique({
      where: { email },
    });

    if (emailExists) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24);

    const user = await this.prisma.user.create({
      data: {
        name: data.name,
        email,
        password: hashedPassword,
        emailVerified: false,
        emailVerificationToken: token,
        emailVerificationTokenExpires: expires,
      },
    });

    const emailSent = app === AppType.ORATIO
      ? await this.mailService.sendOratioVerificationEmail(user.email, token)
      : await this.mailService.sendCravouVerificationEmail(user.email, token);

    /*
    A conta já foi criada mesmo se o email falhar — não faz sentido
    reverter a criação por causa disso. Mas o frontend precisa saber
    que o email de verificação pode não ter chegado, pra não deixar a
    pessoa esperando um email que nunca vai vir sem nenhum aviso.

    Retorno é uma lista branca explícita (não um spread do user menos
    a senha) porque esse endpoint é público e sem autenticação: um
    spread deixava vazar emailVerificationToken (e os demais tokens)
    na própria resposta do cadastro, permitindo verificar a conta sem
    nunca ter acesso ao email informado.
    */
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      emailVerified: user.emailVerified,
      isAdmin: user.isAdmin,
      bolaoPoints: user.bolaoPoints,
      cravadas: user.cravadas,
      emailSent,
    };
  }

  /*
  =============================
  GET USER PROFILE
  =============================
  */

  async getProfile(userId: string) {

  const [user, pointsAgg, cravasCount] = await Promise.all([
    this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        pendingEmail: true,
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
      where: {
        userId,
        OR: [
          { points: 10,                   match: { phase: 'group_stage' } },
          { points: { in: [14, 15, 17] }, match: { phase: { not: 'group_stage' } } },
        ],
      },
    }),
  ]);

  if (!user) {
    throw new NotFoundException("User not found")
  }

  const bolaoPoints = pointsAgg._sum.points ?? 0;

  return {

    id: user.id,
    name: user.name,
    email: user.email,
    pendingEmail: user.pendingEmail,
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

    const { password, ...safeUser } = user;

    return safeUser;
  }

  /*
  =============================
  CHANGE PASSWORD (autenticado, com senha atual)
  =============================
  */

  async changePassword(userId: string, currentPassword: string, newPassword: string) {

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    const matches = await bcrypt.compare(currentPassword, user.password);

    if (!matches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    // Invalida todas as sessões (todos os dispositivos, incluindo o
    // atual) — força um novo login em qualquer lugar, caso a troca
    // seja por suspeita de acesso indevido.
    await this.prisma.refreshSession.deleteMany({
      where: { userId },
    });

    return { message: 'Password changed successfully' };

  }

  /*
  =============================
  TROCA DE EMAIL (2 passos: solicitar -> confirmar no novo endereço)
  =============================
  */

  async requestEmailChange(userId: string, newEmail: string, app?: string) {

    // Hoje só o Oratio tem essa funcionalidade no frontend.
    if (app !== AppType.ORATIO) {
      throw new BadRequestException('Unknown or unsupported app');
    }

    const email = newEmail.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    if (email === user.email) {
      throw new ConflictException('This is already your current email');
    }

    const taken = await this.prisma.user.findUnique({
      where: { email },
    });

    if (taken) {
      throw new ConflictException('Email already in use');
    }

    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 1000 * 60 * 60);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        pendingEmail: email,
        pendingEmailToken: token,
        pendingEmailExpires: expires,
      },
    });

    const emailSent = await this.mailService.sendOratioEmailChangeConfirmation(email, token);

    if (!emailSent) {

      // Desfaz a troca pendente — sem isso, o perfil ficaria mostrando
      // "confirmação pendente" pra um email que nunca recebeu o link.
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          pendingEmail: null,
          pendingEmailToken: null,
          pendingEmailExpires: null,
        },
      });

      throw new ServiceUnavailableException(
        'Failed to send confirmation email. Please try again in a moment.',
      );

    }

    return {
      emailChangePending: true,
      pendingEmail: email,
    };

  }

  async cancelEmailChange(userId: string) {

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        pendingEmail: null,
        pendingEmailToken: null,
        pendingEmailExpires: null,
      },
    });

    return { message: 'Email change cancelled' };

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

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      totalUsers,
      totalVerified,
      consecrationStarted,
      totalPrayers,
      newUsers7d,
      prayers7d,
      rosaries7d,
      consecrations7d,
      logins7d,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { emailVerified: true } }),
      this.prisma.consecrationProgress.count(),
      this.prisma.spiritualStats.aggregate({
        _sum: { prayersPrayed: true, rosariesPrayed: true },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      this.prisma.userActivity.count({
        where: { type: 'PRAYER', createdAt: { gte: sevenDaysAgo } },
      }),
      // Só "Terço concluído" — "Iniciou o terço" também usa type ROSARY
      // e infla a contagem se não filtrar pela ação.
      this.prisma.userActivity.count({
        where: {
          type: 'ROSARY',
          action: 'Terço concluído',
          createdAt: { gte: sevenDaysAgo },
        },
      }),
      this.prisma.consecrationProgress.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      this.prisma.userActivity.count({
        where: { type: 'LOGIN', createdAt: { gte: sevenDaysAgo } },
      }),
    ]);

    return {
      totalUsers,
      totalVerified,
      consecrationStarted,
      prayersPrayed: totalPrayers._sum.prayersPrayed || 0,
      rosariesPrayed: totalPrayers._sum.rosariesPrayed || 0,
      last7Days: {
        newUsers: newUsers7d,
        prayers: prayers7d,
        rosaries: rosaries7d,
        consecrations: consecrations7d,
        logins: logins7d,
      },
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

  /*
  =============================
  ADMIN — GRÁFICOS (série temporal + heatmap)
  =============================
  */

  private readonly ACTIVITY_TYPE_BY_METRIC: Record<
    string,
    { type: string; action?: string }
  > = {
    prayers: { type: 'PRAYER' },
    // "Iniciou o terço" também usa type ROSARY — sem o filtro de action
    // isso contaria início E conclusão como se fossem a mesma coisa.
    rosaries: { type: 'ROSARY', action: 'Terço concluído' },
    logins: { type: 'LOGIN' },
  };

  private validateMetric(metric: string) {
    if (
      metric !== 'users' &&
      metric !== 'consecrations' &&
      !this.ACTIVITY_TYPE_BY_METRIC[metric]
    ) {
      throw new BadRequestException('Métrica inválida');
    }
  }

  private async fetchMetricDates(
    metric: string,
    since: Date,
  ): Promise<Date[]> {
    if (metric === 'users') {
      const rows = await this.prisma.user.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      });
      return rows.map((r) => r.createdAt);
    }

    if (metric === 'consecrations') {
      const rows = await this.prisma.consecrationProgress.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      });
      return rows.map((r) => r.createdAt);
    }

    const config = this.ACTIVITY_TYPE_BY_METRIC[metric];
    const rows = await this.prisma.userActivity.findMany({
      where: {
        type: config.type,
        ...(config.action ? { action: config.action } : {}),
        createdAt: { gte: since },
      },
      select: { createdAt: true },
    });
    return rows.map((r) => r.createdAt);
  }

  // "YYYY-MM-DD" no fuso do Brasil — mesma técnica já usada em
  // ActivityService pra fronteira de dia do streak. O servidor pode
  // rodar em UTC; sem isso, um acesso às 21h no Brasil vazaria pro
  // dia seguinte no agrupamento.
  private getBrazilDateKey(date: Date): string {
    return date.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  }

  private brazilMidnightInstant(dateKey: string): Date {
    return new Date(`${dateKey}T00:00:00-03:00`);
  }

  // Dia da semana (0=domingo) e hora (0-23) no fuso do Brasil.
  private getBrazilDayHour(date: Date): { day: number; hour: number } {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      weekday: 'short',
      hour: '2-digit',
      hour12: false,
    }).formatToParts(date);

    const weekdayMap: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    };

    const weekdayPart = parts.find((p) => p.type === 'weekday')?.value ?? 'Sun';
    let hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
    if (hour === 24) hour = 0; // alguns ambientes ICU retornam "24" pra meia-noite com hour12:false

    return { day: weekdayMap[weekdayPart] ?? 0, hour };
  }

  async getAdminTimeseries(userId: string, metric: string, range: string) {
    await this.assertAdmin(userId);
    this.validateMetric(metric);

    const RANGE_CONFIG: Record<
      string,
      { granularity: 'day' | 'month'; amount: number }
    > = {
      '7d': { granularity: 'day', amount: 7 },
      '30d': { granularity: 'day', amount: 30 },
      '6m': { granularity: 'month', amount: 6 },
      '12m': { granularity: 'month', amount: 12 },
    };
    const resolvedRange = RANGE_CONFIG[range] ? range : '6m';
    const config = RANGE_CONFIG[resolvedRange];

    const data: { period: string; label: string; count: number }[] = [];

    if (config.granularity === 'day') {
      // Datas no calendário do Brasil, não no fuso do servidor.
      const dayKeys: string[] = [];
      for (let i = config.amount - 1; i >= 0; i--) {
        dayKeys.push(this.getBrazilDateKey(new Date(Date.now() - i * 86_400_000)));
      }

      const start = this.brazilMidnightInstant(dayKeys[0]);
      const dates = await this.fetchMetricDates(metric, start);

      const buckets = new Map<string, number>();
      for (const d of dates) {
        const key = this.getBrazilDateKey(d);
        buckets.set(key, (buckets.get(key) || 0) + 1);
      }

      for (const key of dayKeys) {
        data.push({
          period: key,
          label: `${key.slice(8, 10)}/${key.slice(5, 7)}`,
          count: buckets.get(key) || 0,
        });
      }
    } else {
      const now = new Date();
      const start = new Date(
        now.getFullYear(),
        now.getMonth() - (config.amount - 1),
        1,
      );

      const dates = await this.fetchMetricDates(metric, start);

      const buckets = new Map<string, number>();
      for (const d of dates) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        buckets.set(key, (buckets.get(key) || 0) + 1);
      }

      const MONTH_LABELS = [
        'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
        'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
      ];

      for (let i = 0; i < config.amount; i++) {
        const d = new Date(
          now.getFullYear(),
          now.getMonth() - (config.amount - 1) + i,
          1,
        );
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

        data.push({
          period: key,
          label: MONTH_LABELS[d.getMonth()],
          count: buckets.get(key) || 0,
        });
      }
    }

    return {
      metric,
      range: resolvedRange,
      granularity: config.granularity,
      data,
    };
  }

  async getActivityHeatmap(userId: string, metric: string, days: number) {
    await this.assertAdmin(userId);
    this.validateMetric(metric);

    const clampedDays = Math.min(Math.max(days || 90, 7), 180);
    const start = new Date(Date.now() - clampedDays * 86_400_000);

    const dates = await this.fetchMetricDates(metric, start);

    const matrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));

    for (const d of dates) {
      const { day, hour } = this.getBrazilDayHour(d);
      matrix[day][hour] += 1;
    }

    const maxCount = Math.max(1, ...matrix.flat());

    return { metric, days: clampedDays, matrix, maxCount };
  }

}
