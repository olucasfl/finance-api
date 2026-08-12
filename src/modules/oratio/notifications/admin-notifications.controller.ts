import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AdminGuard } from '../../auth/admin.guard';
import { NotificationsSendService } from './notifications-send.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { CreateRuleDto, UpdateRuleDto } from './dto/rule.dto';

@Controller('oratio/admin/notifications')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminNotificationsController {
  constructor(private readonly send: NotificationsSendService) {}

  // Compor e enviar: Todos ou pessoas específicas
  @Post()
  create(@Req() req: any, @Body() body: CreateCampaignDto) {
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

  // Regras automáticas: listar e editar (liga/desliga, texto, link)
  @Get('rules')
  rules() {
    return this.send.listRules();
  }

  @Patch('rules/:key')
  updateRule(@Param('key') key: string, @Body() body: UpdateRuleDto) {
    return this.send.updateRule(key, body);
  }

  @Post('rules')
  createRule(@Body() body: CreateRuleDto) {
    return this.send.createRule(body);
  }

  @Delete('rules/:key')
  deleteRule(@Param('key') key: string) {
    return this.send.deleteRule(key);
  }

  // Apagar TODOS os envios de uma vez (declarado antes de :id de propósito)
  @Delete('all')
  deleteAll() {
    return this.send.deleteAllCampaigns();
  }

  // Apagar um envio (some do sino de quem recebeu)
  @Delete(':id')
  deleteCampaign(@Param('id') id: string) {
    return this.send.deleteCampaign(id);
  }
}
