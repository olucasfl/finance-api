import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';
import { SubscribePushDto } from './dto/subscribe-push.dto';
import { TimezoneDto, UnsubscribeDto } from './dto/push-misc.dto';

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
  subscribe(@Req() req: any, @Body() body: SubscribePushDto) {
    return this.notifications.subscribe(req.user.userId, body);
  }

  @Delete('subscribe')
  @UseGuards(JwtAuthGuard)
  unsubscribe(@Req() req: any, @Body() body: UnsubscribeDto) {
    return this.notifications.unsubscribe(req.user.userId, body.endpoint);
  }

  // Mantém o fuso da inscrição em sincronia com o do aparelho (chamado no boot)
  @Patch('timezone')
  @UseGuards(JwtAuthGuard)
  timezone(@Req() req: any, @Body() body: TimezoneDto) {
    return this.notifications.updateTimezone(req.user.userId, body.timezone);
  }

  // cooldown em memória: no máximo 1 push de teste por usuário a cada 60s
  private readonly testCooldown = new Map<string, number>();

  // Fase A — teste de encanamento: dispara um push pra você mesmo
  @Post('test')
  @UseGuards(JwtAuthGuard)
  test(@Req() req: any) {
    const userId = req.user.userId;
    const now = Date.now();
    const last = this.testCooldown.get(userId) ?? 0;
    if (now - last < 60_000) {
      throw new HttpException(
        'Aguarde um pouco antes de enviar outro teste.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    this.testCooldown.set(userId, now);

    return this.push.sendToUser(userId, {
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
