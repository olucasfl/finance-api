import { Controller, Get, Req, UseGuards } from '@nestjs/common';

import { HomeService } from './home.service';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';

@Controller('oratio/home')
export class HomeController {

  constructor(private readonly service: HomeService) {}

  // Sugestões dinâmicas da seção "Para você hoje".
  @Get('feed')
  @UseGuards(JwtAuthGuard)
  feed(@Req() req: any) {

    return this.service.feed(req.user.userId);

  }

}
