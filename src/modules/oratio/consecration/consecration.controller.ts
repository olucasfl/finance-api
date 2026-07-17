import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards
} from '@nestjs/common';

import { ConsecrationService } from './consecration.service';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';
import { AdminGuard } from 'src/cravou/admin/admin.guard';
import { CreateConsecrationStageDto } from './dto/create-consecration-stage.dto';
import { CreateConsecrationDayDto } from './dto/create-consecration-day.dto';
import { CreateConsecrationPrayerDto } from './dto/create-consecration-prayer.dto';
import { AddDayPrayerDto } from './dto/add-day-prayer.dto';

@Controller('oratio/consecration')
export class ConsecrationController {

  constructor(private readonly service: ConsecrationService) {}

  /* ============================= */
  /* START CONSECRATION */
  /* ============================= */

  @Post('start')
  @UseGuards(JwtAuthGuard)
  start(
    @Req() req: any,
    @Body() body: { consecrationDate: string }
  ) {

    const [y,m,d] = body.consecrationDate.split("-").map(Number)

    const startDate = new Date(y, m - 1, d, 12, 0, 0)
    startDate.setDate(startDate.getDate() - 33)

    return this.service.start(
      req.user.userId,
      startDate
    )

  }

  /* ============================= */
  /* PROGRESS */
  /* ============================= */

  @Get('progress')
  @UseGuards(JwtAuthGuard)
  progress(@Req() req: any) {

    return this.service.progress(req.user.userId)

  }

  /* ============================= */
  /* GET DAY */
  /* ============================= */

  @Get('day/:day')
  getDay(@Param('day') day: string) {

    return this.service.findDay(Number(day))

  }

  /* ============================= */
  /* ADMIN - CREATE DATA */
  /* ============================= */

  @Post('stage')
  @UseGuards(JwtAuthGuard, AdminGuard)
  createStage(@Body() body: CreateConsecrationStageDto) {

    return this.service.createStage(body)

  }

  @Post('day')
  @UseGuards(JwtAuthGuard, AdminGuard)
  createDay(@Body() body: CreateConsecrationDayDto) {

    return this.service.createDay(body)

  }

  @Post('prayer')
  @UseGuards(JwtAuthGuard, AdminGuard)
  createPrayer(@Body() body: CreateConsecrationPrayerDto) {

    return this.service.createPrayer(body)

  }

  @Post('day-prayer')
  @UseGuards(JwtAuthGuard, AdminGuard)
  addPrayerToDay(@Body() body: AddDayPrayerDto) {

    return this.service.addPrayerToDay(body)

  }

  @Put('day-prayer/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  updateDayPrayer(
    @Param('id') id: string,
    @Body() body: { order: number }
  ) {

    return this.service.updateDayPrayer(id, body.order)

  }

  @Put('prayer/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  updatePrayer(
    @Param('id') id: string,
    @Body() body: { title?: string; content?: string }
  ) {

    return this.service.updatePrayer(id, body)

  }

  /* ============================= */
  /* GET FULL CONSECRATION */
  /* ============================= */

  @Get()
  getAll() {

    return this.service.getFullConsecration()

  }

  /* ============================= */
  /* TODAY */
  /* ============================= */

  @Get('today')
  @UseGuards(JwtAuthGuard)
  today(@Req() req: any) {

    return this.service.today(req.user.userId)

  }

  /* ============================= */
  /* RESET */
  /* ============================= */

  @Post('reset')
  @UseGuards(JwtAuthGuard)
  reset(@Req() req: any) {

    return this.service.reset(req.user.userId)

  }

  /* ============================= */
  /* COMPLETE DAY */
  /* ============================= */

  @Post("complete/:day")
  @UseGuards(JwtAuthGuard)
  complete(
    @Req() req:any,
    @Param("day") day:string
  ){

    return this.service.completeDay(
      req.user.userId,
      Number(day)
    )

  }

  /* ============================= */
  /* UPDATE CONSECRATION DATE */
  /* ============================= */

  @Put("consecration-date")
  @UseGuards(JwtAuthGuard)
  updateStartDate(
    @Req() req:any,
    @Body() body:{consecrationDate:string}
  ){

    const [y,m,d] = body.consecrationDate.split("-").map(Number)

    const startDate = new Date(y, m - 1, d, 12, 0, 0)
    startDate.setDate(startDate.getDate() - 33)

    return this.service.updateStartDate(
      req.user.userId,
      startDate
    )

  }

  /* ============================= */
  /* STAGE DAYS */
  /* ============================= */

  @Get("stage/:stageId/days")
  getStageDays(@Param("stageId") stageId: string) {

    return this.service.getStageDays(stageId)

  }

  /* ============================= */
  /* UNCOMPLETE DAY */
  /* ============================= */

  @Delete("complete/:day")
  @UseGuards(JwtAuthGuard)
  uncompleteDay(
    @Req() req:any,
    @Param("day") day:string
  ){

    return this.service.uncompleteDay(
      req.user.userId,
      Number(day)
    )

  }

  /* ============================= */
  /* PRELOAD ALL DAYS */
  /* ============================= */

  @Get("/all-days")
  getAllDays(){

    return this.service.getAllDays()

  }

}