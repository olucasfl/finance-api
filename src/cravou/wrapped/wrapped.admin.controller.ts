import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';
import { AdminGuard } from '../admin/admin.guard';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { WrappedService } from './wrapped.service';

@Controller('cravou/admin/wrapped')
@UseGuards(JwtAuthGuard, AdminGuard)
export class WrappedAdminController {
  constructor(
    private readonly wrappedService: WrappedService,
    private readonly gateway: RealtimeGateway,
  ) {}

  // Estado bruto (off/preview/released) — só para o painel de admin decidir o próximo passo.
  @Get('status')
  status() {
    return this.wrappedService.getRawStatus();
  }

  // Ativa a prévia: só quem chamou este endpoint passa a ver a retrospectiva.
  @Post('preview')
  async preview(@Req() req: any) {
    const status = await this.wrappedService.activatePreview(req.user.userId);
    this.gateway.emitWrappedActivatedTo(req.user.userId, status.activatedAt!);
    return status;
  }

  // Libera pra todo mundo: reseta o "já vi" de todo mundo, inclusive de quem viu a prévia.
  @Post('release')
  async release() {
    const status = await this.wrappedService.release();
    this.gateway.emitWrappedActivatedAll(status.activatedAt!);
    return status;
  }

  // Rollback: desliga tudo (uso em teste/correção).
  @Post('deactivate')
  async deactivate() {
    const status = await this.wrappedService.deactivate();
    this.gateway.emitWrappedDeactivated();
    return status;
  }
}
