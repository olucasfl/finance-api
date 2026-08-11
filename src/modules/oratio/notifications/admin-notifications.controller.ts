import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AdminGuard } from '../../auth/admin.guard';
import { NotificationsSendService } from './notifications-send.service';

@Controller('oratio/admin/notifications')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminNotificationsController {
  constructor(private readonly send: NotificationsSendService) {}

  // Compor e enviar: Todos ou pessoas específicas
  @Post()
  create(
    @Req() req: any,
    @Body()
    body: {
      title: string;
      body?: string;
      url?: string;
      audience: 'ALL' | 'SPECIFIC';
      userIds?: string[];
    },
  ) {
    return this.send.createCampaign({
      title: body.title,
      body: body.body,
      url: body.url,
      audience: body.audience === 'SPECIFIC' ? 'SPECIFIC' : 'ALL',
      userIds: body.userIds,
      createdBy: req.user.userId,
    });
  }

  // Envios ativos (últimos 15 dias) + contadores
  @Get()
  list() {
    return this.send.listCampaigns();
  }

  // Quantos usuários existem e quantos ativaram push
  @Get('subscribers')
  subscribers() {
    return this.send.subscribersCount();
  }
}
