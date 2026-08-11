import { Controller, Get, Req, ServiceUnavailableException, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { JwtAuthGuard } from './modules/auth/jwt-auth.guard';
import { AdminGuard } from './modules/auth/admin.guard';
import { SystemLogService } from './system-log/system-log.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
    private readonly systemLog: SystemLogService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async healthCheck() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'OK', database: 'up' };
    } catch {
      throw new ServiceUnavailableException({
        status: 'ERROR',
        database: 'down',
      });
    }
  }

  @Get('__test-crash')
  testCrash() {
    throw new Error('Erro simulado pra testar a aba Sistema');
  }

  @Get('admin/system')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getSystemStatus(@Req() req: any) {
    if (!req?.user?.userId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    let database: 'up' | 'down' = 'up';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'down';
    }

    const mem = process.memoryUsage();

    return {
      database,
      uptimeSeconds: Math.floor(process.uptime()),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'production',
      memory: {
        rssMB: Math.round((mem.rss / 1024 / 1024) * 10) / 10,
        heapUsedMB: Math.round((mem.heapUsed / 1024 / 1024) * 10) / 10,
        heapTotalMB: Math.round((mem.heapTotal / 1024 / 1024) * 10) / 10,
      },
      recentErrors: this.systemLog.getRecent(50),
    };
  }
}
