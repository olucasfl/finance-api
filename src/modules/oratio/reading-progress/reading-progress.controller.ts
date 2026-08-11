import {
  Body,
  Controller,
  Get,
  Put,
  Req,
  UseGuards
} from '@nestjs/common';

import { ReadingProgressService } from './reading-progress.service';
import { SaveReadingProgressDto } from './dto/save-reading-progress.dto';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';

@Controller('oratio/reading-progress')
export class ReadingProgressController {

  constructor(private readonly service: ReadingProgressService) {}

  @Put()
  @UseGuards(JwtAuthGuard)
  save(@Req() req: any, @Body() body: SaveReadingProgressDto) {

    return this.service.save(
      req.user.userId,
      body.kind,
      body.reference,
      body.label
    );

  }

  @Get()
  @UseGuards(JwtAuthGuard)
  list(@Req() req: any) {

    return this.service.list(req.user.userId);

  }

}
