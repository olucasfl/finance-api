import { Module } from '@nestjs/common';
import { PredictionsController } from './predictions.controller';
import { PredictionsService } from './predictions.service';

@Module({
  providers: [PredictionsService],
  controllers: [PredictionsController],
})
export class PredictionsModule {}
