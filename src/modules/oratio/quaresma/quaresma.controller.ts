import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';
import { QuaresmaService } from './quaresma.service';
import { SavePenanceDto } from './dto/save-penance.dto';

@Controller('oratio/quaresma')
@UseGuards(JwtAuthGuard)
export class QuaresmaController {

  constructor(private readonly service: QuaresmaService) {}

  @Get('progress')
  getProgress(@Req() req: any) {
    return this.service.getProgress(req.user.userId);
  }

  @Post('complete/:day')
  completeDay(@Req() req: any, @Param('day', ParseIntPipe) day: number) {
    return this.service.completeDay(req.user.userId, day);
  }

  @Delete('complete/:day')
  uncompleteDay(@Req() req: any, @Param('day', ParseIntPipe) day: number) {
    return this.service.uncompleteDay(req.user.userId, day);
  }

  @Put('penance')
  savePenance(@Req() req: any, @Body() body: SavePenanceDto) {
    return this.service.savePenance(req.user.userId, body.content);
  }

}
