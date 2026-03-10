import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards
} from '@nestjs/common';

import { ConsecrationService } from './consecration.service';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';

@Controller('oratio/consecration')
export class ConsecrationController {

  constructor(private readonly service: ConsecrationService) {}

  @Post('start')
  @UseGuards(JwtAuthGuard)
  start(@Req() req: any, @Body() body: { startDate: string }) {

    return this.service.start(
      req.user.userId,
      new Date(body.startDate)
    );

  }

  @Get('progress')
  @UseGuards(JwtAuthGuard)
  progress(@Req() req: any) {

    return this.service.progress(req.user.userId);

  }

  @Get('day/:day')
  getDay(@Param('day') day: string) {

    return this.service.findDay(Number(day));

  }

  @Post('stage')
  createStage(@Body() body: any) {

    return this.service.createStage(body);

  }

  @Post('day')
  createDay(@Body() body: any) {

    return this.service.createDay(body);

  }

  @Post('prayer')
  createPrayer(@Body() body: any) {

    return this.service.createPrayer(body);

  }

  @Post('day-prayer')
  addPrayerToDay(@Body() body: any) {

    return this.service.addPrayerToDay(body);

  }

  @Put('day-prayer/:id')
  updateDayPrayer(
    @Param('id') id: string,
    @Body() body: { order: number }
  ) {
    return this.service.updateDayPrayer(id, body.order);
  }

  @Put('prayer/:id')
  updatePrayer(
    @Param('id') id: string,
    @Body() body: { title?: string; content?: string }
  ) {
    return this.service.updatePrayer(id, body);
  }

  @Get()
  getAll() {
    return this.service.getFullConsecration();
  }

  @Get('today')
  @UseGuards(JwtAuthGuard)
  today(@Req() req: any) {
    return this.service.today(req.user.userId);
  }
  
  @Post('reset')
  @UseGuards(JwtAuthGuard)
  reset(@Req() req: any) {
    return this.service.reset(req.user.userId);
  }

  @Post("complete/:day")
  @UseGuards(JwtAuthGuard)
  complete(@Req() req:any, @Param("day") day:string){
    return this.service.completeDay(req.user.userId,Number(day))
  }

  @Put("start-date")
  @UseGuards(JwtAuthGuard)
  updateStartDate(@Req() req:any, @Body() body:{startDate:string}){

    return this.service.updateStartDate(req.user.userId, new Date(body.startDate));
  }

  @Get("stage/:stageId/days")
  getStageDays(@Param("stageId") stageId: string) {

    return this.service.getStageDays(stageId)

  }
}