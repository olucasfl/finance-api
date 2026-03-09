import {
  Body,
  Controller,
  UseGuards,
  Post,
  Req,
  Get,
  Param
} from '@nestjs/common';

import { ConsecrationService } from './consecration.service';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';

@Controller('oratio/consecration')
export class ConsecrationController {

  constructor(private readonly consecrationService: ConsecrationService) {}

  @Post('start')
  @UseGuards(JwtAuthGuard)
  start(@Req() req: any, @Body() body: { startDate: string }) {

    return this.consecrationService.start(
      req.user.userId,
      new Date(body.startDate)
    );

  }

  @Get('progress')
  @UseGuards(JwtAuthGuard)
  progress(@Req() req: any) {

    return this.consecrationService.progress(req.user.userId);

  }

  @Get('day/:day')
  getDay(@Param('day') day: string) {

    return this.consecrationService.findDay(Number(day));

  }

  @Post('stage')
  createStage(@Body() body: any) {

    return this.consecrationService.createStage(body);

  }

  @Post('day')
  createDay(@Body() body: any) {

    return this.consecrationService.createDay(body);

  }

  @Post('prayer')
  createPrayer(@Body() body: any) {

    return this.consecrationService.createPrayer(body);

  }

}