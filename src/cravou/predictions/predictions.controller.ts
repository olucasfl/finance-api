import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';
import { CreatePredictionDto } from './dto/create-prediction.dto';
import { PredictionsService } from './predictions.service';

@Controller('cravou/predictions')
@UseGuards(JwtAuthGuard)
export class PredictionsController {
  constructor(private readonly predictionsService: PredictionsService) {}

  @Post()
  upsert(@Req() req: any, @Body() dto: CreatePredictionDto) {
    return this.predictionsService.upsert(req.user.userId, dto);
  }

  @Get('my')
  findMy(@Req() req: any) {
    return this.predictionsService.findMyPredictions(req.user.userId);
  }
}
