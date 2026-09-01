import { Body, Controller, Get, Put, Query, Req, UseGuards } from '@nestjs/common';

import { BibleMarksService } from './bible-marks.service';
import { UpsertBibleMarkDto } from './dto/upsert-bible-mark.dto';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';

@Controller('oratio/bible/marks')
@UseGuards(JwtAuthGuard)
export class BibleMarksController {
  constructor(private readonly service: BibleMarksService) {}

  @Get()
  list(@Req() req: any, @Query('book') book?: string, @Query('chapter') chapter?: string) {
    const parsed = chapter ? Number(chapter) : undefined;
    const chapterNum = parsed !== undefined && Number.isFinite(parsed) ? parsed : undefined;

    return this.service.list(req.user.userId, book || undefined, chapterNum);
  }

  @Put()
  upsert(@Req() req: any, @Body() body: UpsertBibleMarkDto) {
    return this.service.upsert(req.user.userId, body);
  }
}
