import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';

@Controller('oratio/notifications')
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly push: PushService,
  ) {}

  // Chave pública VAPID — o front usa pra criar a inscrição (pushManager.subscribe)
  @Get('public-key')
  publicKey() {
    return { publicKey: this.push.publicKey };
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  status(@Req() req: any) {
    return this.notifications.status(req.user.userId);
  }

  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  subscribe(
    @Req() req: any,
    @Body() body: { endpoint: string; p256dh: string; auth: string; timezone?: string },
  ) {
    return this.notifications.subscribe(req.user.userId, body);
  }

  @Delete('subscribe')
  @UseGuards(JwtAuthGuard)
  unsubscribe(@Req() req: any, @Body() body: { endpoint: string }) {
    return this.notifications.unsubscribe(req.user.userId, body.endpoint);
  }

  // Mantém o fuso da inscrição em sincronia com o do aparelho (chamado no boot)
  @Patch('timezone')
  @UseGuards(JwtAuthGuard)
  timezone(@Req() req: any, @Body() body: { timezone: string }) {
    return this.notifications.updateTimezone(req.user.userId, body.timezone);
  }

  // Fase A — teste de encanamento: dispara um push pra você mesmo
  @Post('test')
  @UseGuards(JwtAuthGuard)
  test(@Req() req: any) {
    return this.push.sendToUser(req.user.userId, {
      title: 'Oratio ✝️',
      body: 'Notificações ativadas! Que a paz esteja com você.',
      url: '/oratio/home',
    });
  }

  /* ===== Sino / caixa de entrada ===== */

  @Get('inbox')
  @UseGuards(JwtAuthGuard)
  inbox(@Req() req: any, @Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    return this.notifications.getInbox(req.user.userId, cursor, limit ? Number(limit) : 10);
  }

  @Get('unseen-count')
  @UseGuards(JwtAuthGuard)
  unseenCount(@Req() req: any) {
    return this.notifications.unseenCount(req.user.userId);
  }

  @Post('seen-all')
  @UseGuards(JwtAuthGuard)
  seenAll(@Req() req: any) {
    return this.notifications.markAllSeen(req.user.userId);
  }

  @Post(':id/seen')
  @UseGuards(JwtAuthGuard)
  seen(@Req() req: any, @Param('id') id: string) {
    return this.notifications.markSeen(req.user.userId, id);
  }
}
